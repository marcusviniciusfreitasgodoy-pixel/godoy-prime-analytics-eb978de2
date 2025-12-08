import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Detecta se o logradouro é um código técnico (PAA, PAL, PLT, AVN)
export function isTechnicalCode(logradouro: string): boolean {
  if (!logradouro) return false;
  const patterns = [
    /PAA\s*\d+/i,
    /PAL\s*\d+/i,
    /PLT\s*\d+/i,
    /AVN\s*\d+\s*PAA/i,
    /^AVN\s*\d+/i,
  ];
  return patterns.some(pattern => pattern.test(logradouro));
}

// Extrai código simplificado do logradouro técnico
export function extractSimplifiedCode(logradouro: string): string {
  if (!logradouro) return logradouro;
  
  // Extrair PAA ou PAL principal
  const paaMatch = logradouro.match(/PAA\s*(\d+)/i);
  const palMatch = logradouro.match(/PAL\s*(\d+)/i);
  
  if (paaMatch && palMatch) {
    return `PAA ${paaMatch[1]} / PAL ${palMatch[1]}`;
  } else if (paaMatch) {
    return `PAA ${paaMatch[1]}`;
  } else if (palMatch) {
    return `PAL ${palMatch[1]}`;
  }
  
  return logradouro;
}

// Formata o logradouro para exibição, retornando info sobre condomínio quando disponível
export interface FormattedLogradouro {
  displayName: string;
  isCondominio: boolean;
  condominioNome?: string;
  codigoTecnico?: string;
}
