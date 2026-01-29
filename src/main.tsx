import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

import { registerSW } from "virtual:pwa-register";

declare const __BUILD_TIMESTAMP__: string;

// Store the update function globally so components can trigger updates
let triggerUpdate: (() => void) | null = null;

// Clear ALL caches on startup to force fresh content
const clearAllCaches = async () => {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    console.log('[PWA] Limpando caches:', cacheNames);
    await Promise.all(
      cacheNames.map(name => {
        if (!name.includes('fonts')) {
          console.log('[Cache] Removendo:', name);
          return caches.delete(name);
        }
        return Promise.resolve();
      })
    );
  }
};

// Register SW with manual update prompt instead of auto-update
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] Nova versão detectada, aguardando ação do usuário...');
    // Dispatch event for the banner component
    window.dispatchEvent(new CustomEvent('sw-need-refresh'));
  },
  onOfflineReady() {
    console.log('[PWA] App pronto para uso offline');
    window.dispatchEvent(new CustomEvent('sw-update-complete'));
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Check immediately on registration
      registration.update();
      
      // Check for updates every 5 minutes
      setInterval(() => {
        console.log('[PWA] Verificando atualizações...');
        registration.update();
      }, 5 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.error('[PWA] Erro no registro:', error);
  },
});

/**
 * No ambiente de preview do Lovable, é comum o Service Worker/cache manter uma build antiga.
 * Para evitar confusão durante o desenvolvimento, forçamos uma atualização/limpeza uma vez
 * por build no domínio `id-preview--*.lovable.app`.
 */
const isLovablePreview =
  window.location.hostname.startsWith('id-preview--') ||
  window.location.hostname.includes('.lovableproject.com');

const buildVersion = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : 'dev';
const PREVIEW_BUILD_KEY = '__lovable_preview_build__';

if (isLovablePreview) {
  const lastPreviewBuild = localStorage.getItem(PREVIEW_BUILD_KEY);

  if (lastPreviewBuild !== buildVersion) {
    console.log('[Preview] Build nova detectada. Limpando SW/cache para evitar versão antiga.', {
      lastPreviewBuild,
      buildVersion,
    });

    localStorage.setItem(PREVIEW_BUILD_KEY, buildVersion);

    // Executar de forma assíncrona para não bloquear o render inicial.
    (async () => {
      try {
        await clearAllCaches();

        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }

        // Garante que a navegação vai buscar os assets mais recentes.
        updateSW(true);
      } catch (e) {
        console.warn('[Preview] Falha ao limpar SW/cache:', e);
      } finally {
        window.location.reload();
      }
    })();
  }
}

// Export function to trigger update from components
triggerUpdate = async () => {
  console.log('[PWA] Usuário solicitou atualização');
  window.dispatchEvent(new CustomEvent('sw-update-start'));
  
  await clearAllCaches();
  
  // Accept the update and reload
  setTimeout(() => {
    updateSW(true);
    window.location.reload();
  }, 300);
};

// Make triggerUpdate available globally
(window as any).__pwaUpdate = triggerUpdate;

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  );
}
