import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  onSnapshot,
  getDocs,
  where
} from 'firebase/firestore';
import type { PreventiveMaintenance } from '../types';

const COLLECTION_NAME = 'preventive_schedules';

export const subscribeToPreventive = (callback: (data: PreventiveMaintenance[]) => void) => {
  const q = query(collection(db, COLLECTION_NAME));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PreventiveMaintenance[];
    callback(data);
  });
};

export const createPreventive = async (data: Omit<PreventiveMaintenance, 'id'>) => {
  return await addDoc(collection(db, COLLECTION_NAME), data);
};

export const updatePreventive = async (id: string, data: Partial<PreventiveMaintenance>) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return await updateDoc(docRef, data);
};

export const deletePreventive = async (id: string) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  return await deleteDoc(docRef);
};

export const checkPreventiveSchedules = async () => {
  const q = query(collection(db, COLLECTION_NAME), where('isActive', '==', true));
  const snapshot = await getDocs(q);
  const now = new Date();
  
  const schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PreventiveMaintenance[];
  
  return schedules.filter(s => new Date(s.nextDueDate) <= now);
};
