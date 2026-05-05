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
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            
            // Tratamento para usuários antigos ou sem status definido
            // Se for ADMIN, assume APROVADO para evitar lockout
            const userStatus = userData.status || (userData.role === 'ADMIN' ? 'APROVADO' : 'PENDENTE');

            // Se o usuário não estiver aprovado, desloga e avisa
            if (userStatus !== 'APROVADO') {
              await signOut(auth);
              setUser(null);
              return;
            }
            
            setUser({ id: firebaseUser.uid, ...userData, status: userStatus });
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
          setUsers([]);
        }
      } catch (error) {
        console.error("Auth status check error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    // Subscrição de usuários - Movida para fora do listener de auth mas com tratamento de erro
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData: User[] = [];
      snapshot.forEach(doc => {
        usersData.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(usersData);
    }, (error) => {
      // Se falhar (ex: sem permissão), apenas loga e mantém a lista vazia
      console.warn("Users subscription restricted:", error.message);
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
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      let userData = userDoc.data() as User;
      
      // Se não tiver status ou não estiver aprovado, verifica se é o único usuário (Bootstrap)
      if (!userData.status || userData.status !== 'APROVADO') {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        if (usersSnapshot.size === 1) {
          // É o único usuário, promove a admin automaticamente
          const updatedUser = { ...userData, role: 'ADMIN' as UserRole, status: 'APROVADO' as const };
          await setDoc(userDocRef, updatedUser);
          userData = updatedUser;
        } else if (userData.status !== 'APROVADO') {
          await signOut(auth);
          throw new Error('Sua conta ainda não foi aprovada pelo administrador.');
        }
      }
    }
  };

  const register = async (name: string, email: string, role: UserRole, password?: string) => {
    if (!isFirebaseConfigured) {
      alert("Firebase não configurado. Por favor adicione as variáveis no .env");
      return;
    }
    if (!password) throw new Error("Senha obrigatória para Firebase");
    
    // Verifica se este é o primeiro usuário do sistema
    const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(1)));
    const isFirstUser = usersSnapshot.empty;

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    const newUser: User = { 
      id: userCredential.user.uid,
      name, 
      email, 
      role: isFirstUser ? 'ADMIN' : role, 
      status: isFirstUser ? 'APROVADO' : 'PENDENTE',
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
    
    // Se não for o primeiro usuário, desloga para aguardar aprovação
    if (!isFirstUser) {
      await signOut(auth);
    }
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
