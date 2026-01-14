import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

import { registerSW } from "virtual:pwa-register";

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
