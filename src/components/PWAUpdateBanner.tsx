import { useState, useEffect } from 'react';
import { RefreshCw, X, Smartphone } from 'lucide-react';
import { Button } from './ui/button';

interface PWAUpdateBannerProps {
  onUpdate: () => void;
}

export const PWAUpdateBanner = ({ onUpdate }: PWAUpdateBannerProps) => {
  const [showBanner, setShowBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleNeedRefresh = () => {
      console.log('[PWAUpdateBanner] Nova versão detectada');
      setShowBanner(true);
      setDismissed(false);
    };

    const handleUpdateStart = () => {
      setIsUpdating(true);
    };

    const handleUpdateComplete = () => {
      setIsUpdating(false);
      setShowBanner(false);
    };

    window.addEventListener('sw-need-refresh', handleNeedRefresh);
    window.addEventListener('sw-update-start', handleUpdateStart);
    window.addEventListener('sw-update-complete', handleUpdateComplete);

    return () => {
      window.removeEventListener('sw-need-refresh', handleNeedRefresh);
      window.removeEventListener('sw-update-start', handleUpdateStart);
      window.removeEventListener('sw-update-complete', handleUpdateComplete);
    };
  }, []);

  const handleUpdate = () => {
    setIsUpdating(true);
    onUpdate();
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Show minimized reminder if dismissed but update still available
  if (dismissed && showBanner) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="fixed bottom-20 right-4 z-[9998] bg-primary text-primary-foreground p-3 rounded-full shadow-lg animate-pulse hover:scale-105 transition-transform"
        aria-label="Nova versão disponível"
      >
        <RefreshCw className="h-5 w-5" />
      </button>
    );
  }

  if (!showBanner || isUpdating) {
    return isUpdating ? (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-primary text-primary-foreground py-3 px-4 flex items-center justify-center gap-2 shadow-lg">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">Atualizando...</span>
      </div>
    ) : null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-gradient-to-r from-primary to-primary/90 text-primary-foreground p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] safe-area-pb">
      <div className="max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <div className="bg-primary-foreground/20 p-2 rounded-full shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Nova versão disponível!</h3>
            <p className="text-xs text-primary-foreground/80 mt-0.5">
              Atualize agora para ter acesso às últimas melhorias e correções.
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-primary-foreground/10 rounded-full transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            onClick={handleUpdate}
            size="sm"
            variant="secondary"
            className="flex-1 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-medium"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Agora
          </Button>
          
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            Depois
          </Button>
        </div>
      </div>
    </div>
  );
};
