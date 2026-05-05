import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Demand } from '../types';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { subscribeToDemands, deleteDemand } from '../lib/demandService';
import { adminCreateUser, updateUserRole, deleteUser as deleteUserFirestore, approveUser } from '../lib/userService';
import { subscribeToPreventive, createPreventive, deletePreventive, updatePreventive } from '../lib/preventiveService';
import { Download, Trash2, ExternalLink, TrendingUp, DollarSign, AlertTriangle, Clock, QrCode, UserPlus, X, Check, UserCheck, Calendar, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { UserRole, PreventiveMaintenance, Category } from '../types';

export const AdminPanel: React.FC = () => {
  const { user, users } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [preventives, setPreventives] = useState<PreventiveMaintenance[]>([]);
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'demands' | 'approval' | 'preventive' | 'qrcode'>('metrics');
  const [qrMachine, setQrMachine] = useState('');
  const [qrDept, setQrDept] = useState('');
  
  // Preventive Form State
  const [isPreventiveModalOpen, setIsPreventiveModalOpen] = useState(false);
  const [prevTitle, setPrevTitle] = useState('');
  const [prevDesc, setPrevDesc] = useState('');
  const [prevInterval, setPrevInterval] = useState(30);
  const [prevMachine, setPrevMachine] = useState('');
  const [prevDept, setPrevDept] = useState('');
  const [prevCategory, setPrevCategory] = useState<Category>('Equipamentos');
  
  // New User Form State
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('SOLICITANTE');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const unsubscribeDemands = subscribeToDemands((data) => {
      setDemands(data);
    });
    
    const unsubscribePreventive = subscribeToPreventive((data) => {
      setPreventives(data);
    });

    return () => {
      unsubscribeDemands();
      unsubscribePreventive();
    };
  }, []);

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.")) {
      try {
        await deleteUserFirestore(userId);
        toast.success("Usuário removido com sucesso");
      } catch (error) {
        toast.error("Erro ao remover usuário");
      }
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success("Perfil atualizado com sucesso");
    } catch (error) {
      toast.error("Erro ao atualizar perfil");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await adminCreateUser(newUserName, newUserEmail, newUserRole, newUserPassword);
      toast.success("Usuário criado com sucesso!");
      setIsNewUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('SOLICITANTE');
    } catch (error: any) {
      toast.error("Erro ao criar usuário: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleApproveUser = async (userId: string, approve: boolean) => {
    try {
      await approveUser(userId, approve ? 'APROVADO' : 'REPROVADO');
      toast.success(approve ? "Usuário aprovado!" : "Usuário reprovado");
    } catch (error) {
      toast.error("Erro ao processar aprovação");
    }
  };

  const handleCreatePreventive = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + prevInterval);
      
      await createPreventive({
        title: prevTitle,
        description: prevDesc,
        category: prevCategory,
        department: prevDept,
        machineId: prevMachine,
        intervalDays: prevInterval,
        nextDueDate: nextDate.toISOString(),
        isActive: true
      });
      
      toast.success("Plano preventivo criado!");
      setIsPreventiveModalOpen(false);
      setPrevTitle('');
      setPrevDesc('');
    } catch (error) {
      toast.error("Erro ao criar plano preventivo");
    }
  };

  const handleDeleteDemand = async (demandId: string) => {
    if (window.confirm("Tem certeza que deseja remover este chamado?")) {
      await deleteDemand(demandId);
      toast.success("Chamado removido com sucesso");
    }
  };

  const exportToCSV = () => {
    const headers = ['ID,Título,Solicitante,Departamento,Categoria,Prioridade,Status,Data de Criação,Custo Total'];
    const rows = demands.map(d => 
      `"${d.id}","${d.title}","${d.requesterName}","${d.department}","${d.category}","${d.priority}","${d.status}","${d.createdAt}","${d.totalCost || 0}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_manutencao_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  const categoryCounts = demands.reduce((acc, demand) => {
    acc[demand.category] = (acc[demand.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
  const mostFrequentProblem = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const completedDemands = demands.filter(d => d.status === 'Concluído' && d.updatedAt);
  const totalMttrMs = completedDemands.reduce((acc, d) => {
    const start = new Date(d.createdAt).getTime();
    const end = new Date(d.updatedAt!).getTime();
    return acc + (end - start);
  }, 0);
  const mttrHours = completedDemands.length > 0 ? (totalMttrMs / completedDemands.length / (1000 * 60 * 60)).toFixed(1) : '0';

  const machineFailures = demands.reduce((acc, d) => {
    if (d.machineId) {
      if (!acc[d.machineId]) acc[d.machineId] = [];
      acc[d.machineId].push(new Date(d.createdAt).getTime());
    }
    return acc;
  }, {} as Record<string, number[]>);

  let totalIntervalsMs = 0;
  let intervalCount = 0;
  Object.values(machineFailures).forEach(times => {
    times.sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
      totalIntervalsMs += (times[i] - times[i-1]);
      intervalCount++;
    }
  });
  const mtbfDays = intervalCount > 0 ? (totalIntervalsMs / intervalCount / (1000 * 60 * 60 * 24)).toFixed(1) : '0';

  const deptCosts = demands.reduce((acc, demand) => {
    const dept = demand.department || 'Geral';
    acc[dept] = (acc[dept] || 0) + (demand.totalCost || 0);
    return acc;
  }, {} as Record<string, number>);
  const deptCostData = Object.entries(deptCosts).map(([name, value]) => ({ name, value }));
  
  const totalAvgCost = demands.length > 0 ? demands.reduce((acc, d) => acc + (d.totalCost || 0), 0) / demands.length : 0;

  return (
    <div className="admin-panel-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Painel Administrativo</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
        <button 
          className={`tab-item ${activeTab === 'metrics' ? 'active' : ''}`} 
          onClick={() => setActiveTab('metrics')}
          style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'metrics' ? '2px solid var(--primary-color)' : 'none', color: activeTab === 'metrics' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
        >
          Métricas
        </button>
        <button 
          className={`tab-item ${activeTab === 'demands' ? 'active' : ''}`} 
          onClick={() => setActiveTab('demands')}
          style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'demands' ? '2px solid var(--primary-color)' : 'none', color: activeTab === 'demands' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
        >
          Chamados
        </button>
        <button 
          className={`tab-item ${activeTab === 'approval' ? 'active' : ''}`} 
          onClick={() => setActiveTab('approval')}
          style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'approval' ? '2px solid var(--primary-color)' : 'none', color: activeTab === 'approval' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          Aprovações {users.filter(u => u.status === 'PENDENTE').length > 0 && <span style={{ backgroundColor: 'var(--danger-color)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{users.filter(u => u.status === 'PENDENTE').length}</span>}
        </button>
        <button 
          className={`tab-item ${activeTab === 'users' ? 'active' : ''}`} 
          onClick={() => setActiveTab('users')}
          style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'users' ? '2px solid var(--primary-color)' : 'none', color: activeTab === 'users' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
        >
          Usuários
        </button>
        <button 
          className={`tab-item ${activeTab === 'preventive' ? 'active' : ''}`} 
          onClick={() => setActiveTab('preventive')}
          style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'preventive' ? '2px solid var(--primary-color)' : 'none', color: activeTab === 'preventive' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
        >
          Preventivas
        </button>
        <button 
          className={`tab-item ${activeTab === 'qrcode' ? 'active' : ''}`} 
          onClick={() => setActiveTab('qrcode')}
          style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'qrcode' ? '2px solid var(--primary-color)' : 'none', color: activeTab === 'qrcode' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
        >
          QR Codes
        </button>
      </div>

      {activeTab === 'metrics' && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-3" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                <TrendingUp color="#3b82f6" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Problema mais frequente</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{mostFrequentProblem}</div>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                <DollarSign color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Custo Médio por Chamado</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>R$ {totalAvgCost.toFixed(2)}</div>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                <Clock color="#f59e0b" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>MTTR (Média de Reparo)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{mttrHours} h</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                <TrendingUp color="#8b5cf6" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>MTBF (Entre Falhas)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{mtbfDays} dias</div>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                <DollarSign color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Custo Médio</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>R$ {totalAvgCost.toFixed(2)}</div>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                <AlertTriangle color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total de Chamados</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{demands.length}</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2" style={{ marginBottom: '2rem', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Chamados por Categoria</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--surface-color)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="value" name="Quantidade" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Custo por Departamento (R$)</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={deptCostData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                    <Tooltip formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`} contentStyle={{ backgroundColor: 'var(--surface-color)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="value" name="Custo Total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'demands' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Gerenciamento de Chamados</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>ID</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Título</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Custo</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {demands.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{d.id.substring(0, 8)}...</td>
                    <td style={{ padding: '1rem' }}>{d.title}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge badge-status-${d.status.toLowerCase().replace(' ', '-')}`}>{d.status}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>R$ {(d.totalCost || 0).toFixed(2)}</td>
                    <td style={{ padding: '1rem' }}>
                      <button 
                        onClick={() => handleDeleteDemand(d.id)}
                        className="btn btn-outline" 
                        style={{ padding: '0.4rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
                        title="Remover Chamado"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'approval' && (
        <div className="animate-fade-in glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Novos Usuários Aguardando Aprovação</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Nome</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>E-mail</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Data Cadastro</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => u.status === 'PENDENTE').length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhum usuário pendente de aprovação.</td>
                  </tr>
                ) : (
                  users.filter(u => u.status === 'PENDENTE').map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      <td style={{ padding: '1rem' }}>{u.name}</td>
                      <td style={{ padding: '1rem' }}>{u.email}</td>
                      <td style={{ padding: '1rem' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => handleApproveUser(u.id, true)}
                          className="btn btn-primary" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Check size={14} /> Aprovar
                        </button>
                        <button 
                          onClick={() => handleApproveUser(u.id, false)}
                          className="btn btn-outline" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
                        >
                          Recusar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'preventive' && (
        <div className="animate-fade-in glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Planos de Manutenção Preventiva</h3>
            <button className="btn btn-primary" onClick={() => setIsPreventiveModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} /> Novo Plano
            </button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Plano</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Máquina</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Frequência</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Próxima Data</th>
                  <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {preventives.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhum plano preventivo configurado.</td>
                  </tr>
                ) : (
                  preventives.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600 }}>{p.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.category}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>{p.machineId || 'Geral'}</td>
                      <td style={{ padding: '1rem' }}>Cada {p.intervalDays} dias</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ color: new Date(p.nextDueDate) < new Date() ? 'var(--danger-color)' : 'inherit', fontWeight: new Date(p.nextDueDate) < new Date() ? 'bold' : 'normal' }}>
                          {new Date(p.nextDueDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <button 
                          onClick={() => deletePreventive(p.id)}
                          className="btn btn-outline" 
                          style={{ padding: '0.4rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para Novo Usuário */}
      {isNewUserModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel animate-scale-in" style={{ maxWidth: '450px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Adicionar Novo Usuário</h3>
              <button onClick={() => setIsNewUserModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input type="text" required className="form-control" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Ex: Técnico Silva" />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input type="email" required className="form-control" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="tecnico@empresa.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Senha Inicial</label>
                <input type="password" required className="form-control" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">Perfil de Acesso</label>
                <select className="form-control" value={newUserRole} onChange={e => setNewUserRole(e.target.value as UserRole)}>
                  <option value="SOLICITANTE">Solicitante</option>
                  <option value="TECNICO">Técnico</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsNewUserModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isCreating}>
                  {isCreating ? "Criando..." : "Criar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Nova Preventiva */}
      {isPreventiveModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel animate-scale-in" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Configurar Manutenção Preventiva</h3>
              <button onClick={() => setIsPreventiveModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreatePreventive}>
              <div className="form-group">
                <label className="form-label">Título do Plano</label>
                <input type="text" required className="form-control" value={prevTitle} onChange={e => setPrevTitle(e.target.value)} placeholder="Ex: Revisão Trimestral CNC" />
              </div>
              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Máquina/Ativo</label>
                  <input type="text" className="form-control" value={prevMachine} onChange={e => setPrevMachine(e.target.value)} placeholder="Ex: CNC-01" />
                </div>
                <div className="form-group">
                  <label className="form-label">Intervalo (Dias)</label>
                  <input type="number" required className="form-control" value={prevInterval} onChange={e => setPrevInterval(Number(e.target.value))} min={1} />
                </div>
              </div>
              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Departamento</label>
                  <input type="text" className="form-control" value={prevDept} onChange={e => setPrevDept(e.target.value)} placeholder="Ex: Usinagem" />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select className="form-control" value={prevCategory} onChange={e => setPrevCategory(e.target.value as Category)}>
                    <option value="Equipamentos">Equipamentos</option>
                    <option value="Estruturas">Estruturas</option>
                    <option value="Infraestrutura Administrativa">Infraestrutura</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Descrição das Atividades</label>
                <textarea className="form-control" rows={3} value={prevDesc} onChange={e => setPrevDesc(e.target.value)} placeholder="Descreva o que deve ser verificado..." />
              </div>
              
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsPreventiveModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Criar Plano</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'qrcode' && (
        <div className="animate-fade-in glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <QrCode /> Gerador de Etiquetas QR Code
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>Gere códigos para fixar nas máquinas e facilitar a abertura de chamados.</p>
          </div>

          <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Identificação da Máquina (Machine ID)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: TORNO-01, CNC-05..." 
                  value={qrMachine}
                  onChange={(e) => setQrMachine(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Departamento</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Produção, Usinagem..." 
                  value={qrDept}
                  onChange={(e) => setQrDept(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
                />
              </div>
              
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                <strong>Como funciona:</strong> Ao escanear este código, o formulário de solicitação abrirá com a máquina e o departamento já preenchidos automaticamente. Isso reduz erros de digitação e agiliza a abertura do chamado.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(128,128,128,0.2)', borderRadius: '12px', padding: '2rem' }}>
              {qrMachine || qrDept ? (
                <>
                  <div id="printable-qr" style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?machineId=${qrMachine}&department=${qrDept}`)}`} 
                      alt="QR Code" 
                      style={{ width: '200px', height: '200px', display: 'block' }}
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{qrMachine || 'Máquina Geral'}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{qrDept || 'Todos os Deptos'}</div>
                    <button 
                      onClick={() => window.print()}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
                    >
                      <Download size={18} /> Imprimir Etiqueta
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <QrCode size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p>Preencha os dados ao lado para gerar o QR Code</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'powerbi' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem', height: '70vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Integração PowerBI Dashboard</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cole o link de incorporação do PowerBI no código para visualizar seu dashboard real.</p>
          </div>
          <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '12px', border: '2px dashed var(--surface-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '2rem' }}>
            <div style={{ backgroundColor: 'var(--surface-color)', padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
              <ExternalLink size={48} color="var(--primary-color)" />
            </div>
            <h4>Pronto para conectar seu PowerBI</h4>
            <p style={{ maxWidth: '400px', margin: '1rem auto', color: 'var(--text-secondary)' }}>
              Para exibir seus gráficos do PowerBI aqui, publique seu relatório na web e use o link de "Inserir em site ou portal".
            </p>
            <button className="btn btn-primary" onClick={() => window.open('https://powerbi.microsoft.com/', '_blank')}>
              Acessar PowerBI
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
