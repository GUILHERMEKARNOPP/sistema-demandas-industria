import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import type { UserRole } from '../types';
import { Shield } from 'lucide-react';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('SOLICITANTE');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError('Você deve aceitar a Política de Privacidade (LGPD) para se cadastrar.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    try {
      await register(name, email, role, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2>Novo Cadastro</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Crie sua conta para solicitar reparos</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome Completo</label>
            <input 
              type="text" required className="form-control" 
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="João da Silva"
            />
          </div>

          <div className="form-group">
            <label className="form-label">E-mail Corporativo</label>
            <input 
              type="email" required className="form-control" 
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="joao@empresa.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input 
              type="password" required className="form-control" 
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Crie uma senha"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Perfil de Acesso</label>
            <select className="form-control" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="SOLICITANTE">Colaborador / Solicitante</option>
              <option value="TECNICO">Técnico de Manutenção</option>
              <option value="ADMIN">Administrador</option>
            </select>
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.5rem' }}>
              * Em ambiente de produção, perfis administrativos requerem aprovação prévia.
            </small>
          </div>

          <div className="form-group" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <input 
              type="checkbox" 
              id="lgpd" 
              checked={consent} 
              onChange={(e) => setConsent(e.target.checked)} 
              style={{ marginTop: '0.25rem' }}
            />
            <label htmlFor="lgpd" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <Shield size={14} style={{ display: 'inline', marginRight: '4px' }} />
              <strong>Conformidade LGPD:</strong> Aceito que meus dados pessoais (Nome, E-mail) sejam armazenados exclusivamente para fins de comunicação e auditoria interna do sistema de manutenção.
            </label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '1.5rem' }}>
            Criar Conta
          </button>

          <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
            Já tem uma conta? <Link to="/login" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}>Fazer login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};
