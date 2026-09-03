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
// 2026-09-03 (4ª rodada, base recarregada às 15h): os 59 pares com >= 100
// escrituras em 3 anos foram regenerados de uma vez com a consulta 7.4 agrupando
// por bairro SEM filtrar por nome (a base grava GLÓRIA, BARRA OLÍMPICA, JACAREPAGUÁ
// etc. com acento; uma consulta que filtrava sem acento tinha calibrado pares
// acentuados com amostra parcial). Fonte: docs/calibracao/bloco74-3anos-p995-2026-09-03.csv.
// 2026-09-03 (5ª rodada): os 18 pares abaixo de 100 escrituras em 3 anos foram
// regenerados com a mesma consulta sem o mínimo, nas janelas de 3 e 5 anos
// (docs/calibracao/bloco74-19pares-3e5anos-2026-09-03.csv). Regra para amostra
// pequena (menos de SMALL_SAMPLE_ESCRITURAS na janela de 3 anos): usa a janela
// de 5 anos e garante largura mínima do cinto em torno da mediana, porque com
// 37 a 211 escrituras o P99,5 é o próprio máximo observado e P99,5 × 1,15
// viraria filtro de mercado, não de erro:
//   piso = max(1000,  round(min(P1 × 0,85;   mediana / SMALL_SAMPLE_WIDTH)))
//   teto = min(60000, round(max(P99,5 × 1,15; mediana × SMALL_SAMPLE_WIDTH)))
// BARRA OLIMPICA|Apartamento foi removido: a migration 20260521155956
// reclassificou o bairro como BARRA DA TIJUCA e a base não tem nenhuma linha
// com esse nome; o par cai no fallback padrão.

//
// Sem dependências: precisa rodar em Deno e no navegador.

export interface OutlierLimitEntry {
  piso: number;
  teto: number;
  p1: number;
  p995: number;
  /** Mediana ponderada da janela; preenchida nos pares de amostra pequena, onde entra na regra de largura mínima. */
  mediana?: number;
  escrituras: number;
  janela?: "3 anos" | "5 anos";
}

/** Usados quando o bairro não tem calibração (P1 e P99,5 da cidade, com margem). */
export const DEFAULT_OUTLIER_MIN = 1000;
export const DEFAULT_OUTLIER_MAX = 60000;
export const PISO_MARGIN = 0.85;
export const TETO_MARGIN = 1.15;
/** Abaixo disso (escrituras em 3 anos) o par usa a janela de 5 anos e a largura mínima. */
export const SMALL_SAMPLE_ESCRITURAS = 100;
/** Largura mínima do cinto em amostra pequena: [mediana / 2; mediana × 2]. */
export const SMALL_SAMPLE_WIDTH = 2;

/** Chave: "BAIRRO NORMALIZADO|Tipologia" (Apartamento | Casa). */
export const OUTLIER_LIMITS_TABLE: Record<string, OutlierLimitEntry> = {
  "AGUA SANTA|Apartamento": { piso: 1595, teto: 6380, p1: 2111, p995: 4527, mediana: 3190, escrituras: 127, janela: "5 anos" },
  "ANDARAI|Apartamento": { piso: 2189, teto: 7737, p1: 2575, p995: 6728, escrituras: 573, janela: "3 anos" },
  "ANIL|Apartamento": { piso: 3011, teto: 6790, p1: 3542, p995: 5904, escrituras: 387, janela: "3 anos" },
  "BANGU|Casa": { piso: 1034, teto: 4134, p1: 1498, p995: 3460, mediana: 2067, escrituras: 56, janela: "5 anos" },
  "BARRA DA TIJUCA|Apartamento": { piso: 5251, teto: 22312, p1: 6178, p995: 19402, escrituras: 6277, janela: "3 anos" },
  "BARRA DA TIJUCA|Casa": { piso: 4561, teto: 13132, p1: 5366, p995: 11419, escrituras: 168, janela: "3 anos" },
  "BONSUCESSO|Apartamento": { piso: 1821, teto: 6058, p1: 2142, p995: 5268, escrituras: 167, janela: "3 anos" },
  "BOTAFOGO|Apartamento": { piso: 6079, teto: 22334, p1: 7152, p995: 19421, escrituras: 3036, janela: "3 anos" },
  "BRAS DE PINA|Apartamento": { piso: 1726, teto: 7338, p1: 2030, p995: 4877, mediana: 3669, escrituras: 116, janela: "5 anos" },
  "CACHAMBI|Apartamento": { piso: 2137, teto: 8059, p1: 2514, p995: 7008, escrituras: 864, janela: "3 anos" },
  "CAMORIM|Apartamento": { piso: 4232, teto: 11354, p1: 4979, p995: 9873, escrituras: 1712, janela: "3 anos" },
  "CAMPO DOS AFONSOS|Apartamento": { piso: 2435, teto: 5134, p1: 2865, p995: 4464, escrituras: 135, janela: "3 anos" },
  "CAMPO GRANDE|Apartamento": { piso: 2003, teto: 5449, p1: 2356, p995: 4738, escrituras: 617, janela: "3 anos" },
  "CAMPO GRANDE|Casa": { piso: 1158, teto: 3726, p1: 1362, p995: 3240, escrituras: 185, janela: "3 anos" },
  "CATETE|Apartamento": { piso: 4853, teto: 14959, p1: 5709, p995: 13008, escrituras: 677, janela: "3 anos" },
  "CENTRO|Apartamento": { piso: 3151, teto: 13440, p1: 3707, p995: 11687, escrituras: 1305, janela: "3 anos" },
  "COLEGIO|Apartamento": { piso: 1734, teto: 6938, p1: 2516, p995: 4160, mediana: 3469, escrituras: 174, janela: "5 anos" },
  "COPACABANA|Apartamento": { piso: 5034, teto: 24569, p1: 5922, p995: 21364, escrituras: 6822, janela: "3 anos" },
  "CURICICA|Apartamento": { piso: 3057, teto: 9220, p1: 3596, p995: 8017, escrituras: 251, janela: "3 anos" },
  "DEL CASTILHO|Apartamento": { piso: 3317, teto: 6969, p1: 3902, p995: 6060, escrituras: 449, janela: "3 anos" },
  "ENGENHO DE DENTRO|Apartamento": { piso: 1633, teto: 7076, p1: 1921, p995: 6153, escrituras: 520, janela: "3 anos" },
  "ENGENHO NOVO|Apartamento": { piso: 1998, teto: 5000, p1: 2350, p995: 4348, escrituras: 214, janela: "3 anos" },
  "FLAMENGO|Apartamento": { piso: 6488, teto: 22604, p1: 7633, p995: 19656, escrituras: 2052, janela: "3 anos" },
  "FREGUESIA (ILHA)|Apartamento": { piso: 1961, teto: 8018, p1: 2307, p995: 5759, mediana: 4009, escrituras: 139, janela: "5 anos" },
  "FREGUESIA (JACAREPAGUA)|Apartamento": { piso: 2819, teto: 7894, p1: 3316, p995: 6864, escrituras: 1659, janela: "3 anos" },
  "FREGUESIA (JACAREPAGUA)|Casa": { piso: 1275, teto: 7110, p1: 1500, p995: 5168, mediana: 3555, escrituras: 117, janela: "5 anos" },
  "GAVEA|Apartamento": { piso: 7800, teto: 25878, p1: 9177, p995: 22503, escrituras: 503, janela: "3 anos" },
  "GLORIA|Apartamento": { piso: 5256, teto: 20080, p1: 6184, p995: 17461, escrituras: 412, janela: "3 anos" },
  "GRAJAU|Apartamento": { piso: 2816, teto: 7511, p1: 3313, p995: 6531, escrituras: 472, janela: "3 anos" },
  "GUARATIBA|Casa": { piso: 1000, teto: 3724, p1: 1642, p995: 2653, mediana: 1862, escrituras: 54, janela: "5 anos" },
  "HUMAITA|Apartamento": { piso: 7585, teto: 22708, p1: 8924, p995: 19746, escrituras: 355, janela: "3 anos" },
  "INHOAIBA|Apartamento": { piso: 1259, teto: 5036, p1: 1932, p995: 2816, mediana: 2518, escrituras: 37, janela: "5 anos" },
  "IPANEMA|Apartamento": { piso: 7563, teto: 50837, p1: 8898, p995: 44206, escrituras: 2246, janela: "3 anos" },
  "IRAJA|Apartamento": { piso: 2021, teto: 6664, p1: 2378, p995: 5795, escrituras: 600, janela: "3 anos" },
  "JACAREPAGUA|Apartamento": { piso: 3400, teto: 10778, p1: 4000, p995: 9372, escrituras: 3814, janela: "3 anos" },
  "JARDIM BOTANICO|Apartamento": { piso: 7006, teto: 23058, p1: 8242, p995: 20050, escrituras: 359, janela: "3 anos" },
  "JARDIM GUANABARA|Apartamento": { piso: 2755, teto: 8135, p1: 3241, p995: 7074, escrituras: 337, janela: "3 anos" },
  "JARDIM SULACAP|Apartamento": { piso: 1907, teto: 7724, p1: 2243, p995: 4507, mediana: 3862, escrituras: 81, janela: "5 anos" },
  "LAGOA|Apartamento": { piso: 8380, teto: 29450, p1: 9859, p995: 25609, escrituras: 519, janela: "3 anos" },
  "LARANJEIRAS|Apartamento": { piso: 4374, teto: 18851, p1: 5146, p995: 16392, escrituras: 1381, janela: "3 anos" },
  "LEBLON|Apartamento": { piso: 11239, teto: 60000, p1: 13222, p995: 53625, escrituras: 1523, janela: "3 anos" },
  "LEME|Apartamento": { piso: 7571, teto: 20510, p1: 8907, p995: 17835, escrituras: 425, janela: "3 anos" },
  "LINS DE VASCONCELOS|Apartamento": { piso: 2152, teto: 7036, p1: 2532, p995: 6118, escrituras: 199, janela: "3 anos" },
  "MADUREIRA|Apartamento": { piso: 1546, teto: 6184, p1: 1994, p995: 5181, mediana: 3092, escrituras: 132, janela: "5 anos" },
  "MARACANA|Apartamento": { piso: 3676, teto: 11584, p1: 4325, p995: 10073, escrituras: 794, janela: "3 anos" },
  "MARECHAL HERMES|Apartamento": { piso: 1974, teto: 7894, p1: 2799, p995: 4859, mediana: 3947, escrituras: 211, janela: "5 anos" },
  "MEIER|Apartamento": { piso: 2315, teto: 7545, p1: 2723, p995: 6561, escrituras: 648, janela: "3 anos" },
  "OLARIA|Apartamento": { piso: 2077, teto: 6592, p1: 2443, p995: 5732, escrituras: 123, janela: "3 anos" },
  "PARADA DE LUCAS|Apartamento": { piso: 1556, teto: 6106, p1: 1830, p995: 5310, escrituras: 136, janela: "3 anos" },
  "PECHINCHA|Apartamento": { piso: 2804, teto: 5967, p1: 3299, p995: 5189, escrituras: 1002, janela: "3 anos" },
  "PENHA CIRCULAR|Apartamento": { piso: 1936, teto: 4486, p1: 2278, p995: 3901, escrituras: 108, janela: "3 anos" },
  "PENHA|Apartamento": { piso: 1958, teto: 6918, p1: 2304, p995: 6016, escrituras: 210, janela: "3 anos" },
  "PIEDADE|Apartamento": { piso: 1782, teto: 7426, p1: 2096, p995: 4478, mediana: 3713, escrituras: 165, janela: "5 anos" },
  "PRACA DA BANDEIRA|Apartamento": { piso: 3284, teto: 8211, p1: 3864, p995: 7140, escrituras: 110, janela: "3 anos" },
  "PRACA SECA|Apartamento": { piso: 1454, teto: 4356, p1: 1710, p995: 3788, escrituras: 439, janela: "3 anos" },
  "RAMOS|Apartamento": { piso: 1816, teto: 7262, p1: 2401, p995: 5014, mediana: 3631, escrituras: 139, janela: "5 anos" },
  "RECREIO DOS BANDEIRANTES|Apartamento": { piso: 3743, teto: 13501, p1: 4404, p995: 11740, escrituras: 3536, janela: "3 anos" },
  "RECREIO DOS BANDEIRANTES|Casa": { piso: 2680, teto: 10718, p1: 4403, p995: 6820, mediana: 5359, escrituras: 200, janela: "5 anos" },
  "RIACHUELO|Apartamento": { piso: 1633, teto: 6532, p1: 2231, p995: 5330, mediana: 3266, escrituras: 112, janela: "5 anos" },
  "RIO COMPRIDO|Apartamento": { piso: 1941, teto: 8449, p1: 2283, p995: 7347, escrituras: 511, janela: "3 anos" },
  "SANTA CRUZ|Apartamento": { piso: 1534, teto: 6136, p1: 2303, p995: 3182, mediana: 3068, escrituras: 85, janela: "5 anos" },
  "SANTA TERESA|Apartamento": { piso: 2959, teto: 9329, p1: 3481, p995: 8112, escrituras: 257, janela: "3 anos" },
  "SANTO CRISTO|Apartamento": { piso: 1640, teto: 11721, p1: 1929, p995: 10192, escrituras: 581, janela: "3 anos" },
  "SAO CONRADO|Apartamento": { piso: 6104, teto: 29925, p1: 7181, p995: 26022, escrituras: 280, janela: "3 anos" },
  "SAO CRISTOVAO|Apartamento": { piso: 2707, teto: 9860, p1: 3185, p995: 8574, escrituras: 488, janela: "3 anos" },
  "SAO FRANCISCO XAVIER|Apartamento": { piso: 2307, teto: 6203, p1: 2714, p995: 5394, escrituras: 408, janela: "3 anos" },
  "TANQUE|Apartamento": { piso: 2240, teto: 5771, p1: 2635, p995: 5018, escrituras: 126, janela: "3 anos" },
  "TAQUARA|Apartamento": { piso: 2149, teto: 7007, p1: 2528, p995: 6093, escrituras: 1080, janela: "3 anos" },
  "TIJUCA|Apartamento": { piso: 2590, teto: 11446, p1: 3047, p995: 9953, escrituras: 3967, janela: "3 anos" },
  "TODOS OS SANTOS|Apartamento": { piso: 2554, teto: 7660, p1: 3005, p995: 6661, escrituras: 682, janela: "3 anos" },
  "VARGEM GRANDE|Apartamento": { piso: 3856, teto: 6918, p1: 4536, p995: 6016, escrituras: 137, janela: "3 anos" },
  "VARGEM PEQUENA|Apartamento": { piso: 3393, teto: 7146, p1: 3992, p995: 6214, escrituras: 146, janela: "3 anos" },
  "VARGEM PEQUENA|Casa": { piso: 1602, teto: 7562, p1: 1885, p995: 5263, mediana: 3781, escrituras: 182, janela: "5 anos" },
  "VICENTE DE CARVALHO|Apartamento": { piso: 2048, teto: 8192, p1: 2531, p995: 5167, mediana: 4096, escrituras: 167, janela: "5 anos" },
  "VILA DA PENHA|Apartamento": { piso: 2480, teto: 7213, p1: 2918, p995: 6272, escrituras: 287, janela: "3 anos" },
  "VILA ISABEL|Apartamento": { piso: 2287, teto: 8936, p1: 2690, p995: 7770, escrituras: 1079, janela: "3 anos" },
  "VILA VALQUEIRE|Apartamento": { piso: 1827, teto: 6760, p1: 2149, p995: 5878, escrituras: 208, janela: "3 anos" },
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
