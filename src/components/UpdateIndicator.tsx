import { useState, useEffect } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { Button } from './ui/button';

declare const __BUILD_TIMESTAMP__: string;

export const UpdateIndicator = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showVersionInfo, setShowVersionInfo] = useState(false);

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

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Unregister service worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
    
    // Force reload
    window.location.reload();
  };

  // Show version info button in corner for debugging
  const buildVersion = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : 'dev';

  return (
    <>
      {isUpdating && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-primary text-primary-foreground py-2 px-4 flex items-center justify-center gap-2 shadow-lg animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Atualizando para nova versão...</span>
        </div>
      )}
      
      {/* Version indicator - tap to force update */}
      <button
        onClick={() => setShowVersionInfo(!showVersionInfo)}
        className="fixed bottom-2 right-2 z-50 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        v{buildVersion}
      </button>
      
      {showVersionInfo && (
        <div className="fixed bottom-10 right-2 z-50 bg-popover border rounded-lg shadow-lg p-3 text-xs space-y-2">
          <p className="text-muted-foreground">Versão: {buildVersion}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleForceUpdate}
            className="w-full gap-1"
          >
            <Download className="h-3 w-3" />
            Forçar Atualização
          </Button>
        </div>
      )}
    </>
  );
};
