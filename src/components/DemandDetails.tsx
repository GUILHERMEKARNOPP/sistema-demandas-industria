import React, { useState, useRef } from 'react';
import type { Demand, Status, Comment, DemandPart } from '../types';
import { X, User, Calendar, Tag, AlertCircle, Clock, Image as ImageIcon, MessageSquare, Send, Wrench, Star, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { addComment, updateDemand } from '../lib/demandService';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import SignatureCanvas from 'react-signature-canvas';

interface DemandDetailsProps {
  demand: Demand;
  onUpdateStatus: (id: string, newStatus: Status) => void;
  onClose: () => void;
}

export const DemandDetails: React.FC<DemandDetailsProps> = ({ demand, onUpdateStatus, onClose }) => {
  const [status, setStatus] = useState<Status>(demand.status);
  const [newCommentText, setNewCommentText] = useState('');
  
  // Enterprise Features States
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partCost, setPartCost] = useState(0);
  const [partsUsed, setPartsUsed] = useState<DemandPart[]>(demand.partsUsed || []);
  
  const [rating, setRating] = useState<number>(demand.rating || 0);
  const ratingComment = demand.ratingComment || '';
  
  const sigPad = useRef<any>(null);
  const [showSignature, setShowSignature] = useState(false);
  
  const { user } = useAuth();

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as Status;
    if (newStatus === 'Concluído' && user?.role === 'TECNICO') {
      setShowSignature(true);
      return; // Stop here until signature is saved
    }
    
    setStatus(newStatus);
    onUpdateStatus(demand.id, newStatus);
    toast.success(`Status alterado para ${newStatus}`);
  };

  const handleAddPart = () => {
    if (!partName.trim() || partQty <= 0) return;
    const newPart: DemandPart = {
      partId: uuidv4(),
      name: partName,
      quantityUsed: partQty,
      totalCost: partQty * partCost
    };
    
    const updatedParts = [...partsUsed, newPart];
    setPartsUsed(updatedParts);
    
    const totalCost = updatedParts.reduce((acc, p) => acc + p.totalCost, 0);
    updateDemand(demand.id, { partsUsed: updatedParts, totalCost });
    
    setPartName(''); setPartQty(1); setPartCost(0);
    toast.success('Peça adicionada ao custo!');
  };

  const handleCompleteWithSignature = async () => {
    if (sigPad.current?.isEmpty()) {
      toast.error('Por favor, assine para concluir.');
      return;
    }
    
    const signatureUrl = sigPad.current?.getTrimmedCanvas().toDataURL('image/png');
    await updateDemand(demand.id, { status: 'Concluído', signatureUrl });
    setStatus('Concluído');
    onUpdateStatus(demand.id, 'Concluído');
    setShowSignature(false);
    toast.success('Chamado concluído com sucesso!');
  };

  const handleRate = async (stars: number) => {
    setRating(stars);
    await updateDemand(demand.id, { rating: stars, ratingComment });
    toast.success('Obrigado pela sua avaliação!');
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
    toast.success('Atualização registrada');
  };

  const canEditStatus = user?.role === 'ADMIN' || user?.role === 'TECNICO';
  const isRequester = user?.id === demand.userId || user?.name === demand.requesterName;

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
        width: '100%', maxWidth: '900px', padding: '2rem', maxHeight: '95vh', overflowY: 'auto'
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
        
        <div className="grid grid-cols-4" style={{ gap: '1rem', marginBottom: '2rem', backgroundColor: 'rgba(128, 128, 128, 0.1)', padding: '1rem', borderRadius: '8px' }}>
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
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Data</div>
              <div>{format(new Date(demand.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
          {/* Esquerda: Informações principais e Custos */}
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
            
            {/* Controle de Peças/Estoque (Apenas Técnico/Admin) */}
            {canEditStatus && demand.status !== 'Concluído' && (
              <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Wrench size={16} /> Lançar Peças e Custos
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input type="text" placeholder="Nome da Peça" className="form-control" value={partName} onChange={e => setPartName(e.target.value)} />
                  <input type="number" placeholder="Qtd" className="form-control" style={{ width: '80px' }} value={partQty} onChange={e => setPartQty(Number(e.target.value))} />
                  <input type="number" placeholder="R$ Unid" className="form-control" style={{ width: '100px' }} value={partCost} onChange={e => setPartCost(Number(e.target.value))} />
                  <button className="btn btn-primary" onClick={handleAddPart}>+</button>
                </div>
              </div>
            )}

            {/* Resumo de Custos */}
            {partsUsed.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Materiais Utilizados</h3>
                <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                  <tbody>
                    {partsUsed.map(p => (
                      <tr key={p.partId} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                        <td style={{ padding: '0.5rem 0' }}>{p.quantityUsed}x {p.name}</td>
                        <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>R$ {p.totalCost.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ padding: '1rem 0', fontWeight: 'bold' }}>Custo Total</td>
                      <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 'bold', color: 'var(--danger-color)' }}>
                        R$ {partsUsed.reduce((acc, p) => acc + p.totalCost, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {canEditStatus && demand.status !== 'Concluído' && !showSignature && (
              <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Gerenciar Solicitação</h3>
                <div className="form-group">
                  <label className="form-label">Atualizar Status</label>
                  <select className="form-control" value={status} onChange={handleStatusChange}>
                    <option value="Pendente">Pendente</option>
                    <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído (Assinatura)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Modal de Assinatura Interno */}
            {showSignature && (
              <div style={{ padding: '1rem', border: '1px solid var(--primary-color)', borderRadius: '8px', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Assinatura do Técnico</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Assine no quadro abaixo para registrar a conclusão do reparo.</p>
                <div style={{ border: '1px dashed var(--surface-border)', background: '#fff', borderRadius: '4px', marginBottom: '1rem' }}>
                  <SignatureCanvas 
                    ref={sigPad} 
                    penColor="blue" 
                    canvasProps={{ width: 400, height: 150, className: 'sigCanvas' }} 
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-outline" onClick={() => sigPad.current?.clear()}>Limpar</button>
                  <button className="btn btn-primary" onClick={handleCompleteWithSignature}><CheckCircle size={18}/> Concluir Chamado</button>
                </div>
              </div>
            )}

            {/* Exibição de Assinatura Salva */}
            {demand.signatureUrl && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Assinatura de Conclusão</h3>
                <img src={demand.signatureUrl} alt="Assinatura" style={{ maxHeight: '100px', background: '#fff', padding: '0.5rem', borderRadius: '4px' }} />
              </div>
            )}

            {/* Avaliação do Solicitante */}
            {status === 'Concluído' && (isRequester || user?.role === 'ADMIN') && !rating && (
               <div style={{ padding: '1.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', marginBottom: '2rem' }}>
                 <h3 style={{ fontSize: '1rem', marginBottom: '1rem', textAlign: 'center' }}>Avalie o Atendimento</h3>
                 <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                   {[1,2,3,4,5].map(star => (
                     <Star 
                       key={star} 
                       size={32} 
                       color={star <= rating ? "var(--warning-color)" : "var(--surface-border)"} 
                       fill={star <= rating ? "var(--warning-color)" : "none"}
                       style={{ cursor: 'pointer' }}
                       onClick={() => handleRate(star)}
                     />
                   ))}
                 </div>
               </div>
            )}

            {demand.rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                <span style={{ fontWeight: 'bold' }}>Avaliação:</span>
                <div style={{ display: 'flex' }}>
                   {[1,2,3,4,5].map(star => (
                     <Star key={star} size={18} color="var(--warning-color)" fill={star <= demand.rating! ? "var(--warning-color)" : "none"} />
                   ))}
                </div>
              </div>
            )}
          </div>

          {/* Direita: Histórico de Comentários */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={16} /> Chat & Atualizações
            </h3>
            
            <div style={{ flex: 1, backgroundColor: 'rgba(128,128,128,0.05)', borderRadius: '8px', padding: '1rem', overflowY: 'auto', maxHeight: '500px', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
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

            {demand.status !== 'Concluído' && (
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Mensagem..." 
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} disabled={!newCommentText.trim()}>
                  <Send size={18} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
