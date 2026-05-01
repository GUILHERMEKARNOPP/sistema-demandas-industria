export type Priority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type Status = 'Pendente' | 'Em andamento' | 'Aguardando Aprovação' | 'Concluído';
export type Category = 'Estruturas' | 'Mobiliário' | 'Equipamentos' | 'Infraestrutura Administrativa';
export type UserRole = 'SOLICITANTE' | 'TECNICO' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string; 
  password?: string;
}

export interface Part {
  id: string;
  name: string;
  quantity: number;
  cost: number; // Cost per unit
}

export interface DemandPart {
  partId: string;
  name: string;
  quantityUsed: number;
  totalCost: number;
}

export interface Demand {
  id: string;
  title: string;
  description: string;
  requesterName: string;
  department: string;
  machineId?: string; // For QR Code
  category: Category;
  priority: Priority;
  status: Status;
  createdAt: string;
  updatedAt: string;
  userId: string;
  lgpdConsent: boolean;
  imageUrl?: string;
  comments?: Comment[];
  slaDeadline?: string;
  
  // New Fields
  partsUsed?: DemandPart[];
  totalCost?: number;
  rating?: number; // 1 to 5
  ratingComment?: string;
  signatureUrl?: string; // Base64 or URL of the digital signature
  approvedByAdmin?: boolean; // For expensive parts
  preventive?: boolean; // Is it a preventive maintenance?
}

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface PreventiveMaintenance {
  id: string;
  title: string;
  description: string;
  category: Category;
  department: string;
  machineId?: string;
  intervalDays: number;
  lastPerformed: string;
  nextDueDate: string;
}
