export type Priority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type Status = 'Pendente' | 'Em andamento' | 'Concluído';
export type Category = 'Estruturas' | 'Mobiliário' | 'Equipamentos' | 'Infraestrutura Administrativa';

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
}
