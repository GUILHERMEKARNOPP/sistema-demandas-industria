import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { Demand } from '../types';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const AdminPanel: React.FC = () => {
  const { user, users } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('@grc:demands');
    if (saved) {
      setDemands(JSON.parse(saved));
    }
  }, []);

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  // Estatísticas de Categorias
  const categoryData = demands.reduce((acc, demand) => {
    const existing = acc.find(item => item.name === demand.category);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: demand.category, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

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

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div>
      <h2 style={{ marginBottom: '2rem' }}>Painel Administrativo - Métricas</h2>

      <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Demandas por Categoria</h3>
          {categoryData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={categoryData}>
                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface-color)', border: 'none', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="value" name="Quantidade" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Sem dados suficientes</div>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Distribuição de Status</h3>
          {statusData.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface-color)', border: 'none', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>Sem dados suficientes</div>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Usuários Cadastrados no Sistema</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Nome</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>E-mail</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Perfil de Acesso</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
