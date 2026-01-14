import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

// Ensures PWA clients pick up the newest version instead of staying on a stale cached bundle.
// In dev, the PWA is disabled via VitePWA devOptions.
import { registerSW } from "virtual:pwa-register";

// Clear ALL caches on startup to force fresh content
const clearAllCaches = async () => {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    console.log('[PWA] Limpando caches:', cacheNames);
    await Promise.all(
      cacheNames.map(name => {
        // Keep only font caches
        if (!name.includes('fonts')) {
          console.log('[Cache] Removendo:', name);
          return caches.delete(name);
        }
        return Promise.resolve();
      })
    );
  }
};

// Force immediate update without asking user - prevents stale cache issues
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] Nova versão detectada, atualizando automaticamente...');
    window.dispatchEvent(new CustomEvent('sw-update-start'));
    
    // Clear caches before updating
    clearAllCaches().then(() => {
      // Small delay to ensure indicator is visible before reload
      setTimeout(() => {
        updateSW(true); // Accept the update
        // Force hard reload after update
        window.location.reload();
      }, 500);
    });
  },
  onOfflineReady() {
    console.log('[PWA] App pronto para uso offline');
    window.dispatchEvent(new CustomEvent('sw-update-complete'));
  },
  onRegisteredSW(swUrl, registration) {
    // Check for updates more frequently - every 5 minutes
    if (registration) {
      // Check immediately on registration
      registration.update();
      
      setInterval(() => {
        console.log('[PWA] Verificando atualizações...');
        registration.update();
      }, 5 * 60 * 1000); // 5 minutes instead of 24 hours
    }
  },
  onRegisterError(error) {
    console.error('[PWA] Erro no registro:', error);
  },
});

// Clear stale caches on every page load
clearAllCaches();

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
