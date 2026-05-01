export type Priority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type Status = 'Pendente' | 'Em andamento' | 'Concluído';
export type Category = 'Estruturas' | 'Mobiliário' | 'Equipamentos' | 'Infraestrutura Administrativa';
export type UserRole = 'SOLICITANTE' | 'TECNICO' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string; // Optional, useful for technicians
  password?: string;
}

export interface Demand {
  id: string;
  title: string;
  description: string;
  requesterName: string;
  department: string;
  category: Category;
  priority: Priority;
  status: Status;
  createdAt: string;
  updatedAt: string;
  userId: string; // The user who created the demand
  lgpdConsent: boolean; // LGPD required consent
  imageUrl?: string;
  comments?: Comment[];
  slaDeadline?: string;
}

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}
