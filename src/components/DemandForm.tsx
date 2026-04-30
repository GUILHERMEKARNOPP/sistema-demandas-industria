import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Demand, Category, Priority } from '../types';
import { X } from 'lucide-react';

interface DemandFormProps {
  onSubmit: (demand: Demand) => void;
  onCancel: () => void;
}

export const DemandForm: React.FC<DemandFormProps> = ({ onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState<Category>('Estruturas');
  const [priority, setPriority] = useState<Priority>('Baixa');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newDemand: Demand = {
      id: uuidv4(),
      title,
      description,
      requesterName,
      department,
      category,
      priority,
      status: 'Pendente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    onSubmit(newDemand);
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Nova Solicitação de Manutenção</h2>
          <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Título da Solicitação</label>
            <input required type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Ar condicionado vazando" />
          </div>
          
          <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Nome do Solicitante</label>
              <input required type="text" className="form-control" value={requesterName} onChange={e => setRequesterName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Departamento / Setor</label>
              <input required type="text" className="form-control" value={department} onChange={e => setDepartment(e.target.value)} />
            </div>
          </div>
          
          <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-control" value={category} onChange={e => setCategory(e.target.value as Category)}>
                <option value="Estruturas">Estruturas (Paredes, piso, teto)</option>
                <option value="Mobiliário">Mobiliário (Mesas, cadeiras)</option>
                <option value="Equipamentos">Equipamentos (Ar condicionado, etc)</option>
                <option value="Infraestrutura Administrativa">Infraestrutura Administrativa</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Prioridade</label>
              <select className="form-control" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                <option value="Baixa">Baixa (Pode esperar alguns dias)</option>
                <option value="Média">Média (Requer atenção em breve)</option>
                <option value="Alta">Alta (Afeta o trabalho de uma equipe)</option>
                <option value="Crítica">Crítica (Risco iminente ou parada total)</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Descrição Detalhada</label>
            <textarea required className="form-control" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o problema com o máximo de detalhes possível..."></textarea>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Enviar Solicitação</button>
          </div>
        </form>
      </div>
    </div>
  );
};
