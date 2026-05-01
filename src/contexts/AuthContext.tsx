import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, role: UserRole, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  users: User[];
  loading: boolean;
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
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData: User[] = [];
      snapshot.forEach(doc => {
        usersData.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(usersData);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUsers();
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
    const newUser = { name, email, role };
    await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
  };

  const logout = async () => {
    if (isFirebaseConfigured) {
      await signOut(auth);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, users, loading }}>
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
