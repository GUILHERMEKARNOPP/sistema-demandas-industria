import { useState, useEffect } from 'react';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Impede o Chrome 67 e anteriores de mostrar automaticamente o prompt
      e.preventDefault();
      // Salva o evento para que possa ser acionado mais tarde.
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;

    // Mostra o prompt de instalação
    deferredPrompt.prompt();

    // Aguarda a resposta do usuário
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Usuário aceitou a instalação do PWA');
    } else {
      console.log('Usuário recusou a instalação do PWA');
    }

    // Limpa o prompt para que só possa ser usado uma vez
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return { isInstallable, installPWA };
};
