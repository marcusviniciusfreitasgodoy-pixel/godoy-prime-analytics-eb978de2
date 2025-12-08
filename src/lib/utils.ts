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

// Gera variações fuzzy de um termo de busca (letras duplicadas/simples)
export function generateFuzzyVariations(term: string): string[] {
  const variations: string[] = [term];
  const upperTerm = term.toUpperCase();
  
  // Correções conhecidas
  const corrections: Record<string, string> = {
    'ESTELITA': 'ESTELLITA',
    'ESTELLITA': 'ESTELITA',
  };
  
  // Aplicar correção conhecida se existir
  Object.entries(corrections).forEach(([from, to]) => {
    if (upperTerm.includes(from)) {
      const corrected = upperTerm.replace(new RegExp(from, 'g'), to);
      if (!variations.includes(corrected)) variations.push(corrected);
    }
  });
  
  // Padrões de letras que frequentemente são duplicadas
  const duplicatePatterns = [
    { single: 'L', double: 'LL' },
    { single: 'R', double: 'RR' },
    { single: 'S', double: 'SS' },
    { single: 'T', double: 'TT' },
    { single: 'N', double: 'NN' },
  ];
  
  duplicatePatterns.forEach(({ single, double }) => {
    // Adicionar variação com letra duplicada
    if (upperTerm.includes(single) && !upperTerm.includes(double)) {
      const withDouble = upperTerm.replace(new RegExp(single, 'g'), double);
      if (!variations.includes(withDouble)) variations.push(withDouble);
    }
    // Adicionar variação com letra simples
    if (upperTerm.includes(double)) {
      const withSingle = upperTerm.replace(new RegExp(double, 'g'), single);
      if (!variations.includes(withSingle)) variations.push(withSingle);
    }
  });
  
  return variations;
}
