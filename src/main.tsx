import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";
import { generateTestChecklistPDF } from "./utils/testChecklistPdf";

// Expose PDF generator globally for easy access
(window as any).gerarChecklistPDF = generateTestChecklistPDF;

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
