// Limites absolutos de R$/m² por bairro × tipologia usados como cinto de
// segurança antes da estatística do motor. FONTE ÚNICA para o app
// (src/lib/outlierLimits.ts reexporta este arquivo) e para as edge functions.
//
// GERADO a partir de docs/calibracao/bloco74-piso-teto-2026-09-02.csv
// (P1 e P99 do R$/m² por bairro × tipologia, 5 anos, pares com >= 100
// escrituras, base de produção em 2026-09-02). Não editar à mão: regenerar
// com a consulta 7.4 de docs/calibracao-consultas.sql quando a base mudar.
//
// piso = P1 × 0.85, teto = P99 × 1.15. As margens existem porque o corte
// fino é feito pelo MAD em log (itbiMarketStats.ts); estes limites só barram
// o que é implausível para o par bairro × tipologia.
//
// Sem dependências: precisa rodar em Deno e no navegador.

export interface OutlierLimitEntry {
  piso: number;
  teto: number;
  p1: number;
  p99: number;
  escrituras: number;
}

/** Usados quando o bairro não tem calibração (P1 e P99 da cidade, com margem). */
export const DEFAULT_OUTLIER_MIN = 1000;
export const DEFAULT_OUTLIER_MAX = 60000;
export const PISO_MARGIN = 0.85;
export const TETO_MARGIN = 1.15;

/** Chave: "BAIRRO NORMALIZADO|Tipologia" (Apartamento | Casa). */
export const OUTLIER_LIMITS_TABLE: Record<string, OutlierLimitEntry> = {
  "AGUA SANTA|Apartamento": { piso: 1856, teto: 5206, p1: 2183, p99: 4527, escrituras: 123 },
  "ANDARAI|Apartamento": { piso: 2100, teto: 7897, p1: 2471, p99: 6867, escrituras: 825 },
  "ANIL|Apartamento": { piso: 2901, teto: 6525, p1: 3413, p99: 5674, escrituras: 719 },
  "BANGU|Casa": { piso: 1053, teto: 4065, p1: 1239, p99: 3535, escrituras: 131 },
  "BARRA DA TIJUCA|Apartamento": { piso: 5173, teto: 20341, p1: 6086, p99: 17688, escrituras: 9881 },
  "BARRA DA TIJUCA|Casa": { piso: 4019, teto: 12532, p1: 4728, p99: 10897, escrituras: 294 },
  "BARRA OLIMPICA|Apartamento": { piso: 4852, teto: 10965, p1: 5708, p99: 9535, escrituras: 411 },
  "BONSUCESSO|Apartamento": { piso: 1825, teto: 5778, p1: 2147, p99: 5024, escrituras: 218 },
  "BOTAFOGO|Apartamento": { piso: 5873, teto: 21097, p1: 6909, p99: 18345, escrituras: 4178 },
  "BRAS DE PINA|Apartamento": { piso: 1788, teto: 5579, p1: 2104, p99: 4851, escrituras: 108 },
  "CACHAMBI|Apartamento": { piso: 2102, teto: 7758, p1: 2473, p99: 6746, escrituras: 1754 },
  "CAMORIM|Apartamento": { piso: 4261, teto: 11086, p1: 5013, p99: 9640, escrituras: 2612 },
  "CAMPO DOS AFONSOS|Apartamento": { piso: 2134, teto: 5132, p1: 2511, p99: 4463, escrituras: 154 },
  "CAMPO GRANDE|Apartamento": { piso: 1879, teto: 5471, p1: 2211, p99: 4757, escrituras: 2130 },
  "CAMPO GRANDE|Casa": { piso: 1093, teto: 3604, p1: 1286, p99: 3134, escrituras: 638 },
  "CATETE|Apartamento": { piso: 4624, teto: 13898, p1: 5440, p99: 12085, escrituras: 799 },
  "CENTRO|Apartamento": { piso: 2839, teto: 10105, p1: 3340, p99: 8787, escrituras: 391 },
  "COLEGIO|Apartamento": { piso: 2049, teto: 4717, p1: 2411, p99: 4102, escrituras: 174 },
  "COPACABANA|Apartamento": { piso: 4737, teto: 19760, p1: 5573, p99: 17183, escrituras: 9914 },
  "CURICICA|Apartamento": { piso: 3045, teto: 8520, p1: 3582, p99: 7409, escrituras: 252 },
  "DEL CASTILHO|Apartamento": { piso: 2854, teto: 6920, p1: 3358, p99: 6017, escrituras: 824 },
  "ENGENHO DE DENTRO|Apartamento": { piso: 1661, teto: 6929, p1: 1954, p99: 6025, escrituras: 812 },
  "ENGENHO NOVO|Apartamento": { piso: 1748, teto: 4789, p1: 2057, p99: 4164, escrituras: 331 },
  "FLAMENGO|Apartamento": { piso: 6003, teto: 16325, p1: 7062, p99: 14196, escrituras: 1214 },
  "FREGUESIA (ILHA)|Apartamento": { piso: 2297, teto: 6049, p1: 2702, p99: 5260, escrituras: 132 },
  "FREGUESIA (JACAREPAGUA)|Apartamento": { piso: 2788, teto: 7705, p1: 3280, p99: 6700, escrituras: 2650 },
  "FREGUESIA (JACAREPAGUA)|Casa": { piso: 1355, teto: 5757, p1: 1594, p99: 5006, escrituras: 112 },
  "GAVEA|Apartamento": { piso: 8248, teto: 25047, p1: 9704, p99: 21780, escrituras: 596 },
  "GLORIA|Apartamento": { piso: 4789, teto: 13975, p1: 5634, p99: 12152, escrituras: 227 },
  "GRAJAU|Apartamento": { piso: 2638, teto: 7384, p1: 3103, p99: 6421, escrituras: 740 },
  "GUARATIBA|Casa": { piso: 1173, teto: 2632, p1: 1380, p99: 2289, escrituras: 240 },
  "HUMAITA|Apartamento": { piso: 7017, teto: 20799, p1: 8255, p99: 18086, escrituras: 451 },
  "INHOAIBA|Apartamento": { piso: 1684, teto: 3609, p1: 1981, p99: 3138, escrituras: 171 },
  "IPANEMA|Apartamento": { piso: 7019, teto: 47533, p1: 8258, p99: 41333, escrituras: 3057 },
  "IRAJA|Apartamento": { piso: 2007, teto: 6369, p1: 2361, p99: 5538, escrituras: 1141 },
  "JACAREPAGUA|Apartamento": { piso: 3209, teto: 10225, p1: 3775, p99: 8891, escrituras: 6872 },
  "JARDIM BOTANICO|Apartamento": { piso: 6966, teto: 22483, p1: 8195, p99: 19550, escrituras: 474 },
  "JARDIM GUANABARA|Apartamento": { piso: 2625, teto: 7888, p1: 3088, p99: 6859, escrituras: 541 },
  "JARDIM SULACAP|Apartamento": { piso: 2232, teto: 5283, p1: 2626, p99: 4594, escrituras: 146 },
  "LAGOA|Apartamento": { piso: 8360, teto: 29303, p1: 9835, p99: 25481, escrituras: 747 },
  "LARANJEIRAS|Apartamento": { piso: 4848, teto: 17613, p1: 5704, p99: 15316, escrituras: 1502 },
  "LEBLON|Apartamento": { piso: 10874, teto: 52428, p1: 12793, p99: 45590, escrituras: 2213 },
  "LEME|Apartamento": { piso: 7231, teto: 20508, p1: 8507, p99: 17833, escrituras: 621 },
  "LINS DE VASCONCELOS|Apartamento": { piso: 2005, teto: 7036, p1: 2359, p99: 6118, escrituras: 330 },
  "MADUREIRA|Apartamento": { piso: 1743, teto: 5880, p1: 2051, p99: 5113, escrituras: 130 },
  "MARACANA|Apartamento": { piso: 3712, teto: 11476, p1: 4367, p99: 9979, escrituras: 1017 },
  "MARECHAL HERMES|Apartamento": { piso: 1986, teto: 5511, p1: 2337, p99: 4792, escrituras: 211 },
  "MEIER|Apartamento": { piso: 2358, teto: 6818, p1: 2774, p99: 5929, escrituras: 1006 },
  "OLARIA|Apartamento": { piso: 2004, teto: 6031, p1: 2358, p99: 5244, escrituras: 143 },
  "PARADA DE LUCAS|Apartamento": { piso: 1556, teto: 5893, p1: 1830, p99: 5124, escrituras: 227 },
  "PECHINCHA|Apartamento": { piso: 2744, teto: 5864, p1: 3228, p99: 5099, escrituras: 1806 },
  "PENHA|Apartamento": { piso: 1835, teto: 6435, p1: 2159, p99: 5596, escrituras: 312 },
  "PENHA CIRCULAR|Apartamento": { piso: 1947, teto: 4553, p1: 2290, p99: 3959, escrituras: 160 },
  "PIEDADE|Apartamento": { piso: 1782, teto: 5107, p1: 2097, p99: 4441, escrituras: 156 },
  "PRACA DA BANDEIRA|Apartamento": { piso: 3175, teto: 8033, p1: 3735, p99: 6985, escrituras: 156 },
  "PRACA SECA|Apartamento": { piso: 1482, teto: 4269, p1: 1743, p99: 3712, escrituras: 682 },
  "RAMOS|Apartamento": { piso: 2044, teto: 5595, p1: 2405, p99: 4865, escrituras: 131 },
  "RECREIO DOS BANDEIRANTES|Apartamento": { piso: 3714, teto: 12044, p1: 4369, p99: 10473, escrituras: 7526 },
  "RECREIO DOS BANDEIRANTES|Casa": { piso: 3165, teto: 7807, p1: 3723, p99: 6789, escrituras: 292 },
  "RIACHUELO|Apartamento": { piso: 1924, teto: 5806, p1: 2264, p99: 5049, escrituras: 112 },
  "RIO COMPRIDO|Apartamento": { piso: 2088, teto: 7591, p1: 2456, p99: 6601, escrituras: 238 },
  "SANTA CRUZ|Apartamento": { piso: 1686, teto: 3714, p1: 1984, p99: 3230, escrituras: 154 },
  "SANTA TERESA|Apartamento": { piso: 2622, teto: 8301, p1: 3085, p99: 7218, escrituras: 127 },
  "SANTO CRISTO|Apartamento": { piso: 2908, teto: 9757, p1: 3421, p99: 8484, escrituras: 514 },
  "SAO CONRADO|Apartamento": { piso: 4309, teto: 29308, p1: 5069, p99: 25485, escrituras: 420 },
  "SAO CRISTOVAO|Apartamento": { piso: 2759, teto: 9400, p1: 3246, p99: 8174, escrituras: 173 },
  "SAO FRANCISCO XAVIER|Apartamento": { piso: 2195, teto: 5881, p1: 2582, p99: 5114, escrituras: 676 },
  "TANQUE|Apartamento": { piso: 2153, teto: 5664, p1: 2533, p99: 4925, escrituras: 173 },
  "TAQUARA|Apartamento": { piso: 2159, teto: 6318, p1: 2540, p99: 5494, escrituras: 1719 },
  "TIJUCA|Apartamento": { piso: 2532, teto: 10924, p1: 2979, p99: 9499, escrituras: 6039 },
  "TODOS OS SANTOS|Apartamento": { piso: 2555, teto: 7485, p1: 3006, p99: 6509, escrituras: 1200 },
  "VARGEM GRANDE|Apartamento": { piso: 3856, teto: 6977, p1: 4536, p99: 6067, escrituras: 320 },
  "VARGEM PEQUENA|Apartamento": { piso: 3373, teto: 7013, p1: 3968, p99: 6098, escrituras: 296 },
  "VARGEM PEQUENA|Casa": { piso: 1731, teto: 5842, p1: 2036, p99: 5080, escrituras: 181 },
  "VICENTE DE CARVALHO|Apartamento": { piso: 2128, teto: 5798, p1: 2503, p99: 5042, escrituras: 164 },
  "VILA DA PENHA|Apartamento": { piso: 2298, teto: 7164, p1: 2704, p99: 6230, escrituras: 492 },
  "VILA ISABEL|Apartamento": { piso: 2287, teto: 8403, p1: 2690, p99: 7307, escrituras: 1705 },
  "VILA VALQUEIRE|Apartamento": { piso: 1859, teto: 6534, p1: 2187, p99: 5682, escrituras: 350 },
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
