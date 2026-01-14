import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export const UpdateIndicator = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleUpdateStart = () => {
      console.log('[UpdateIndicator] Atualização iniciada');
      setIsUpdating(true);
    };

    const handleUpdateComplete = () => {
      console.log('[UpdateIndicator] Atualização completa');
      setIsUpdating(false);
    };

    window.addEventListener('sw-update-start', handleUpdateStart);
    window.addEventListener('sw-update-complete', handleUpdateComplete);

    return () => {
      window.removeEventListener('sw-update-start', handleUpdateStart);
      window.removeEventListener('sw-update-complete', handleUpdateComplete);
    };
  }, []);

  if (!isUpdating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-primary text-primary-foreground py-2 px-4 flex items-center justify-center gap-2 shadow-lg animate-pulse">
      <RefreshCw className="h-4 w-4 animate-spin" />
      <span className="text-sm font-medium">Atualizando para nova versão...</span>
    </div>
  );
};
