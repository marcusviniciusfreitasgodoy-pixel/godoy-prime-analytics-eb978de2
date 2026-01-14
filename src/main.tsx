import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

// Ensures PWA clients pick up the newest version instead of staying on a stale cached bundle.
// In dev, the PWA is disabled via VitePWA devOptions.
import { registerSW } from "virtual:pwa-register";

// Force immediate update without asking user - prevents stale cache issues
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Dispatch event to show update indicator
    console.log('[PWA] Nova versão detectada, atualizando automaticamente...');
    window.dispatchEvent(new CustomEvent('sw-update-start'));
    
    // Small delay to ensure indicator is visible before reload
    setTimeout(() => {
      updateSW(true); // Accept the update
    }, 500);
  },
  onOfflineReady() {
    console.log('[PWA] App pronto para uso offline');
    window.dispatchEvent(new CustomEvent('sw-update-complete'));
  },
  onRegisteredSW(swUrl, registration) {
    // Check for updates every 5 minutes
    if (registration) {
      setInterval(() => {
        console.log('[PWA] Verificando atualizações...');
        registration.update();
      }, 5 * 60 * 1000);
    }
  },
});

// Clear any stale caches on startup
if ('caches' in window) {
  caches.keys().then(names => {
    // Only clear old workbox caches, not fonts
    names.forEach(name => {
      if (name.includes('workbox') && !name.includes('fonts')) {
        console.log('[Cache] Limpando cache antigo:', name);
        caches.delete(name);
      }
    });
  });
}

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
