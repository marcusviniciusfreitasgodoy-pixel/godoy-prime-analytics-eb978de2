/**
 * Helpers de máscara para inputs em R$ (sem casas decimais).
 * - Estado interno: string apenas com dígitos ("1234567")
 * - Display: "R$ 1.234.567"
 */

export function digitsOnly(value: string): string {
  return (value || "").replace(/\D/g, "");
}

export function formatBRLDisplay(digits: string | number | null | undefined): string {
  if (digits === null || digits === undefined || digits === "") return "";
  const n = typeof digits === "number" ? digits : Number(digitsOnly(String(digits)));
  if (!isFinite(n) || n <= 0) return "";
  return `R$ ${n.toLocaleString("pt-BR")}`;
}

/** Recebe valor digitado no input e devolve apenas dígitos para guardar no estado. */
export function parseBRLInput(input: string): string {
  return digitsOnly(input);
}