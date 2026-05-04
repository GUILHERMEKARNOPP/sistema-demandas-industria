import React, { useState, useEffect } from 'react';
import type { Category, Priority } from '../types';
import { X, Shield, Mic, MicOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

import { addDemand } from '../lib/demandService';

interface DemandFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

export const DemandForm: React.FC<DemandFormProps> = ({ onSubmit, onCancel }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [machineId, setMachineId] = useState('');
  const [category, setCategory] = useState<Category>('Estruturas');
  const [priority, setPriority] = useState<Priority>('Baixa');
  const [consent, setConsent] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');

  const startVoiceCommand = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      alert('Seu navegador não suporta comandos de voz.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDescription(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  useEffect(() => {
    // Auto-fill form from QR Code (URL Params)
    const params = new URLSearchParams(window.location.search);
    const depParam = params.get('department');
    const machParam = params.get('machineId');
    if (depParam) setDepartment(depParam);
    if (machParam) setMachineId(machParam);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError('O consentimento com a política LGPD é obrigatório.');
      return;
    }
    
    if (!user) return;
    setIsSubmitting(true);

    try {
      const demandData = {
        title,
        description,
        requesterName: user.name,
        department,
        machineId,
        category,
        priority,
        status: 'Pendente' as const,
        userId: user.id,
        lgpdConsent: consent,
      };
      
      await addDemand(demandData, imageFile || undefined);
      
      onSubmit();

      // Enviar notificação WhatsApp para o número fixo configurado
      const phone = '5547997417610';
      const message = `*Nova Solicitação de Reparo*\n\n*Título:* ${title}\n*Solicitante:* ${user.name}\n*Prioridade:* ${priority}\n*Categoria:* ${category}\n\n*Acesse o sistema para mais detalhes.*`;
      
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar demanda');
      setIsSubmitting(false);
    }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Nova Solicitação de Manutenção</h2>
          <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Título da Solicitação</label>
            <input required type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Ar condicionado vazando" />
          </div>
          
          <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Departamento / Setor</label>
              <input required type="text" className="form-control" value={department} onChange={e => setDepartment(e.target.value)} placeholder="Ex: Produção" />
            </div>
            <div className="form-group">
              <label className="form-label">Máquina/Ativo (Opcional - via QR Code)</label>
              <input type="text" className="form-control" value={machineId} onChange={e => setMachineId(e.target.value)} placeholder="Ex: MAQ-01" />
            </div>
          </div>
          
          <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-control" value={category} onChange={e => setCategory(e.target.value as Category)}>
                <option value="Estruturas">Estruturas (Paredes, piso, teto)</option>
                <option value="Mobiliário">Mobiliário (Mesas, cadeiras)</option>
                <option value="Equipamentos">Equipamentos (Ar condicionado, etc)</option>
                <option value="Infraestrutura Administrativa">Infraestrutura Administrativa</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Prioridade</label>
              <select className="form-control" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                <option value="Baixa">Baixa (Pode esperar alguns dias)</option>
                <option value="Média">Média (Requer atenção em breve)</option>
                <option value="Alta">Alta (Afeta o trabalho de uma equipe)</option>
                <option value="Crítica">Crítica (Risco iminente ou parada total)</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Descrição Detalhada</label>
              <button 
                type="button"
                onClick={startVoiceCommand}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '4px 12px', borderRadius: '20px', border: 'none',
                  backgroundColor: isListening ? 'var(--danger-color)' : 'var(--primary-color)',
                  color: 'white', fontSize: '0.75rem', cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                {isListening ? 'Ouvindo...' : 'Falar Descrição'}
              </button>
            </div>
            <textarea required className="form-control" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o problema com o máximo de detalhes possível..."></textarea>
          </div>

          <div className="form-group">
            <label className="form-label">Anexar Foto (Opcional)</label>
            <input 
              type="file" 
              accept="image/*" 
              className="form-control" 
              onChange={e => setImageFile(e.target.files?.[0] || null)}
              style={{ padding: '0.5rem' }}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <input 
              type="checkbox" 
              id="demand-lgpd" 
              checked={consent} 
              onChange={(e) => setConsent(e.target.checked)} 
              style={{ marginTop: '0.25rem' }}
            />
            <label htmlFor="demand-lgpd" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <Shield size={14} style={{ display: 'inline', marginRight: '4px' }} />
              <strong>Conformidade LGPD:</strong> Concordo em compartilhar as informações descritas acima com os técnicos de manutenção e a administração, incluindo o envio de notificação por WhatsApp com os dados da solicitação para fins de agilidade no atendimento.
            </label>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
