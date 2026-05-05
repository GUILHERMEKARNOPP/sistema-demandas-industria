import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleNotApproved = () => {
      setError("Sua conta ainda não foi aprovada pelo administrador. Por favor, aguarde a liberação.");
    };
    window.addEventListener('auth-not-approved', handleNotApproved);
    return () => window.removeEventListener('auth-not-approved', handleNotApproved);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Wrench size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem' }} />
          <h2>Gestão de Reparos</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Acesso ao Sistema</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-mail Corporativo</label>
            <input 
              type="email" 
              required 
              className="form-control" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@empresa.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input 
              type="password" 
              required 
              className="form-control" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '1.5rem' }}>
            Entrar
          </button>

          <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
            Não tem uma conta? <Link to="/register" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}>Cadastre-se</Link>
          </div>
        </form>
      </div>
    </div>
  );
};
