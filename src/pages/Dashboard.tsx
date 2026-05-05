import React, { useState, useEffect, useRef } from 'react';
import type { Demand, Status } from '../types';
import { DemandForm } from '../components/DemandForm';
import { DemandDetails } from '../components/DemandDetails';
import { subscribeToDemands, updateDemandStatus, createDemandFromPreventive } from '../lib/demandService';
import { checkPreventiveSchedules, updatePreventive } from '../lib/preventiveService';
import { Plus, Filter, Wrench, CheckCircle, AlertTriangle, Clock, ShieldAlert, Shield, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { requestNotificationPermission, sendPushNotification, playNotificationSound } from '../lib/notificationService';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [filter, setFilter] = useState<Status | 'Todas'>('Todas');
  const prevDemandCountRef = useRef<number | null>(null);
  const { isInstallable, installPWA } = usePWAInstall();

  useEffect(() => {
    // Solicita permissão de notificação push na primeira vez
    requestNotificationPermission();
    
    // Processa manutenções preventivas
    const processPreventives = async () => {
      if (user?.role !== 'ADMIN') return; // Apenas o Admin dispara o processamento automático por enquanto
      
      const overdue = await checkPreventiveSchedules();
      for (const prev of overdue) {
        try {
          await createDemandFromPreventive(prev);
          
          // Atualiza a próxima data da preventiva
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + prev.intervalDays);
          
          await updatePreventive(prev.id, {
            lastPerformed: new Date().toISOString(),
            nextDueDate: nextDate.toISOString()
          });
        } catch (error) {
          console.error("Erro ao processar preventiva:", error);
        }
      }
    };
    
    processPreventives();
  }, [user]);

  useEffect(() => {
    const unsubscribe = subscribeToDemands((data) => {
      // Detecta novos chamados para push notification
      if (prevDemandCountRef.current !== null && data.length > prevDemandCountRef.current) {
        const newest = data[0];
        // Notifica apenas se for um novo chamado e não for do próprio usuário
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
      prevDemandCountRef.current = data.length;

      setDemands(data);
      
      // Atualiza a demanda selecionada se houver mudanças no banco
      if (selectedDemand) {
        const updatedSelected = data.find(d => d.id === selectedDemand.id);
        if (updatedSelected && JSON.stringify(updatedSelected) !== JSON.stringify(selectedDemand)) {
          setSelectedDemand(updatedSelected);
        }
      }
    });
    return () => unsubscribe();
  }, [user?.id]); // Removido selectedDemand?.id e prevDemandCount para evitar loops e re-inscrições desnecessárias

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
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isInstallable ? (
            <button className="btn btn-primary" onClick={installPWA} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'pulse 2s infinite' }}>
              <Download size={18} />
              Instalar App
            </button>
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.5rem 1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={14} />
              Para instalar: Use o menu do navegador
            </div>
          )}
          {user?.role === 'SOLICITANTE' && (
            <button className="btn btn-primary" onClick={() => setIsFormOpen(true)}>
              <Plus size={18} />
              Nova Solicitação
            </button>
          )}
        </div>
      </div>

      {!isInstallable && (
        <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1rem', borderLeft: '4px solid var(--primary-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
              <Download size={24} color="var(--primary-color)" />
            </div>
            <div>
              <h4 style={{ margin: 0 }}>Deseja usar como Aplicativo?</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                No iPhone (Safari): Clique em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.
              </p>
            </div>
          </div>
          <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => alert('No Android/Chrome: Clique nos 3 pontinhos e em "Instalar Aplicativo". No iPhone/Safari: Clique no ícone de compartilhar e em "Adicionar à Tela de Início".')}>
            Ver Tutorial
          </button>
        </div>
      )}

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
