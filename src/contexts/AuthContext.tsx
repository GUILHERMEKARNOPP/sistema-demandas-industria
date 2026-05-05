import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, deleteDoc, getDocs, query, limit } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, role: UserRole, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  users: User[];
  loading: boolean;
  deleteUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Fallback para quando as chaves não estiverem configuradas
  const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if ((window as any)._unsubscribeUsers) {
        (window as any)._unsubscribeUsers();
        (window as any)._unsubscribeUsers = null;
      }

      try {
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            let userData = userDoc.data() as User;
            
            // Bootstrap logic: if this is the only user, make them ADMIN/APROVADO
            const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(2)));
            if (usersSnapshot.size === 1) {
              const updatedUser = { ...userData, role: 'ADMIN' as UserRole, status: 'APROVADO' as const };
              await setDoc(userDocRef, updatedUser);
              userData = updatedUser;
            }

            const userStatus = userData.status || (userData.role === 'ADMIN' ? 'APROVADO' : 'PENDENTE');

            if (userStatus !== 'APROVADO') {
              await signOut(auth);
              setUser(null);
              // Dispara um evento para o componente Login saber que não está aprovado
              window.dispatchEvent(new CustomEvent('auth-not-approved'));
              return;
            }
            
            setUser({ id: firebaseUser.uid, ...userData, status: userStatus });

            if (userData.role === 'ADMIN') {
              const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
                const usersData: User[] = [];
                snapshot.forEach(doc => {
                  usersData.push({ id: doc.id, ...doc.data() } as User);
                });
                setUsers(usersData);
              });
              (window as any)._unsubscribeUsers = unsub;
            }
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
          setUsers([]);
        }
      } catch (error) {
        console.error("Auth error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if ((window as any)._unsubscribeUsers) {
        (window as any)._unsubscribeUsers();
      }
    };
  }, [isFirebaseConfigured]);

  const login = async (email: string, password?: string) => {
    if (!isFirebaseConfigured) {
      alert("Firebase não configurado. Por favor adicione as variáveis no .env");
      return;
    }
    if (!password) throw new Error("Senha obrigatória para Firebase");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (name: string, email: string, role: UserRole, password?: string) => {
    if (!isFirebaseConfigured) {
      alert("Firebase não configurado. Por favor adicione as variáveis no .env");
      return;
    }
    if (!password) throw new Error("Senha obrigatória para Firebase");
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    const newUser: User = { 
      id: userCredential.user.uid,
      name, 
      email, 
      role: role, // Será promovido no onAuthStateChanged se for o primeiro
      status: 'PENDENTE', // Será promovido no onAuthStateChanged se for o primeiro
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
  };

  const logout = async () => {
    if (isFirebaseConfigured) {
      await signOut(auth);
    }
    setUser(null);
  };

  const deleteUser = async (userId: string) => {
    if (!isFirebaseConfigured) return;
    if (userId === user?.id) {
      alert("Você não pode deletar sua própria conta.");
      return;
    }
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, users, loading, deleteUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
