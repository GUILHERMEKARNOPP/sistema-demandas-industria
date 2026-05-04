import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Demand } from '../types';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { subscribeToDemands, deleteDemand } from '../lib/demandService';
import { Download, Trash2, ExternalLink, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const AdminPanel: React.FC = () => {
  const { user, users, deleteUser } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'demands' | 'powerbi'>('metrics');

  useEffect(() => {
    const unsubscribe = subscribeToDemands((data) => {
      setDemands(data);
    });
    return () => unsubscribe();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.")) {
      await deleteUser(userId);
      toast.success("Usuário removido com sucesso");
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

  // Estatísticas de Categorias (Problema que mais acontece)
  const categoryCounts = demands.reduce((acc, demand) => {
    acc[demand.category] = (acc[demand.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
  const mostFrequentProblem = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Custo Médio por Categoria
  const categoryCosts = demands.reduce((acc, demand) => {
    if (demand.totalCost) {
      if (!acc[demand.category]) acc[demand.category] = { total: 0, count: 0 };
      acc[demand.category].total += demand.totalCost;
      acc[demand.category].count += 1;
    }
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const costData = Object.entries(categoryCosts).map(([name, data]) => ({
    name,
    avgCost: Number((data.total / data.count).toFixed(2))
  }));

  const totalAvgCost = demands.filter(d => d.totalCost).length > 0 
    ? demands.reduce((acc, d) => acc + (d.totalCost || 0), 0) / demands.filter(d => d.totalCost).length
    : 0;

  // Estatísticas de Status
  const statusData = demands.reduce((acc, demand) => {
    const existing = acc.find(item => item.name === demand.status);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: demand.status, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

      {/* Tabs Navigation */}
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
          Gerenciar Chamados
        </button>
        <button 
          className={`tab-item ${activeTab === 'users' ? 'active' : ''}`} 
          onClick={() => setActiveTab('users')}
          style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'users' ? '2px solid var(--primary-color)' : 'none', color: activeTab === 'users' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
        >
          Usuários
        </button>
        <button 
          className={`tab-item ${activeTab === 'powerbi' ? 'active' : ''}`} 
          onClick={() => setActiveTab('powerbi')}
          style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'powerbi' ? '2px solid var(--primary-color)' : 'none', color: activeTab === 'powerbi' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
        >
          PowerBI
        </button>
      </div>

      {activeTab === 'metrics' && (
        <div className="animate-fade-in">
          {/* Key Metrics Cards */}
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
                <AlertTriangle color="#f59e0b" />
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
              <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Custo Médio por Categoria (R$)</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={costData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                    <Tooltip formatter={(value: number) => `R$ ${value}`} contentStyle={{ backgroundColor: 'var(--surface-color)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="avgCost" name="Custo Médio" fill="#10b981" radius={[4, 4, 0, 0]} />
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

      {activeTab === 'users' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Usuários Cadastrados</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Nome</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>E-mail</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Perfil</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <td style={{ padding: '1rem' }}>{u.name}</td>
                  <td style={{ padding: '1rem' }}>{u.email}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${u.role === 'ADMIN' ? 'badge-priority-critica' : u.role === 'TECNICO' ? 'badge-status-em-andamento' : 'badge-status-concluido'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      className="btn btn-outline" 
                      style={{ padding: '0.4rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
                      title="Remover Usuário"
                      disabled={u.id === user?.id}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <div style={{ width: '100%', height: '100%', minHeight: '400px', display: 'none' }}>
              {/* Exemplo de como seria o Iframe: */}
              {/* <iframe title="Relatório de Manutenção" width="100%" height="100%" src="SUA_URL_DO_POWERBI_AQUI" frameBorder="0" allowFullScreen={true}></iframe> */}
            </div>
            <button className="btn btn-primary" onClick={() => window.open('https://powerbi.microsoft.com/', '_blank')}>
              Acessar PowerBI
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
