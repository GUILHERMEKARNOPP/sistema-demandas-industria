import React, { useState, useEffect } from 'react';
import type { Demand, Status } from '../types';
import { DemandForm } from '../components/DemandForm';
import { DemandDetails } from '../components/DemandDetails';
import { subscribeToDemands, updateDemandStatus } from '../lib/demandService';
import { Plus, Filter, Wrench, CheckCircle, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { requestNotificationPermission, sendPushNotification, playNotificationSound } from '../lib/notificationService';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [filter, setFilter] = useState<Status | 'Todas'>('Todas');
  const [prevDemandCount, setPrevDemandCount] = useState<number | null>(null);

  useEffect(() => {
    // Solicita permissão de notificação push na primeira vez
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDemands((data) => {
      // Detecta novos chamados para push notification
      if (prevDemandCount !== null && data.length > prevDemandCount) {
        const newest = data[0];
        if (newest && newest.userId !== user?.id) {
          sendPushNotification('novo_chamado', {
            id: newest.id,
            title: newest.title,
            requester: newest.requesterName,
            priority: newest.priority,
          });
          playNotificationSound();
        }
      }
      setPrevDemandCount(data.length);

      setDemands(data);
      if (selectedDemand) {
        const updatedSelected = data.find(d => d.id === selectedDemand.id);
        if (updatedSelected) setSelectedDemand(updatedSelected);
      }
    });
    return () => unsubscribe();
  }, [selectedDemand?.id, prevDemandCount]);

  const handleAddDemand = () => {
    setIsFormOpen(false);
  };

  const handleUpdateStatus = async (id: string, newStatus: Status) => {
    await updateDemandStatus(id, newStatus);
  };

  // Calcula status de SLA
  const getSlaStatus = (deadline?: string, status?: string) => {
    if (!deadline || status === 'Concluído') return null;
    const now = new Date();
    const limit = new Date(deadline);
    const diffHours = (limit.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) return { label: 'Atrasado', color: 'var(--danger-color)' };
    if (diffHours < 12) return { label: 'Vence em breve', color: '#f59e0b' };
    return { label: 'No prazo', color: '#10b981' };
  };

  // Restrict visibility based on role
  const visibleDemands = user?.role === 'SOLICITANTE' 
    ? demands.filter(d => d.userId === user.id)
    : demands;

  const filteredDemands = visibleDemands.filter(d => filter === 'Todas' || d.status === filter);

  // Stats
  const totalDemands = visibleDemands.length;
  const pendingDemands = visibleDemands.filter(d => d.status === 'Pendente').length;
  const inProgressDemands = visibleDemands.filter(d => d.status === 'Em andamento').length;
  const completedDemands = visibleDemands.filter(d => d.status === 'Concluído').length;
  const awaitingApproval = visibleDemands.filter(d => d.status === 'Aguardando Aprovação').length;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Painel de Chamados</h2>
        {user?.role === 'SOLICITANTE' && (
          <button className="btn btn-primary" onClick={() => setIsFormOpen(true)}>
            <Plus size={18} />
            Nova Solicitação
          </button>
        )}
      </div>

      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total</span>
            <Filter size={20} color="#3b82f6" />
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>{totalDemands}</span>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Pendentes</span>
            <AlertTriangle size={20} color="#f59e0b" />
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>{pendingDemands}</span>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Em andamento</span>
            <Wrench size={20} color="#3b82f6" />
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>{inProgressDemands}</span>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Concluídos</span>
            <CheckCircle size={20} color="#10b981" />
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 700 }}>{completedDemands}</span>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'TECNICO') && awaitingApproval > 0 && (
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#f59e0b' }}>Aguardando Aprovação</span>
              <ShieldAlert size={20} color="#f59e0b" />
            </div>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{awaitingApproval}</span>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Lista de Solicitações</h3>
          <select className="form-control" style={{ width: '200px' }} value={filter} onChange={e => setFilter(e.target.value as any)}>
            <option value="Todas">Todas</option>
            <option value="Pendente">Pendentes</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Aguardando Aprovação">Aguardando Aprovação</option>
            <option value="Concluído">Concluídas</option>
          </select>
        </div>

        {filteredDemands.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            <CheckCircle size={48} style={{ opacity: 0.5, marginBottom: '1rem', margin: '0 auto' }} />
            <h3>Nenhuma solicitação encontrada</h3>
            <p>Não há chamados para exibir no momento.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Título</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Categoria</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Solicitante</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Prioridade</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDemands.map(demand => (
                  <tr 
                    key={demand.id} 
                    onClick={() => setSelectedDemand(demand)}
                    style={{ borderBottom: '1px solid var(--surface-border)', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(128,128,128,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{demand.title}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{demand.category}</td>
                    <td style={{ padding: '1rem' }}>
                      <div>{demand.requesterName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{demand.department}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge badge-priority-${demand.priority.toLowerCase().replace('é', 'e').replace('í', 'i')}`}>
                        {demand.priority}
                      </span>
                      {getSlaStatus(demand.slaDeadline, demand.status) && (
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: getSlaStatus(demand.slaDeadline, demand.status)?.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {getSlaStatus(demand.slaDeadline, demand.status)?.label}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge badge-status-${demand.status.toLowerCase().replace(' ', '-').replace('í', 'i')}`}>
                        {demand.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen && (
        <DemandForm onSubmit={handleAddDemand} onCancel={() => setIsFormOpen(false)} />
      )}

      {selectedDemand && (
        <DemandDetails 
          demand={selectedDemand} 
          onUpdateStatus={handleUpdateStatus} 
          onClose={() => setSelectedDemand(null)} 
        />
      )}
    </>
  );
};
