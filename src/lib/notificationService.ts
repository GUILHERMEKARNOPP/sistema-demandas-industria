/**
 * Serviço de Notificações Push Nativas
 * 
 * Utiliza a API nativa do navegador (Notification API) para enviar alertas
 * no estilo Instagram/WhatsApp diretamente na tela do usuário, mesmo
 * quando a aba do sistema está em segundo plano.
 */

// Solicita permissão de notificação ao usuário
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações push.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Verifica se as notificações estão habilitadas
export const isNotificationEnabled = (): boolean => {
  return 'Notification' in window && Notification.permission === 'granted';
};

// Tipos de eventos de notificação
export type NotificationType = 
  | 'novo_chamado'
  | 'status_alterado'
  | 'novo_comentario'
  | 'aprovacao_pendente'
  | 'aprovacao_concedida'
  | 'aprovacao_recusada'
  | 'chamado_concluido';

interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

// Configurações por tipo de notificação
const getNotificationConfig = (
  type: NotificationType,
  data: Record<string, string>
): NotificationConfig => {
  const icon = 'https://cdn-icons-png.flaticon.com/512/10435/10435165.png';

  switch (type) {
    case 'novo_chamado':
      return {
        title: '🔧 Novo Chamado de Manutenção',
        body: `${data.requester} abriu: "${data.title}" — Prioridade: ${data.priority}`,
        icon,
        tag: `chamado-${data.id}`,
        requireInteraction: data.priority === 'Crítica' || data.priority === 'Alta',
      };

    case 'status_alterado':
      return {
        title: '🔄 Status Atualizado',
        body: `Chamado "${data.title}" agora está: ${data.status}`,
        icon,
        tag: `status-${data.id}`,
      };

    case 'novo_comentario':
      return {
        title: '💬 Nova Mensagem no Chamado',
        body: `${data.author} comentou em "${data.title}"`,
        icon,
        tag: `comment-${data.id}`,
      };

    case 'aprovacao_pendente':
      return {
        title: '⚠️ Aprovação Necessária!',
        body: `Chamado "${data.title}" — Custo estimado: R$ ${data.cost}. Aprovação do Admin necessária.`,
        icon,
        tag: `approval-${data.id}`,
        requireInteraction: true,
      };

    case 'aprovacao_concedida':
      return {
        title: '✅ Aprovação Concedida',
        body: `O Admin aprovou o chamado "${data.title}". Prossiga com o reparo!`,
        icon,
        tag: `approved-${data.id}`,
        requireInteraction: true,
      };

    case 'aprovacao_recusada':
      return {
        title: '❌ Aprovação Recusada',
        body: `O Admin recusou o chamado "${data.title}". Motivo: ${data.reason || 'Não informado'}`,
        icon,
        tag: `rejected-${data.id}`,
        requireInteraction: true,
      };

    case 'chamado_concluido':
      return {
        title: '🎉 Chamado Concluído!',
        body: `O reparo "${data.title}" foi finalizado. Avalie o atendimento!`,
        icon,
        tag: `done-${data.id}`,
      };

    default:
      return {
        title: 'OptimaManutenção',
        body: 'Você tem uma nova atualização.',
        icon,
      };
  }
};

/**
 * Envia uma notificação push nativa ao usuário.
 * 
 * @param type - Tipo do evento de notificação
 * @param data - Dados dinâmicos para preencher a mensagem
 * @param onClick - Callback opcional quando o usuário clica na notificação
 */
export const sendPushNotification = (
  type: NotificationType,
  data: Record<string, string>,
  onClick?: () => void
): void => {
  if (!isNotificationEnabled()) return;

  const config = getNotificationConfig(type, data);

  const notification = new Notification(config.title, {
    body: config.body,
    icon: config.icon,
    tag: config.tag, // Evita duplicatas do mesmo chamado
    requireInteraction: config.requireInteraction || false,
    silent: false,
  });

  if (onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }

  // Auto-fechar após 8 segundos (exceto as que requerem interação)
  if (!config.requireInteraction) {
    setTimeout(() => notification.close(), 8000);
  }
};

/**
 * Emite um som curto de notificação (beep) usando Web Audio API.
 */
export const playNotificationSound = (): void => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 880; // Nota Lá (A5)
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1; // Volume baixo

    oscillator.start();

    // Fade out suave
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch {
    // Ignora silenciosamente se o audio não estiver disponível
  }
};
