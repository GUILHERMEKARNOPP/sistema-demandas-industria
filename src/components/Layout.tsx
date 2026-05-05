import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Layout: React.FC = () => {
  const { user, logout, users } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pendingCount = users.filter(u => (u.status || 'PENDENTE') === 'PENDENTE').length;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <header className="header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <WrenchIcon /> Gestão de Reparos Corporativos
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Sistema Oficial de Manutenção</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {user.role === 'ADMIN' ? 'Administrador' : user.role === 'TECNICO' ? 'Técnico' : 'Solicitante'}
            </div>
          </div>
          
          <nav style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to="/" className="btn btn-outline" style={{ padding: '0.5rem' }} title="Dashboard">
              <LayoutDashboard size={20} />
            </Link>
            {user.role === 'ADMIN' && (
              <Link to="/admin" className="btn btn-outline" style={{ padding: '0.5rem', position: 'relative' }} title="Painel Admin">
                <Settings size={20} />
                {pendingCount > 0 && (
                  <span style={{ 
                    position: 'absolute', 
                    top: '-5px', 
                    right: '-5px', 
                    backgroundColor: 'var(--danger-color)', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: '18px', 
                    height: '18px', 
                    fontSize: '0.7rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '2px solid var(--surface-card)'
                  }}>
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}
            <button className="btn btn-outline" onClick={toggleTheme} style={{ padding: '0.5rem' }} title="Alternar Tema">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button className="btn btn-outline" onClick={logout} style={{ padding: '0.5rem', color: 'var(--danger-color)' }} title="Sair">
              <LogOut size={20} />
            </button>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

const WrenchIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
  </svg>
);
