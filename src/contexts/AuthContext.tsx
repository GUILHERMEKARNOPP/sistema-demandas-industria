import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AuthContextType {
  user: User | null;
  login: (email: string) => void;
  register: (name: string, email: string, role: UserRole) => void;
  logout: () => void;
  users: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin mock inicial
const initialUsers: User[] = [
  { id: 'admin-1', name: 'Administrador do Sistema', email: 'admin@empresa.com', role: 'ADMIN' },
  { id: 'tech-1', name: 'Técnico João', email: 'joao.tecnico@empresa.com', role: 'TECNICO', phone: '5511999999999' }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('@grc:users');
    return saved ? JSON.parse(saved) : initialUsers;
  });
  
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('@grc:auth');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('@grc:users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('@grc:auth', JSON.stringify(user));
    } else {
      localStorage.removeItem('@grc:auth');
    }
  }, [user]);

  const login = (email: string, password?: string) => {
    const foundUser = users.find(u => u.email === email);
    // Em um sistema real a senha seria criptografada e checada aqui.
    // Como é mockup no localStorage, verificamos se tem a propriedade password.
    if (foundUser) {
      if (foundUser.password && foundUser.password !== password) {
        throw new Error('Senha incorreta.');
      }
      setUser(foundUser);
    } else {
      throw new Error('Usuário não encontrado.');
    }
  };

  const register = (name: string, email: string, role: UserRole, password?: string) => {
    if (users.find(u => u.email === email)) {
      throw new Error('E-mail já cadastrado.');
    }
    const newUser: User = { id: uuidv4(), name, email, role, password };
    setUsers([...users, newUser]);
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, users }}>
      {children}
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
