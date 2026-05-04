import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Demand, Comment } from '../types';
import { compressAndConvertToBase64 } from '../utils/imageCompression';

export const DEMANDS_COLLECTION = 'demands';

const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

// Listen to demands
export const subscribeToDemands = (callback: (demands: Demand[]) => void) => {
  if (!isFirebaseConfigured) {
    const saved = localStorage.getItem('@grc:demands');
    if (saved) callback(JSON.parse(saved));
    return () => {}; // No-op unsubscribe
  }

  const q = query(collection(db, DEMANDS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const demandsData: Demand[] = [];
    snapshot.forEach(d => demandsData.push({ id: d.id, ...d.data() } as Demand));
    callback(demandsData);
  });
};

export const addDemand = async (demandData: Omit<Demand, 'id' | 'createdAt' | 'updatedAt' | 'slaDeadline'>, imageFile?: File): Promise<string> => {
  let imageUrl = '';
  
  if (imageFile) {
    try {
      // Compress and convert to Base64 (zero cost storage)
      imageUrl = await compressAndConvertToBase64(imageFile, 800, 0.6);
    } catch (error) {
      console.error("Error compressing image:", error);
    }
  }

  const now = new Date().toISOString();
  
  // Calcula SLA baseado na prioridade
  let slaDeadline = '';
  const date = new Date();
  if (demandData.priority === 'Crítica') date.setHours(date.getHours() + 4);
  else if (demandData.priority === 'Alta') date.setHours(date.getHours() + 24);
  else if (demandData.priority === 'Média') date.setDate(date.getDate() + 3);
  else date.setDate(date.getDate() + 7);
  slaDeadline = date.toISOString();

  const finalDemand = {
    ...demandData,
    imageUrl: imageUrl || null,
    comments: [],
    evidenceUrls: [],
    slaDeadline,
    createdAt: now,
    updatedAt: now
  };

  if (!isFirebaseConfigured) {
    const newDemand = { id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36), ...finalDemand } as Demand;
    const saved = localStorage.getItem('@grc:demands');
    const demands = saved ? JSON.parse(saved) : [];
    localStorage.setItem('@grc:demands', JSON.stringify([newDemand, ...demands]));
    return newDemand.id;
  }

  const docRef = await addDoc(collection(db, DEMANDS_COLLECTION), finalDemand);
  return docRef.id;
};

export const updateDemandStatus = async (demandId: string, status: string) => {
  const updatedAt = new Date().toISOString();
  
  if (!isFirebaseConfigured) {
    const saved = localStorage.getItem('@grc:demands');
    if (saved) {
      const demands: Demand[] = JSON.parse(saved);
      const updated = demands.map(d => d.id === demandId ? { ...d, status: status as any, updatedAt } : d);
      localStorage.setItem('@grc:demands', JSON.stringify(updated));
    }
    return;
  }

  const demandRef = doc(db, DEMANDS_COLLECTION, demandId);
  await updateDoc(demandRef, { status, updatedAt });
};

export const addComment = async (demandId: string, comments: Comment[], newComment: Comment) => {
  const updatedAt = new Date().toISOString();
  const updatedComments = [...comments, newComment];

  if (!isFirebaseConfigured) {
    const saved = localStorage.getItem('@grc:demands');
    if (saved) {
      const demands: Demand[] = JSON.parse(saved);
      const updated = demands.map(d => d.id === demandId ? { ...d, comments: updatedComments, updatedAt } : d);
      localStorage.setItem('@grc:demands', JSON.stringify(updated));
    }
    return;
  }

  const demandRef = doc(db, DEMANDS_COLLECTION, demandId);
  await updateDoc(demandRef, { comments: updatedComments, updatedAt });
};

export const updateDemand = async (demandId: string, updates: Partial<Demand>) => {
  const updatedAt = new Date().toISOString();
  
  if (!isFirebaseConfigured) {
    const saved = localStorage.getItem('@grc:demands');
    if (saved) {
      const demands: Demand[] = JSON.parse(saved);
      const updated = demands.map(d => d.id === demandId ? { ...d, ...updates, updatedAt } : d);
      localStorage.setItem('@grc:demands', JSON.stringify(updated));
    }
    return;
  }

  const demandRef = doc(db, DEMANDS_COLLECTION, demandId);
  await updateDoc(demandRef, { ...updates, updatedAt });
};

/**
 * Stores signature as compressed Base64 directly in the demand document.
 * Eliminates the need for Firebase Storage.
 */
export const uploadSignature = async (demandId: string, signatureBlob: Blob): Promise<string> => {
  try {
    const base64 = await compressAndConvertToBase64(signatureBlob, 400, 0.5);
    
    if (isFirebaseConfigured) {
      const demandRef = doc(db, DEMANDS_COLLECTION, demandId);
      await updateDoc(demandRef, { signatureUrl: base64, updatedAt: new Date().toISOString() });
    } else {
      const saved = localStorage.getItem('@grc:demands');
      if (saved) {
        const demands: Demand[] = JSON.parse(saved);
        const updated = demands.map(d => d.id === demandId ? { ...d, signatureUrl: base64 } : d);
        localStorage.setItem('@grc:demands', JSON.stringify(updated));
      }
    }
    
    return base64;
  } catch (error) {
    console.error("Error saving signature:", error);
    return '';
  }
};

/**
 * Adds evidence image as compressed Base64 to the demand's evidenceUrls array.
 */
export const addEvidence = async (_demandId: string, imageFile: File): Promise<string> => {
  try {
    const base64 = await compressAndConvertToBase64(imageFile, 800, 0.6);
    
    if (isFirebaseConfigured) {
      // We return the base64 and let component update to handle array logic easily
      return base64;
    } else {
      return base64;
    }
  } catch (error) {
    console.error("Error compressing evidence:", error);
    return '';
  }
};

export const deleteDemand = async (demandId: string) => {
  if (!isFirebaseConfigured) {
    const saved = localStorage.getItem('@grc:demands');
    if (saved) {
      const demands: Demand[] = JSON.parse(saved);
      const filtered = demands.filter(d => d.id !== demandId);
      localStorage.setItem('@grc:demands', JSON.stringify(filtered));
    }
    return;
  }

  const demandRef = doc(db, DEMANDS_COLLECTION, demandId);
  await deleteDoc(demandRef);
};

export const deleteUserFirestore = async (userId: string) => {
  if (!isFirebaseConfigured) return;
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
};
