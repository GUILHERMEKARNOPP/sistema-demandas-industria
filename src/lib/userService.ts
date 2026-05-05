import { db } from './firebase';
import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import type { UserRole } from '../types';
import { initializeApp, deleteApp } from 'firebase/app';

// Configuração para o app secundário (usado para criar usuários sem deslogar o admin)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const updateUserRole = async (userId: string, role: UserRole) => {
  const userDoc = doc(db, 'users', userId);
  return await updateDoc(userDoc, { role });
};

export const approveUser = async (userId: string, status: 'APROVADO' | 'REPROVADO') => {
  const userDoc = doc(db, 'users', userId);
  return await updateDoc(userDoc, { status });
};

export const deleteUser = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
  // Nota: Isso remove apenas do Firestore. O usuário ainda existirá no Firebase Auth.
  // Em uma solução ideal (Blaze plan), usaríamos Admin SDK ou Cloud Functions.
};

export const adminCreateUser = async (name: string, email: string, role: UserRole, password: string) => {
  // Inicializa um app secundário temporário para criar o usuário no Auth
  const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
  const secondaryAuth = getAuth(secondaryApp);

  try {
    // Cria o usuário no Firebase Auth usando o app secundário
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const user = userCredential.user;

    // Salva os dados no Firestore principal
    await setDoc(doc(db, 'users', user.uid), {
      id: user.uid,
      name,
      email,
      role,
      status: 'APROVADO',
      createdAt: new Date().toISOString()
    });

    // Desloga o usuário do app secundário imediatamente
    await signOut(secondaryAuth);
    
    return user.uid;
  } finally {
    // Limpa o app secundário
    await deleteApp(secondaryApp);
  }
};
