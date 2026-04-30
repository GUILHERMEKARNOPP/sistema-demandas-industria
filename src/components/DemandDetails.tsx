import React, { useState } from 'react';
import type { Demand, Status } from '../types';
import { X, User, Calendar, Tag, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DemandDetailsProps {
  demand: Demand;
  onUpdateStatus: (id: string, newStatus: Status) => void;
  onClose: () => void;
}

export const DemandDetails: React.FC<DemandDetailsProps> = ({ demand, onUpdateStatus, onClose }) => {
  const [status, setStatus] = useState<Status>(demand.status);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as Status;
    setStatus(newStatus);
    onUpdateStatus(demand.id, newStatus);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className={`badge badge-priority-${demand.priority.toLowerCase().replace('é', 'e').replace('í', 'i')}`}>{demand.priority}</span>
              <span className={`badge badge-status-${demand.status.toLowerCase().replace(' ', '-').replace('í', 'i')}`}>{demand.status}</span>
            </div>
            <h2 style={{ marginTop: '0.5rem' }}>{demand.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '2rem', backgroundColor: 'rgba(15, 23, 42, 0.4)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="#94a3b8" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Solicitante</div>
              <div>{demand.requesterName}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag size={18} color="#94a3b8" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Departamento</div>
              <div>{demand.department}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} color="#94a3b8" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Categoria</div>
              <div>{demand.category}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} color="#94a3b8" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Data de Abertura</div>
              <div>{format(new Date(demand.createdAt), "dd 'de' MMMM, yyyy", { locale: ptBR })}</div>
            </div>
          </div>
        </div>
        
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#94a3b8' }}>Descrição do Problema</h3>
          <p style={{ color: '#f8fafc', backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
            {demand.description}
          </p>
        </div>
        
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Gerenciar Solicitação (Ação da Manutenção)</h3>
          <div className="form-group">
            <label className="form-label">Atualizar Status</label>
            <select className="form-control" value={status} onChange={handleStatusChange}>
              <option value="Pendente">Pendente</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            * Ao alterar o status, o solicitante poderá acompanhar a mudança no painel em tempo real.
          </p>
        </div>
        
      </div>
    </div>
  );
};
