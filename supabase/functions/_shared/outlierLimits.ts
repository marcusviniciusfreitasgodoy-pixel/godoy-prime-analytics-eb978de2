// Limites absolutos de R$/m² por bairro × tipologia usados como cinto de
// segurança antes da estatística do motor. FONTE ÚNICA para o app
// (src/lib/outlierLimits.ts reexporta este arquivo) e para as edge functions.
//
// CALIBRAÇÃO GLOBAL ATUALIZADA EM 2026-09-03: janela móvel de 3 anos e
// percentis ponderados por total_transacoes. Para preservar transações
// legítimas no extremo superior, o teto usa P99,5 ponderado × 1,15; o piso
// continua P1 ponderado × 0,85. Em 2026-09-03 (2ª rodada) os pares que antes
// estavam no fallback de 5 anos por não atingirem 100 escrituras foram
// recalibrados em 3 anos com a amostra disponível (55 a 114 escrituras).
// Permanecem em 5 anos apenas os 6 pares sem NENHUMA escritura na janela
// de 3 anos (Agua Santa, Bras de Pina, Colegio, Freguesia (Jacarepagua) Casa,
// Inhoaiba e Santo Cristo).
// Regenerar com a consulta 7.4 de docs/calibracao-consultas.sql quando a base mudar.

//
// Sem dependências: precisa rodar em Deno e no navegador.

export interface OutlierLimitEntry {
  piso: number;
  teto: number;
  p1: number;
  p99: number;
  escrituras: number;
  janela?: "3 anos" | "5 anos";
}

/** Usados quando o bairro não tem calibração (P1 e P99 da cidade, com margem). */
export const DEFAULT_OUTLIER_MIN = 1000;
export const DEFAULT_OUTLIER_MAX = 60000;
export const PISO_MARGIN = 0.85;
export const TETO_MARGIN = 1.15;

/** Chave: "BAIRRO NORMALIZADO|Tipologia" (Apartamento | Casa). */
export const OUTLIER_LIMITS_TABLE: Record<string, OutlierLimitEntry> = {
  "AGUA SANTA|Apartamento": { piso: 1856, teto: 5206, p1: 2183, p99: 4527, escrituras: 123, janela: "5 anos" },
  "ANDARAI|Apartamento": { piso: 2139, teto: 7766, p1: 2517, p99: 6753, escrituras: 537, janela: "3 anos" },
  "ANIL|Apartamento": { piso: 3053, teto: 6955, p1: 3592, p99: 6048, escrituras: 371, janela: "3 anos" },
  "BANGU|Casa": { piso: 1012, teto: 3979, p1: 1191, p99: 3460, escrituras: 88, janela: "3 anos" },
  "BARRA DA TIJUCA|Apartamento": { piso: 5239, teto: 23852, p1: 6164, p99: 20741, escrituras: 5956, janela: "3 anos" },
  "BARRA DA TIJUCA|Casa": { piso: 4374, teto: 13561, p1: 5146, p99: 11792, escrituras: 156, janela: "3 anos" },
  "BARRA OLIMPICA|Apartamento": { piso: 4814, teto: 11003, p1: 5663, p99: 9568, escrituras: 411, janela: "3 anos" },
  "BONSUCESSO|Apartamento": { piso: 1818, teto: 5779, p1: 2139, p99: 5025, escrituras: 137, janela: "3 anos" },
  "BOTAFOGO|Apartamento": { piso: 6352, teto: 22770, p1: 7473, p99: 19800, escrituras: 2456, janela: "3 anos" },
  "BRAS DE PINA|Apartamento": { piso: 1788, teto: 5579, p1: 2104, p99: 4851, escrituras: 108, janela: "5 anos" },
  "CACHAMBI|Apartamento": { piso: 2458, teto: 8378, p1: 2892, p99: 7285, escrituras: 802, janela: "3 anos" },
  "CAMORIM|Apartamento": { piso: 4260, teto: 11520, p1: 5012, p99: 10017, escrituras: 1730, janela: "3 anos" },
  "CAMPO DOS AFONSOS|Apartamento": { piso: 2263, teto: 5134, p1: 2662, p99: 4464, escrituras: 154, janela: "3 anos" },
  "CAMPO GRANDE|Apartamento": { piso: 1870, teto: 5660, p1: 2200, p99: 4922, escrituras: 1228, janela: "3 anos" },
  "CAMPO GRANDE|Casa": { piso: 1173, teto: 3748, p1: 1380, p99: 3259, escrituras: 311, janela: "3 anos" },
  "CATETE|Apartamento": { piso: 4959, teto: 14537, p1: 5834, p99: 12641, escrituras: 538, janela: "3 anos" },
  "CENTRO|Apartamento": { piso: 3442, teto: 11150, p1: 4050, p99: 9696, escrituras: 91, janela: "3 anos" },
  "COLEGIO|Apartamento": { piso: 2049, teto: 4717, p1: 2411, p99: 4102, escrituras: 174, janela: "5 anos" },
  "COPACABANA|Apartamento": { piso: 5189, teto: 26609, p1: 6105, p99: 23138, escrituras: 6343, janela: "3 anos" },
  "CURICICA|Apartamento": { piso: 3111, teto: 8580, p1: 3660, p99: 7461, escrituras: 243, janela: "3 anos" },
  "DEL CASTILHO|Apartamento": { piso: 3481, teto: 6987, p1: 4095, p99: 6076, escrituras: 421, janela: "3 anos" },
  "ENGENHO DE DENTRO|Apartamento": { piso: 1635, teto: 7038, p1: 1923, p99: 6120, escrituras: 497, janela: "3 anos" },
  "ENGENHO NOVO|Apartamento": { piso: 2031, teto: 5265, p1: 2389, p99: 4578, escrituras: 200, janela: "3 anos" },
  "FLAMENGO|Apartamento": { piso: 6264, teto: 18073, p1: 7369, p99: 15716, escrituras: 428, janela: "3 anos" },
  "FREGUESIA (ILHA)|Apartamento": { piso: 2291, teto: 6484, p1: 2695, p99: 5638, escrituras: 98, janela: "3 anos" },
  "FREGUESIA (JACAREPAGUA)|Apartamento": { piso: 2958, teto: 7900, p1: 3480, p99: 6870, escrituras: 1537, janela: "3 anos" },
  "FREGUESIA (JACAREPAGUA)|Casa": { piso: 1355, teto: 5757, p1: 1594, p99: 5006, escrituras: 112, janela: "5 anos" },
  "GAVEA|Apartamento": { piso: 8306, teto: 26463, p1: 9772, p99: 23011, escrituras: 438, janela: "3 anos" },
  "GLORIA|Apartamento": { piso: 5250, teto: 13511, p1: 6176, p99: 11749, escrituras: 129, janela: "3 anos" },
  "GRAJAU|Apartamento": { piso: 1822, teto: 7492, p1: 2143, p99: 6515, escrituras: 432, janela: "3 anos" },
  "GUARATIBA|Casa": { piso: 1293, teto: 3051, p1: 1521, p99: 2653, escrituras: 111, janela: "3 anos" },
  "HUMAITA|Apartamento": { piso: 7585, teto: 24103, p1: 8923, p99: 20959, escrituras: 297, janela: "3 anos" },
  "INHOAIBA|Apartamento": { piso: 1684, teto: 3609, p1: 1981, p99: 3138, escrituras: 171, janela: "5 anos" },
  "IPANEMA|Apartamento": { piso: 7744, teto: 48073, p1: 9111, p99: 41803, escrituras: 2069, janela: "3 anos" },
  "IRAJA|Apartamento": { piso: 2060, teto: 6657, p1: 2423, p99: 5789, escrituras: 564, janela: "3 anos" },
  "JACAREPAGUA|Apartamento": { piso: 4048, teto: 10770, p1: 4762, p99: 9365, escrituras: 3709, janela: "3 anos" },
  "JARDIM BOTANICO|Apartamento": { piso: 7021, teto: 24080, p1: 8260, p99: 20939, escrituras: 337, janela: "3 anos" },
  "JARDIM GUANABARA|Apartamento": { piso: 2699, teto: 8264, p1: 3175, p99: 7186, escrituras: 310, janela: "3 anos" },
  "JARDIM SULACAP|Apartamento": { piso: 1913, teto: 5440, p1: 2251, p99: 4730, escrituras: 102, janela: "3 anos" },
  "LAGOA|Apartamento": { piso: 8401, teto: 29512, p1: 9883, p99: 25663, escrituras: 476, janela: "3 anos" },
  "LARANJEIRAS|Apartamento": { piso: 4904, teto: 19724, p1: 5770, p99: 17151, escrituras: 888, janela: "3 anos" },
  "LEBLON|Apartamento": { piso: 11192, teto: 59408, p1: 13167, p99: 51659, escrituras: 1428, janela: "3 anos" },
  "LEME|Apartamento": { piso: 7597, teto: 20649, p1: 8938, p99: 17956, escrituras: 384, janela: "3 anos" },
  "LINS DE VASCONCELOS|Apartamento": { piso: 2155, teto: 7036, p1: 2535, p99: 6118, escrituras: 177, janela: "3 anos" },
  "MADUREIRA|Apartamento": { piso: 1624, teto: 5958, p1: 1911, p99: 5181, escrituras: 71, janela: "3 anos" },
  "MARACANA|Apartamento": { piso: 3704, teto: 11991, p1: 4358, p99: 10427, escrituras: 746, janela: "3 anos" },
  "MARECHAL HERMES|Apartamento": { piso: 1869, teto: 5600, p1: 2199, p99: 4870, escrituras: 114, janela: "3 anos" },
  "MEIER|Apartamento": { piso: 2366, teto: 7644, p1: 2784, p99: 6647, escrituras: 602, janela: "3 anos" },
  "OLARIA|Apartamento": { piso: 2077, teto: 6033, p1: 2443, p99: 5246, escrituras: 112, janela: "3 anos" },
  "PARADA DE LUCAS|Apartamento": { piso: 1556, teto: 6210, p1: 1830, p99: 5400, escrituras: 129, janela: "3 anos" },
  "PECHINCHA|Apartamento": { piso: 2818, teto: 5929, p1: 3315, p99: 5156, escrituras: 918, janela: "3 anos" },
  "PENHA CIRCULAR|Apartamento": { piso: 1922, teto: 4685, p1: 2261, p99: 4074, escrituras: 110, janela: "3 anos" },
  "PENHA|Apartamento": { piso: 1836, teto: 6918, p1: 2160, p99: 6016, escrituras: 188, janela: "3 anos" },
  "PIEDADE|Apartamento": { piso: 1791, teto: 5150, p1: 2107, p99: 4478, escrituras: 81, janela: "3 anos" },
  "PRACA DA BANDEIRA|Apartamento": { piso: 3268, teto: 8305, p1: 3845, p99: 7222, escrituras: 104, janela: "3 anos" },
  "PRACA SECA|Apartamento": { piso: 1470, teto: 4257, p1: 1730, p99: 3702, escrituras: 410, janela: "3 anos" },
  "RAMOS|Apartamento": { piso: 2028, teto: 5766, p1: 2386, p99: 5014, escrituras: 88, janela: "3 anos" },
  "RECREIO DOS BANDEIRANTES|Apartamento": { piso: 3910, teto: 13516, p1: 4600, p99: 11753, escrituras: 3777, janela: "3 anos" },
  "RECREIO DOS BANDEIRANTES|Casa": { piso: 2550, teto: 7843, p1: 3000, p99: 6820, escrituras: 102, janela: "3 anos" },
  "RIACHUELO|Apartamento": { piso: 1968, teto: 6129, p1: 2315, p99: 5330, escrituras: 86, janela: "3 anos" },
  "RIO COMPRIDO|Apartamento": { piso: 2070, teto: 8366, p1: 2435, p99: 7275, escrituras: 145, janela: "3 anos" },
  "SANTA CRUZ|Apartamento": { piso: 1784, teto: 3724, p1: 2099, p99: 3238, escrituras: 146, janela: "3 anos" },
  "SANTA TERESA|Apartamento": { piso: 2971, teto: 8712, p1: 3495, p99: 7576, escrituras: 55, janela: "3 anos" },
  "SANTO CRISTO|Apartamento": { piso: 2908, teto: 9757, p1: 3421, p99: 8484, escrituras: 514, janela: "5 anos" },
  "SAO CONRADO|Apartamento": { piso: 6129, teto: 30167, p1: 7211, p99: 26232, escrituras: 271, janela: "3 anos" },
  "SAO CRISTOVAO|Apartamento": { piso: 3654, teto: 9776, p1: 4299, p99: 8501, escrituras: 101, janela: "3 anos" },
  "SAO FRANCISCO XAVIER|Apartamento": { piso: 2371, teto: 6351, p1: 2789, p99: 5523, escrituras: 391, janela: "3 anos" },
  "TANQUE|Apartamento": { piso: 2153, teto: 5827, p1: 2533, p99: 5067, escrituras: 118, janela: "3 anos" },
  "TAQUARA|Apartamento": { piso: 2224, teto: 6612, p1: 2617, p99: 5750, escrituras: 969, janela: "3 anos" },
  "TIJUCA|Apartamento": { piso: 2626, teto: 11446, p1: 3089, p99: 9953, escrituras: 3663, janela: "3 anos" },
  "TODOS OS SANTOS|Apartamento": { piso: 2673, teto: 7608, p1: 3145, p99: 6616, escrituras: 646, janela: "3 anos" },
  "VARGEM GRANDE|Apartamento": { piso: 3856, teto: 6929, p1: 4536, p99: 6025, escrituras: 132, janela: "3 anos" },
  "VARGEM PEQUENA|Apartamento": { piso: 3393, teto: 7185, p1: 3992, p99: 6248, escrituras: 139, janela: "3 anos" },
  "VARGEM PEQUENA|Casa": { piso: 1964, teto: 6052, p1: 2310, p99: 5263, escrituras: 92, janela: "3 anos" },
  "VICENTE DE CARVALHO|Apartamento": { piso: 2021, teto: 5810, p1: 2378, p99: 5052, escrituras: 88, janela: "3 anos" },
  "VILA DA PENHA|Apartamento": { piso: 2436, teto: 7214, p1: 2866, p99: 6273, escrituras: 275, janela: "3 anos" },
  "VILA ISABEL|Apartamento": { piso: 2358, teto: 8850, p1: 2774, p99: 7696, escrituras: 992, janela: "3 anos" },
  "VILA VALQUEIRE|Apartamento": { piso: 1805, teto: 6840, p1: 2123, p99: 5948, escrituras: 194, janela: "3 anos" },
};

/** Normaliza o nome do bairro: maiúsculas, sem acentos, espaços colapsados. */
export const normalizeBairro = (bairro: string | null | undefined): string =>
  (bairro || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

const normalizeTipologia = (tipologia: string | null | undefined): "Apartamento" | "Casa" | null => {
  const t = (tipologia || "").toLowerCase();
  if (!t) return null;
  if (t.includes("casa")) return "Casa";
  if (t.includes("apartamento") || t.includes("cobertura") || t.includes("flat")) return "Apartamento";
  return null;
};

const entriesForBairro = (bairro: string | null | undefined): OutlierLimitEntry[] => {
  const prefix = normalizeBairro(bairro) + "|";
  return Object.entries(OUTLIER_LIMITS_TABLE)
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => v);
};

/**
 * Piso e teto para o par bairro × tipologia. Sem par calibrado, usa a faixa
 * mais larga entre as tipologias do bairro; sem bairro calibrado, os padrões.
 */
export const getOutlierLimits = (
  bairro: string | null | undefined,
  tipologia?: string | null
): { piso: number; teto: number; calibrado: boolean } => {
  const tip = normalizeTipologia(tipologia);
  if (tip) {
    const exact = OUTLIER_LIMITS_TABLE[`${normalizeBairro(bairro)}|${tip}`];
    if (exact) return { piso: exact.piso, teto: exact.teto, calibrado: true };
  }
  const entries = entriesForBairro(bairro);
  if (entries.length > 0) {
    return {
      piso: Math.min(...entries.map((e) => e.piso)),
      teto: Math.max(...entries.map((e) => e.teto)),
      calibrado: true,
    };
  }
  return { piso: DEFAULT_OUTLIER_MIN, teto: DEFAULT_OUTLIER_MAX, calibrado: false };
};

/** Teto de R$/m² do bairro (maior entre as tipologias calibradas). */
export const getOutlierLimit = (bairro: string | null | undefined): number => getOutlierLimits(bairro).teto;

/** Piso de R$/m² do bairro (menor entre as tipologias calibradas). */
export const getOutlierMinLimit = (bairro: string | null | undefined): number => getOutlierLimits(bairro).piso;

/** Amostra mínima (escrituras) para calibrar piso e teto por logradouro. */
export const STREET_CALIBRATION_MIN_ESCRITURAS = 40;
export const STREET_CALIBRATION_MIN_LINHAS = 8;

interface WeightedValue { valor_m2: number | null; total_transacoes?: number | null }

/** Percentil ponderado por total_transacoes (escrituras). */
const weightedPercentile = (
  pairs: { valor: number; peso: number }[],
  p: number
): number => {
  const total = pairs.reduce((s, x) => s + x.peso, 0);
  if (total <= 0) return pairs[0]?.valor ?? 0;
  const alvo = total * p;
  let acc = 0;
  for (const x of pairs) {
    acc += x.peso;
    if (acc >= alvo) return x.valor;
  }
  return pairs[pairs.length - 1].valor;
};

/**
 * Piso e teto calibrados com a própria amostra do logradouro (P1 e P99
 * ponderados por escrituras, com as mesmas margens do bairro). Ruas com preço
 * fora da faixa típica do bairro — José Higino, por exemplo — deixam de perder
 * transações para o cinto de segurança do bairro.
 *
 * Sem amostra suficiente, devolve o fallback (limites do bairro).
 */
export const getStreetOutlierLimits = (
  rows: WeightedValue[],
  fallback: { piso: number; teto: number }
): { piso: number; teto: number; escopo: "logradouro" | "bairro"; escrituras: number } => {
  const pairs = rows
    .filter((r) => typeof r.valor_m2 === "number" && (r.valor_m2 as number) > 0)
    .map((r) => ({ valor: r.valor_m2 as number, peso: Number(r.total_transacoes) || 1 }))
    .sort((a, b) => a.valor - b.valor);

  const escrituras = pairs.reduce((s, x) => s + x.peso, 0);
  if (pairs.length < STREET_CALIBRATION_MIN_LINHAS || escrituras < STREET_CALIBRATION_MIN_ESCRITURAS) {
    return { ...fallback, escopo: "bairro", escrituras };
  }

  const piso = Math.max(
    DEFAULT_OUTLIER_MIN,
    Math.round(weightedPercentile(pairs, 0.01) * PISO_MARGIN)
  );
  const teto = Math.min(
    DEFAULT_OUTLIER_MAX,
    Math.round(weightedPercentile(pairs, 0.99) * TETO_MARGIN)
  );
  if (!(teto > piso)) return { ...fallback, escopo: "bairro", escrituras };

  return { piso, teto, escopo: "logradouro", escrituras };
};
