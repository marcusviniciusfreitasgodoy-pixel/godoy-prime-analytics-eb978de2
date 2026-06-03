/**
 * Retorna sempre a URL pública de produção quando o app está rodando fora
 * de um ambiente local de desenvolvimento. Evita que links enviados a
 * clientes (WhatsApp, email, PDFs) usem domínios de preview da Lovable.
 */
const PRODUCTION_URL = "https://analytics.godoyprime.com.br";

export function getPublicAppUrl(): string {
  if (typeof window === "undefined") return PRODUCTION_URL;

  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local");

  if (isLocal) return window.location.origin;

  return PRODUCTION_URL;
}