// Limites absolutos de R$/m² por bairro usados como cinto de segurança antes
// de qualquer estatística. FONTE ÚNICA para o app (src/lib/outlierLimits.ts
// reexporta este arquivo) e para as edge functions (import relativo).
//
// Os tetos são o superconjunto das tabelas que existiam espalhadas pelos
// hooks. Os pisos foram calibrados ~20% abaixo do P5 real de cada bairro para
// não descartar anos inteiros de bairros de ticket menor. Recalibrar com a
// consulta 7.4 de docs/auditoria-motor-avaliacao.md (P1/P99 por bairro).
//
// Sem dependências: precisa rodar em Deno e no navegador.

export const DEFAULT_OUTLIER_MAX = 60000;
export const DEFAULT_OUTLIER_MIN = 2500;

const OUTLIER_MAX_LIMITS: Record<string, number> = {
  "BARRA DA TIJUCA": 40000,
  "RECREIO DOS BANDEIRANTES": 35000,
  LEBLON: 80000,
  IPANEMA: 70000,
  LAGOA: 50000,
  "JARDIM BOTANICO": 50000,
  GAVEA: 50000,
  COPACABANA: 40000,
  BOTAFOGO: 40000,
  FLAMENGO: 35000,
  LARANJEIRAS: 35000,
  HUMAITA: 40000,
  TIJUCA: 30000,
  "VILA ISABEL": 25000,
  GRAJAU: 20000,
  MEIER: 20000,
  JACAREPAGUA: 25000,
  "FREGUESIA (JACAREPAGUA)": 25000,
  TAQUARA: 20000,
  PECHINCHA: 20000,
};

const OUTLIER_MIN_LIMITS: Record<string, number> = {
  "BARRA DA TIJUCA": 5000,
  "RECREIO DOS BANDEIRANTES": 3800,
  LEBLON: 10000,
  IPANEMA: 7500,
  LAGOA: 8000,
  "JARDIM BOTANICO": 7000,
  GAVEA: 7000,
  COPACABANA: 5500,
  BOTAFOGO: 5500,
  FLAMENGO: 5500,
  LARANJEIRAS: 5000,
  HUMAITA: 5500,
  TIJUCA: 3000,
};

/** Normaliza o nome do bairro: maiúsculas, sem acentos, espaços colapsados. */
export const normalizeBairro = (bairro: string | null | undefined): string =>
  (bairro || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

/** Teto de R$/m² aceito para o bairro (acima disso a linha é descartada). */
export const getOutlierLimit = (bairro: string | null | undefined): number =>
  OUTLIER_MAX_LIMITS[normalizeBairro(bairro)] ?? DEFAULT_OUTLIER_MAX;

/** Piso de R$/m² aceito para o bairro (abaixo disso a linha é descartada). */
export const getOutlierMinLimit = (bairro: string | null | undefined): number =>
  OUTLIER_MIN_LIMITS[normalizeBairro(bairro)] ?? DEFAULT_OUTLIER_MIN;

export const getOutlierLimits = (bairro: string | null | undefined): { piso: number; teto: number } => ({
  piso: getOutlierMinLimit(bairro),
  teto: getOutlierLimit(bairro),
});
