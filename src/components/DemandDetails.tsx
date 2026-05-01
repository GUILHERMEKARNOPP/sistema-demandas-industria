import React, { useState } from 'react';
import type { Demand, Status, Comment } from '../types';
import { X, User, Calendar, Tag, AlertCircle, Clock, Image as ImageIcon, MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { addComment } from '../lib/demandService';
import { v4 as uuidv4 } from 'uuid';

interface DemandDetailsProps {
  demand: Demand;
  onUpdateStatus: (id: string, newStatus: Status) => void;
  onClose: () => void;
}

export const DemandDetails: React.FC<DemandDetailsProps> = ({ demand, onUpdateStatus, onClose }) => {
  const [status, setStatus] = useState<Status>(demand.status);
  const [newCommentText, setNewCommentText] = useState('');
  const { user } = useAuth();

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as Status;
    setStatus(newStatus);
    onUpdateStatus(demand.id, newStatus);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !user) return;
    
    const comment: Comment = {
      id: uuidv4(),
      text: newCommentText,
      authorId: user.id,
      authorName: user.name,
      createdAt: new Date().toISOString()
    };
    
    await addComment(demand.id, demand.comments || [], comment);
    setNewCommentText('');
  };

  const canEditStatus = user?.role === 'ADMIN' || user?.role === 'TECNICO';

  // SLA Calculation
  const getSlaStatus = () => {
    if (!demand.slaDeadline || demand.status === 'Concluído') return null;
    const now = new Date();
    const limit = new Date(demand.slaDeadline);
    const diffHours = (limit.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) return { label: 'Atrasado', color: 'var(--danger-color)' };
    if (diffHours < 12) return { label: 'Vence em breve', color: '#f59e0b' };
    return { label: 'No prazo', color: '#10b981' };
  };

  const sla = getSlaStatus();

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%', maxWidth: '800px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span className={`badge badge-priority-${demand.priority.toLowerCase().replace('é', 'e').replace('í', 'i')}`}>{demand.priority}</span>
              <span className={`badge badge-status-${demand.status.toLowerCase().replace(' ', '-').replace('í', 'i')}`}>{demand.status}</span>
              {sla && (
                <span className="badge" style={{ backgroundColor: 'transparent', border: `1px solid ${sla.color}`, color: sla.color }}>
                  <Clock size={12} style={{ marginRight: '4px', display: 'inline' }} />
                  {sla.label}
                </span>
              )}
            </div>
            <h2 style={{ marginTop: '0.5rem' }}>{demand.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '2rem', backgroundColor: 'rgba(128, 128, 128, 0.1)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="var(--text-secondary)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Solicitante</div>
              <div>{demand.requesterName}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag size={18} color="var(--text-secondary)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Departamento</div>
              <div>{demand.department}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} color="var(--text-secondary)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Categoria</div>
              <div>{demand.category}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} color="var(--text-secondary)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Data de Abertura</div>
              <div>{format(new Date(demand.createdAt), "dd 'de' MMMM, yyyy, HH:mm", { locale: ptBR })}</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
          {/* Lado Esquerdo: Descrição e Foto */}
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Descrição do Problema</h3>
              <p style={{ color: 'var(--text-primary)', backgroundColor: 'rgba(128,128,128,0.05)', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
                {demand.description}
              </p>
            </div>

            {demand.imageUrl && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ImageIcon size={16} /> Evidência Fotográfica
                </h3>
                <img src={demand.imageUrl} alt="Evidência" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--surface-border)', objectFit: 'cover' }} />
              </div>
            )}
            
            {canEditStatus && (
              <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Gerenciar Solicitação</h3>
                <div className="form-group">
                  <label className="form-label">Atualizar Status</label>
                  <select className="form-control" value={status} onChange={handleStatusChange}>
                    <option value="Pendente">Pendente</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Lado Direito: Histórico de Comentários */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={16} /> Histórico de Atualizações
            </h3>
            
            <div style={{ flex: 1, backgroundColor: 'rgba(128,128,128,0.05)', borderRadius: '8px', padding: '1rem', overflowY: 'auto', maxHeight: '400px', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              {!demand.comments || demand.comments.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: 'auto', fontSize: '0.9rem' }}>Nenhuma atualização registrada.</p>
              ) : (
                demand.comments.map(c => (
                  <div key={c.id} style={{ backgroundColor: 'var(--surface-color)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary-color)' }}>{c.authorName}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{format(new Date(c.createdAt), "dd/MM HH:mm")}</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', margin: 0, whiteSpace: 'pre-wrap' }}>{c.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Adicionar um comentário..." 
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} disabled={!newCommentText.trim()}>
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
