import React, { useState, useRef } from 'react';
import type { Demand, Status, Comment, DemandPart } from '../types';
import { APPROVAL_COST_THRESHOLD } from '../types';
import { X, User, Calendar, Tag, AlertCircle, Clock, Image as ImageIcon, MessageSquare, Send, Wrench, Star, CheckCircle, ShieldAlert, ThumbsUp, ThumbsDown } from 'lucide-react';
import { format } from 'date-fns';
import * as locales from 'date-fns/locale';
const ptBR = locales.ptBR;
import { useAuth } from '../contexts/AuthContext';
import * as demandService from '../lib/demandService';
import { toast } from 'react-hot-toast';
import SignatureCanvasComponent from 'react-signature-canvas';
const SignatureCanvas = (SignatureCanvasComponent as any).default || SignatureCanvasComponent;
import { sendPushNotification, playNotificationSound } from '../lib/notificationService';

interface DemandDetailsProps {
  demand: Demand;
  onUpdateStatus: (id: string, newStatus: Status) => void;
  onClose: () => void;
}

export const DemandDetails: React.FC<DemandDetailsProps> = ({ demand, onUpdateStatus, onClose }) => {
  const [status, setStatus] = useState<Status>(demand.status);
  const [newCommentText, setNewCommentText] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>(demand.comments || []);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  
  // Enterprise Features States
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partCost, setPartCost] = useState(0);
  const [partsUsed, setPartsUsed] = useState<DemandPart[]>(demand.partsUsed || []);
  
  const [rating, setRating] = useState<number>(demand.rating || 0);
  const ratingComment = demand.ratingComment || '';
  const [rejectionReason, setRejectionReason] = useState('');
  
  const sigPad = useRef<any>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [isConcluding, setIsConcluding] = useState(false);
  
  // Default Safety Checklist items
  const defaultChecklist = [
    { item: 'Uso de EPIs Obrigatórios', completed: false, mandatory: true },
    { item: 'Bloqueio de Energia / LOTO', completed: false, mandatory: true },
    { item: 'Área de Trabalho Isolada/Sinalizada', completed: false, mandatory: false },
    { item: 'Verificação de Ferramentas e Cabos', completed: false, mandatory: true },
  ];

  const [checklist, setChecklist] = useState(demand.safetyChecklist || defaultChecklist);
  
  const { user } = useAuth();

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as Status;
    if (newStatus === 'Concluído' && user?.role === 'TECNICO') {
      // Validar Checklist de Segurança antes de prosseguir
      const incompleteMandatory = checklist.filter(c => c.mandatory && !c.completed);
      if (incompleteMandatory.length > 0) {
        toast.error(`Checklist de Segurança incompleto: ${incompleteMandatory[0].item}`);
        return;
      }
      setShowSignature(true);
      return;
    }
    
    setStatus(newStatus);
    onUpdateStatus(demand.id, newStatus);
    toast.success(`Status alterado para ${newStatus}`);

    // Notificação push ao solicitante
    sendPushNotification('status_alterado', {
      id: demand.id, title: demand.title, status: newStatus
    });
    playNotificationSound();
  };

  const handleAddPart = async () => {
    if (!partName.trim() || partQty <= 0) return;
    const newPart: DemandPart = {
      partId: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      name: partName,
      quantityUsed: partQty,
      totalCost: partQty * (partCost || 0)
    };
    
    const updatedParts = [...partsUsed, newPart];
    setPartsUsed(updatedParts);
    
    const totalCost = updatedParts.reduce((acc, p) => acc + p.totalCost, 0);
    
    // Se custo ultrapassar o limite, dispara aprovação obrigatória
    // Re-dispara aprovação se o custo subir acima do threshold mesmo se já tivesse sido aprovado anteriormente (segurança)
    if (totalCost >= APPROVAL_COST_THRESHOLD && (!demand.approvedByAdmin || totalCost > (demand.totalCost || 0))) {
      const updates: Partial<Demand> = {
        partsUsed: updatedParts,
        totalCost,
        status: 'Aguardando Aprovação',
        approvalRequestedAt: new Date().toISOString(),
      const approvalUpdates: Partial<Demand> = {
        partsUsed: updatedParts,
        totalCost,
        status: 'Aguardando Aprovação',
        approvalRequestedAt: new Date().toISOString(),
      };
      
      if (demand.approvedByAdmin) {
        approvalUpdates.approvedByAdmin = false;
        approvalUpdates.approvedAt = undefined;
        approvalUpdates.approvedByName = undefined;
      }

      await demandService.updateDemand(demand.id, approvalUpdates);
      setStatus('Aguardando Aprovação');
      onUpdateStatus(demand.id, 'Aguardando Aprovação');
      
      sendPushNotification('aprovacao_pendente', {
        id: demand.id, title: demand.title, cost: totalCost.toFixed(2)
      });
      playNotificationSound();
      toast('⚠️ Custo excedeu o limite. Nova aprovação necessária.', { icon: '🔒', duration: 5000 });
    } else {
      await demandService.updateDemand(demand.id, { partsUsed: updatedParts, totalCost });
      toast.success('Peça adicionada ao custo!');
    }
    
    setPartName(''); setPartQty(1); setPartCost(0);
  };

  const handleRemovePart = async (partId: string) => {
    const updatedParts = partsUsed.filter(p => p.partId !== partId);
    setPartsUsed(updatedParts);
    const totalCost = updatedParts.reduce((acc, p) => acc + p.totalCost, 0);
    
    await demandService.updateDemand(demand.id, { partsUsed: updatedParts, totalCost });
    toast.success('Peça removida.');
  };

  const handleCompleteWithSignature = async () => {
    if (isConcluding) return;
    
    try {
      if (!sigPad.current || sigPad.current.isEmpty()) {
        toast.error('Por favor, assine para concluir.');
        return;
      }
      
      setIsConcluding(true);
      // Usamos getCanvas() em vez de getTrimmedCanvas() para evitar um bug conhecido 
      // de incompatibilidade da biblioteca interna 'trim-canvas' com o Vite em produção.
      const canvas = sigPad.current.getCanvas();
      
      if (!canvas) {
        toast.error('Erro ao acessar o quadro de assinatura.');
        setIsConcluding(false);
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();

      // 1. "Upload" da assinatura (converte e salva no Firestore como Base64)
      await demandService.uploadSignature(demand.id, blob); 
      
      // Salva o checklist de segurança obrigatório
      await demandService.updateDemand(demand.id, { safetyChecklist: checklist });

      // 2. O status e a assinatura são atualizados no service. 
      // No component apenas confirmamos o sucesso visual.
      setStatus('Concluído');
      setShowSignature(false);
      toast.success('Chamado concluído com sucesso!');
      
      onUpdateStatus(demand.id, 'Concluído');
      
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('Erro ao concluir chamado:', error);
      // Mostra o erro real para ajudar no diagnóstico se persistir
      toast.error(`Erro: ${error.message || 'Verifique sua conexão'}`);
    } finally {
      setIsConcluding(false);
    }
  };

  const handleRate = async (stars: number) => {
    setRating(stars);
    await demandService.updateDemand(demand.id, { rating: stars, ratingComment });
    toast.success('Obrigado pela sua avaliação!');
  };

  // === Sistema de Aprovação (Alçadas) ===
  const handleApprove = async () => {
    await demandService.updateDemand(demand.id, {
      approvedByAdmin: true,
      approvedAt: new Date().toISOString(),
      approvedByName: user?.name || 'Admin',
      status: 'Em andamento',
    });
    setStatus('Em andamento');
    onUpdateStatus(demand.id, 'Em andamento');
    sendPushNotification('aprovacao_concedida', { id: demand.id, title: demand.title });
    playNotificationSound();
    toast.success('Chamado aprovado! O técnico foi notificado.');
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Informe o motivo da reprovação.');
      return;
    }
    await demandService.updateDemand(demand.id, {
      approvedByAdmin: false,
      rejectionReason,
      status: 'Reprovado',
    });
    setStatus('Reprovado');
    onUpdateStatus(demand.id, 'Reprovado');
    sendPushNotification('aprovacao_recusada', { id: demand.id, title: demand.title, reason: rejectionReason });
    playNotificationSound();
    toast.success('Chamado reprovado.');
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !user) return;
    
    const comment: Comment = {
      id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      text: newCommentText,
      authorId: user.id,
      authorName: user.name,
      createdAt: new Date().toISOString()
    };
    
    // Optimistic Update
    setLocalComments(prev => [...prev, comment]);
    setNewCommentText('');

    try {
      await demandService.addComment(demand.id, demand.comments || [], comment);
      toast.success('Mensagem enviada');
      
      // Notificação push para o outro participante
      sendPushNotification('novo_comentario', {
        id: demand.id, title: demand.title, author: user.name
      });
      playNotificationSound();
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
      // Revert optimistic update on failure
      setLocalComments(prev => prev.filter(c => c.id !== comment.id));
    }
  };

  const handleAddEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploadingEvidence(true);
      const base64 = await demandService.addEvidence(demand.id, file);
      
      const currentEvidence = demand.evidenceUrls || [];
      const updatedEvidence = [...currentEvidence, base64];
      
      await demandService.updateDemand(demand.id, { 
        evidenceUrls: updatedEvidence,
        // Também atualiza o imageUrl principal se for a primeira imagem
        imageUrl: demand.imageUrl || base64 
      });
      
      toast.success('Evidência enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar evidência:', error);
      toast.error('Erro ao enviar evidência');
    } finally {
      setIsUploadingEvidence(false);
    }
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

            {(demand.imageUrl || (demand.evidenceUrls && demand.evidenceUrls.length > 0)) && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ImageIcon size={16} /> Evidências Fotográficas
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
                  {demand.imageUrl && !demand.evidenceUrls?.includes(demand.imageUrl) && (
                    <img src={demand.imageUrl} alt="Evidência" style={{ width: '100%', aspectRatio: '1/1', borderRadius: '8px', border: '1px solid var(--surface-border)', objectFit: 'cover' }} />
                  )}
                  {demand.evidenceUrls?.map((url, idx) => (
                    <img key={idx} src={url} alt={`Evidência ${idx + 1}`} style={{ width: '100%', aspectRatio: '1/1', borderRadius: '8px', border: '1px solid var(--surface-border)', objectFit: 'cover' }} />
                  ))}
                </div>
              </div>
            )}

            {/* Checklist de Segurança (Novo Gatilho de Segurança) */}
            {(canEditStatus || (demand.safetyChecklist && demand.safetyChecklist.length > 0)) && (
              <div style={{ marginBottom: '2rem', padding: '1.25rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert size={18} /> Checklist de Segurança Obrigatório
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {checklist.map((item, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: canEditStatus && status !== 'Concluído' ? 'pointer' : 'default' }}>
                      <input 
                        type="checkbox" 
                        checked={item.completed} 
                        onChange={(e) => {
                          if (!canEditStatus || status === 'Concluído') return;
                          const newChecklist = [...checklist];
                          newChecklist[idx].completed = e.target.checked;
                          setChecklist(newChecklist);
                        }}
                        disabled={!canEditStatus || status === 'Concluído'}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--danger-color)' }}
                      />
                      <span style={{ fontSize: '0.9rem', color: item.mandatory && !item.completed ? 'var(--danger-color)' : 'inherit', fontWeight: item.mandatory ? '600' : 'normal' }}>
                        {item.item} {item.mandatory && <span style={{ color: 'var(--danger-color)', fontSize: '0.7rem' }}>(Obrigatório)</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {isRequester && status !== 'Concluído' && (
              <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px dashed var(--primary-color)' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ImageIcon size={16} /> {demand.imageUrl ? 'Adicionar mais evidências' : 'Adicionar Evidência'}
                </h3>
                <input type="file" accept="image/*" onChange={handleAddEvidence} disabled={isUploadingEvidence} />
                {isUploadingEvidence && <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Enviando imagem...</p>}
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
                        <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>
                          R$ {p.totalCost.toFixed(2)}
                          {canEditStatus && status !== 'Concluído' && (
                            <button 
                              onClick={() => handleRemovePart(p.partId)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', marginLeft: '0.5rem' }}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </td>
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

            {/* === PAINEL DE APROVAÇÃO (Alçadas) — Somente Admin === */}
            {status === 'Aguardando Aprovação' && user?.role === 'ADMIN' && (
              <div style={{ padding: '1.5rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '2px solid #f59e0b', borderRadius: '12px', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
                  <ShieldAlert size={20} /> Aprovação de Custo Necessária
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  O custo deste chamado ultrapassou <strong>R$ {APPROVAL_COST_THRESHOLD.toFixed(2)}</strong>.
                  Custo atual: <strong style={{ color: 'var(--danger-color)' }}>R$ {(demand.totalCost || partsUsed.reduce((a, p) => a + p.totalCost, 0)).toFixed(2)}</strong>
                </p>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Motivo (caso reprove)</label>
                  <input type="text" className="form-control" placeholder="Ex: Orçamento excedido para este mês" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-primary" onClick={handleApprove} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ThumbsUp size={18} /> Aprovar
                  </button>
                  <button className="btn btn-outline" onClick={handleReject} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}>
                    <ThumbsDown size={18} /> Reprovar
                  </button>
                </div>
              </div>
            )}

            {/* Aviso para Técnico quando aguardando aprovação */}
            {status === 'Aguardando Aprovação' && user?.role === 'TECNICO' && (
              <div style={{ padding: '1.5rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px dashed #f59e0b', borderRadius: '12px', marginBottom: '2rem', textAlign: 'center' }}>
                <ShieldAlert size={32} color="#f59e0b" style={{ marginBottom: '0.5rem' }} />
                <h3 style={{ fontSize: '1rem', color: '#f59e0b' }}>Aguardando Aprovação do Administrador</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  O custo do reparo excedeu o limite. Você será notificado assim que o Admin aprovar.
                </p>
              </div>
            )}

            {/* Exibição de Reprovação */}
            {status === 'Reprovado' && demand.rejectionReason && (
              <div style={{ padding: '1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', borderRadius: '12px', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--danger-color)', marginBottom: '0.5rem' }}>❌ Chamado Reprovado</h3>
                <p style={{ fontSize: '0.9rem' }}>Motivo: <em>{demand.rejectionReason}</em></p>
              </div>
            )}

            {/* Exibição de Aprovação Concedida */}
            {demand.approvedByAdmin && demand.approvedAt && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.85rem', color: '#10b981' }}>
                ✅ Aprovado por <strong>{demand.approvedByName}</strong> em {format(new Date(demand.approvedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </div>
            )}

            {canEditStatus && status !== 'Concluído' && status !== 'Aguardando Aprovação' && status !== 'Reprovado' && !showSignature && (
              <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Gerenciar Solicitação</h3>
                <div className="form-group">
                  <label className="form-label">Atualizar Status</label>
                  <select className="form-control" value={status} onChange={handleStatusChange}>
                    <option value="Pendente">Pendente</option>
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
                  <button className="btn btn-primary" onClick={handleCompleteWithSignature} disabled={isConcluding}>
                    <CheckCircle size={18}/> {isConcluding ? 'Processando...' : 'Concluir Chamado'}
                  </button>
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
              {localComments.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: 'auto', fontSize: '0.9rem' }}>Nenhuma atualização registrada.</p>
              ) : (
                localComments.map(c => {
                  let formattedDate = '';
                  try {
                    formattedDate = format(new Date(c.createdAt), "dd/MM HH:mm");
                  } catch (e) {
                    formattedDate = 'Data inválida';
                  }
                  return (
                    <div key={c.id} style={{ backgroundColor: 'var(--surface-color)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary-color)' }}>{c.authorName}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formattedDate}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', margin: 0, whiteSpace: 'pre-wrap' }}>{c.text}</p>
                    </div>
                  );
                })
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
