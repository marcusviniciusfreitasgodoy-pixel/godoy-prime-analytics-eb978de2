import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

// Ensures PWA clients pick up the newest version instead of staying on a stale cached bundle.
// In dev, the PWA is disabled via VitePWA devOptions.
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
  onNeedRefresh() {
    // Force update + reload to avoid users seeing older UI strings/data labels.
    // (This can happen when a Service Worker cached an older build.)
    const shouldReload = window.confirm(
      "Uma nova versão está disponível. Atualizar agora?"
    );
    if (shouldReload) {
      window.location.reload();
    }
  },
});

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
