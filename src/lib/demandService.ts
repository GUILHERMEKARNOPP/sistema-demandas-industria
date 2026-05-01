import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import type { Demand, Comment } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
  
  if (isFirebaseConfigured && imageFile) {
    const storageRef = ref(storage, `demands/${Date.now()}_${imageFile.name}`);
    await uploadBytes(storageRef, imageFile);
    imageUrl = await getDownloadURL(storageRef);
  } else if (imageFile) {
    // Para localStorage, podemos simular salvando localmente ou ignorando.
    alert("O upload de imagem só funciona com o Firebase conectado.");
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
    slaDeadline,
    createdAt: now,
    updatedAt: now
  };

  if (!isFirebaseConfigured) {
    const newDemand = { id: uuidv4(), ...finalDemand } as Demand;
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
