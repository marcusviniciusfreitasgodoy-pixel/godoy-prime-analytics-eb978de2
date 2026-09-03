// Limites absolutos de R$/m² por bairro × tipologia usados como cinto de
// segurança antes da estatística do motor. FONTE ÚNICA para o app
// (src/lib/outlierLimits.ts reexporta este arquivo) e para as edge functions.
//
// TABELA GERADA, NÃO EDITAR À MÃO: `bun run cinto docs/calibracao/<csv>` lê o
// CSV da consulta 7.4 unificada (docs/calibracao-consultas.sql) e reescreve o
// bloco OUTLIER_LIMITS_TABLE com as regras de outlierLimitsGen.ts:
//   - >= 100 escrituras em 3 anos: janela de 3 anos, piso = P1 × 0,85,
//     teto = P99,5 × 1,15 (percentis ponderados por total_transacoes);
//   - senão, >= 30 escrituras em 5 anos: janela de 5 anos e largura mínima
//     [mediana / 2; mediana × 2], porque nessas amostras o P99,5 é o próprio
//     máximo observado e viraria filtro de mercado;
//   - senão, fora da tabela (getOutlierLimits cai na faixa do bairro ou nos
//     padrões 1.000 / 60.000).
// Última geração: 2026-09-03, base de 38.197 linhas / 163.015 escrituras
// (docs/calibracao/bloco74-unificada-2026-09-03.csv), 144 pares, 132 excluídos.
// Histórico das calibrações manuais anteriores (4 rodadas em 2026-09-03):
// docs/calibracao/ e seção 2.5 da especificação.
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
  "ABOLICAO|Apartamento": { piso: 1334, teto: 5336, p1: 2244, p995: 3290, mediana: 2668, escrituras: 32, janela: "5 anos" },
  "AGUA SANTA|Apartamento": { piso: 1595, teto: 6380, p1: 2100, p995: 4527, mediana: 3190, escrituras: 129, janela: "5 anos" },
  "ANDARAI|Apartamento": { piso: 2176, teto: 7745, p1: 2560, p995: 6735, mediana: 4971, escrituras: 573, janela: "3 anos" },
  "ANIL|Apartamento": { piso: 2849, teto: 6955, p1: 3352, p995: 6048, mediana: 4853, escrituras: 389, janela: "3 anos" },
  "ANIL|Casa": { piso: 1220, teto: 5507, p1: 1543, p995: 4789, mediana: 2439, escrituras: 52, janela: "5 anos" },
  "BANGU|Apartamento": { piso: 1616, teto: 6464, p1: 2093, p995: 4192, mediana: 3232, escrituras: 106, janela: "5 anos" },
  "BANGU|Casa": { piso: 1000, teto: 4183, p1: 1149, p995: 3637, mediana: 1917, escrituras: 162, janela: "5 anos" },
  "BARRA DA TIJUCA|Apartamento": { piso: 5243, teto: 23368, p1: 6168, p995: 20320, mediana: 10109, escrituras: 6408, janela: "3 anos" },
  "BARRA DA TIJUCA|Casa": { piso: 4486, teto: 13561, p1: 5278, p995: 11792, mediana: 7758, escrituras: 168, janela: "3 anos" },
  "BARRA OLIMPICA|Apartamento": { piso: 4837, teto: 11003, p1: 5691, p995: 9568, mediana: 8413, escrituras: 581, janela: "3 anos" },
  "BENTO RIBEIRO|Apartamento": { piso: 1601, teto: 6402, p1: 2244, p995: 3948, mediana: 3201, escrituras: 47, janela: "5 anos" },
  "BENTO RIBEIRO|Casa": { piso: 1000, teto: 3758, p1: 1104, p995: 2806, mediana: 1879, escrituras: 35, janela: "5 anos" },
  "BONSUCESSO|Apartamento": { piso: 1823, teto: 6151, p1: 2145, p995: 5349, mediana: 4257, escrituras: 167, janela: "3 anos" },
  "BOTAFOGO|Apartamento": { piso: 6494, teto: 22770, p1: 7640, p995: 19800, mediana: 10853, escrituras: 3036, janela: "3 anos" },
  "BOTAFOGO|Casa": { piso: 3220, teto: 12878, p1: 4143, p995: 10453, mediana: 6439, escrituras: 55, janela: "5 anos" },
  "BRAS DE PINA|Apartamento": { piso: 1709, teto: 7282, p1: 2010, p995: 4877, mediana: 3641, escrituras: 120, janela: "5 anos" },
  "CACHAMBI|Apartamento": { piso: 2420, teto: 8378, p1: 2847, p995: 7285, mediana: 5304, escrituras: 864, janela: "3 anos" },
  "CACHAMBI|Casa": { piso: 1000, teto: 4706, p1: 1176, p995: 4092, mediana: 2304, escrituras: 43, janela: "5 anos" },
  "CAMORIM|Apartamento": { piso: 4260, teto: 11520, p1: 5012, p995: 10017, mediana: 6949, escrituras: 1792, janela: "3 anos" },
  "CAMPINHO|Apartamento": { piso: 1627, teto: 6508, p1: 2540, p995: 4052, mediana: 3254, escrituras: 34, janela: "5 anos" },
  "CAMPO DOS AFONSOS|Apartamento": { piso: 2268, teto: 5134, p1: 2668, p995: 4464, mediana: 4146, escrituras: 156, janela: "3 anos" },
  "CAMPO GRANDE|Apartamento": { piso: 1799, teto: 5660, p1: 2117, p995: 4922, mediana: 3653, escrituras: 1352, janela: "3 anos" },
  "CAMPO GRANDE|Casa": { piso: 1000, teto: 3744, p1: 870, p995: 3256, mediana: 2064, escrituras: 366, janela: "3 anos" },
  "CASCADURA|Apartamento": { piso: 1686, teto: 6742, p1: 2045, p995: 4173, mediana: 3371, escrituras: 78, janela: "5 anos" },
  "CATETE|Apartamento": { piso: 5123, teto: 14790, p1: 6027, p995: 12861, mediana: 9364, escrituras: 677, janela: "3 anos" },
  "CATUMBI|Apartamento": { piso: 1262, teto: 5048, p1: 2181, p995: 4095, mediana: 2524, escrituras: 39, janela: "5 anos" },
  "CENTRO|Apartamento": { piso: 3250, teto: 13440, p1: 3824, p995: 11687, mediana: 5866, escrituras: 1316, janela: "3 anos" },
  "COLEGIO|Apartamento": { piso: 1735, teto: 6938, p1: 2516, p995: 4160, mediana: 3469, escrituras: 174, janela: "5 anos" },
  "COPACABANA|Apartamento": { piso: 5194, teto: 25809, p1: 6110, p995: 22443, mediana: 10287, escrituras: 6822, janela: "3 anos" },
  "COSME VELHO|Apartamento": { piso: 4789, teto: 19156, p1: 7178, p995: 11253, mediana: 9578, escrituras: 90, janela: "5 anos" },
  "COSMOS|Apartamento": { piso: 1269, teto: 3038, p1: 1493, p995: 2642, mediana: 2189, escrituras: 144, janela: "3 anos" },
  "COSMOS|Casa": { piso: 1000, teto: 3356, p1: 892, p995: 2491, mediana: 1678, escrituras: 131, janela: "5 anos" },
  "CURICICA|Apartamento": { piso: 2681, teto: 9341, p1: 3154, p995: 8123, mediana: 6645, escrituras: 257, janela: "3 anos" },
  "DEL CASTILHO|Apartamento": { piso: 3481, teto: 6987, p1: 4095, p995: 6076, mediana: 4966, escrituras: 449, janela: "3 anos" },
  "ENCANTADO|Apartamento": { piso: 1534, teto: 6134, p1: 2078, p995: 4757, mediana: 3067, escrituras: 51, janela: "5 anos" },
  "ENGENHO DA RAINHA|Apartamento": { piso: 1345, teto: 5380, p1: 2121, p995: 4267, mediana: 2690, escrituras: 37, janela: "5 anos" },
  "ENGENHO DE DENTRO|Apartamento": { piso: 1642, teto: 7038, p1: 1932, p995: 6120, mediana: 4374, escrituras: 522, janela: "3 anos" },
  "ENGENHO DE DENTRO|Casa": { piso: 1000, teto: 4132, p1: 1077, p995: 3108, mediana: 2066, escrituras: 41, janela: "5 anos" },
  "ENGENHO NOVO|Apartamento": { piso: 1969, teto: 5215, p1: 2316, p995: 4535, mediana: 3111, escrituras: 216, janela: "3 anos" },
  "ESTACIO|Apartamento": { piso: 1798, teto: 7190, p1: 2665, p995: 5011, mediana: 3595, escrituras: 83, janela: "5 anos" },
  "FLAMENGO|Apartamento": { piso: 6396, teto: 23552, p1: 7525, p995: 20480, mediana: 9650, escrituras: 2052, janela: "3 anos" },
  "FREGUESIA (ILHA)|Apartamento": { piso: 1961, teto: 8018, p1: 2307, p995: 5759, mediana: 4009, escrituras: 139, janela: "5 anos" },
  "FREGUESIA (JACAREPAGUA)|Apartamento": { piso: 2944, teto: 7900, p1: 3463, p995: 6870, mediana: 5139, escrituras: 1659, janela: "3 anos" },
  "FREGUESIA (JACAREPAGUA)|Casa": { piso: 1322, teto: 7232, p1: 1555, p995: 5168, mediana: 3616, escrituras: 138, janela: "5 anos" },
  "GARDENIA AZUL|Apartamento": { piso: 1549, teto: 6194, p1: 2615, p995: 3936, mediana: 3097, escrituras: 64, janela: "5 anos" },
  "GAVEA|Apartamento": { piso: 8195, teto: 26463, p1: 9641, p995: 23011, mediana: 17708, escrituras: 503, janela: "3 anos" },
  "GLORIA|Apartamento": { piso: 5189, teto: 20240, p1: 6105, p995: 17600, mediana: 8287, escrituras: 412, janela: "3 anos" },
  "GRAJAU|Apartamento": { piso: 2287, teto: 7536, p1: 2690, p995: 6553, mediana: 4777, escrituras: 472, janela: "3 anos" },
  "GRAJAU|Casa": { piso: 1696, teto: 6782, p1: 2759, p995: 5097, mediana: 3391, escrituras: 40, janela: "5 anos" },
  "GUARATIBA|Apartamento": { piso: 1392, teto: 4712, p1: 1638, p995: 4097, mediana: 2279, escrituras: 111, janela: "3 anos" },
  "GUARATIBA|Casa": { piso: 1200, teto: 3077, p1: 1412, p995: 2676, mediana: 1843, escrituras: 132, janela: "3 anos" },
  "HIGIENOPOLIS|Apartamento": { piso: 1464, teto: 5856, p1: 2054, p995: 4588, mediana: 2928, escrituras: 73, janela: "5 anos" },
  "HUMAITA|Apartamento": { piso: 7590, teto: 24103, p1: 8929, p995: 20959, mediana: 10944, escrituras: 355, janela: "3 anos" },
  "INHAUMA|Apartamento": { piso: 1741, teto: 7564, p1: 2048, p995: 4895, mediana: 3782, escrituras: 50, janela: "5 anos" },
  "INHOAIBA|Apartamento": { piso: 1190, teto: 4760, p1: 1825, p995: 3162, mediana: 2380, escrituras: 211, janela: "5 anos" },
  "IPANEMA|Apartamento": { piso: 7812, teto: 50611, p1: 9190, p995: 44010, mediana: 17350, escrituras: 2246, janela: "3 anos" },
  "IRAJA|Apartamento": { piso: 2028, teto: 6657, p1: 2386, p995: 5789, mediana: 4541, escrituras: 602, janela: "3 anos" },
  "IRAJA|Casa": { piso: 1000, teto: 3727, p1: 1219, p995: 3241, mediana: 1703, escrituras: 78, janela: "5 anos" },
  "JACAREPAGUA|Apartamento": { piso: 4048, teto: 10770, p1: 4762, p995: 9365, mediana: 6468, escrituras: 3814, janela: "3 anos" },
  "JACAREPAGUA|Casa": { piso: 1617, teto: 6468, p1: 1987, p995: 4911, mediana: 3234, escrituras: 46, janela: "5 anos" },
  "JARDIM BOTANICO|Apartamento": { piso: 7062, teto: 24080, p1: 8308, p995: 20939, mediana: 13743, escrituras: 359, janela: "3 anos" },
  "JARDIM CARIOCA|Apartamento": { piso: 2046, teto: 8184, p1: 2560, p995: 5667, mediana: 4092, escrituras: 62, janela: "5 anos" },
  "JARDIM GUANABARA|Apartamento": { piso: 2745, teto: 8158, p1: 3229, p995: 7094, mediana: 4885, escrituras: 337, janela: "3 anos" },
  "JARDIM GUANABARA|Casa": { piso: 1384, teto: 5911, p1: 1798, p995: 5140, mediana: 2767, escrituras: 39, janela: "5 anos" },
  "JARDIM SULACAP|Apartamento": { piso: 1913, teto: 7650, p1: 2569, p995: 4730, mediana: 3825, escrituras: 153, janela: "5 anos" },
  "JARDIM SULACAP|Casa": { piso: 1324, teto: 5296, p1: 1824, p995: 3204, mediana: 2648, escrituras: 31, janela: "5 anos" },
  "LAGOA|Apartamento": { piso: 8417, teto: 29512, p1: 9902, p995: 25663, mediana: 17132, escrituras: 519, janela: "3 anos" },
  "LARANJEIRAS|Apartamento": { piso: 4808, teto: 19724, p1: 5657, p995: 17151, mediana: 9084, escrituras: 1381, janela: "3 anos" },
  "LEBLON|Apartamento": { piso: 11207, teto: 59408, p1: 13185, p995: 51659, mediana: 20412, escrituras: 1523, janela: "3 anos" },
  "LEME|Apartamento": { piso: 7602, teto: 20617, p1: 8944, p995: 17928, mediana: 10343, escrituras: 425, janela: "3 anos" },
  "LINS DE VASCONCELOS|Apartamento": { piso: 2025, teto: 7036, p1: 2382, p995: 6118, mediana: 3300, escrituras: 201, janela: "3 anos" },
  "MADUREIRA|Apartamento": { piso: 1546, teto: 6184, p1: 1994, p995: 5181, mediana: 3092, escrituras: 132, janela: "5 anos" },
  "MADUREIRA|Casa": { piso: 1000, teto: 4106, p1: 1118, p995: 2472, mediana: 2053, escrituras: 36, janela: "5 anos" },
  "MARACANA|Apartamento": { piso: 3724, teto: 11991, p1: 4381, p995: 10427, mediana: 6824, escrituras: 794, janela: "3 anos" },
  "MARECHAL HERMES|Apartamento": { piso: 1256, teto: 7828, p1: 1478, p995: 4843, mediana: 3914, escrituras: 224, janela: "5 anos" },
  "MARIA DA GRACA|Apartamento": { piso: 1580, teto: 6318, p1: 2256, p995: 4131, mediana: 3159, escrituras: 62, janela: "5 anos" },
  "MEIER|Apartamento": { piso: 2325, teto: 7644, p1: 2735, p995: 6647, mediana: 4167, escrituras: 648, janela: "3 anos" },
  "MEIER|Casa": { piso: 1395, teto: 5580, p1: 2046, p995: 3786, mediana: 2790, escrituras: 48, janela: "5 anos" },
  "MONERO|Apartamento": { piso: 2104, teto: 8855, p1: 3230, p995: 7700, mediana: 4208, escrituras: 74, janela: "5 anos" },
  "OLARIA|Apartamento": { piso: 2077, teto: 6768, p1: 2443, p995: 5885, mediana: 3588, escrituras: 123, janela: "3 anos" },
  "OLARIA|Casa": { piso: 1000, teto: 4583, p1: 1025, p995: 3985, mediana: 2107, escrituras: 58, janela: "5 anos" },
  "PACIENCIA|Apartamento": { piso: 1102, teto: 4406, p1: 1512, p995: 2750, mediana: 2203, escrituras: 46, janela: "5 anos" },
  "PARADA DE LUCAS|Apartamento": { piso: 1388, teto: 6210, p1: 1633, p995: 5400, mediana: 3502, escrituras: 142, janela: "3 anos" },
  "PAVUNA|Casa": { piso: 1000, teto: 3422, p1: 1008, p995: 2249, mediana: 1711, escrituras: 54, janela: "5 anos" },
  "PECHINCHA|Apartamento": { piso: 2818, teto: 5974, p1: 3315, p995: 5195, mediana: 4434, escrituras: 1002, janela: "3 anos" },
  "PECHINCHA|Casa": { piso: 1073, teto: 5569, p1: 1262, p995: 4843, mediana: 2648, escrituras: 93, janela: "5 anos" },
  "PENHA CIRCULAR|Apartamento": { piso: 1925, teto: 4490, p1: 2265, p995: 3904, mediana: 3169, escrituras: 118, janela: "3 anos" },
  "PENHA CIRCULAR|Casa": { piso: 1000, teto: 3652, p1: 1140, p995: 2947, mediana: 1826, escrituras: 40, janela: "5 anos" },
  "PENHA|Apartamento": { piso: 1182, teto: 6918, p1: 1391, p995: 6016, mediana: 4335, escrituras: 220, janela: "3 anos" },
  "PENHA|Casa": { piso: 1000, teto: 4175, p1: 1413, p995: 3630, mediana: 1990, escrituras: 44, janela: "5 anos" },
  "PIEDADE|Apartamento": { piso: 1782, teto: 7426, p1: 2096, p995: 4478, mediana: 3713, escrituras: 165, janela: "5 anos" },
  "PIEDADE|Casa": { piso: 1000, teto: 3459, p1: 1266, p995: 3008, mediana: 1674, escrituras: 57, janela: "5 anos" },
  "PILARES|Apartamento": { piso: 1466, teto: 5864, p1: 2115, p995: 3375, mediana: 2932, escrituras: 36, janela: "5 anos" },
  "PORTUGUESA|Apartamento": { piso: 1892, teto: 7568, p1: 2569, p995: 5722, mediana: 3784, escrituras: 65, janela: "5 anos" },
  "PORTUGUESA|Casa": { piso: 1246, teto: 4982, p1: 1579, p995: 3844, mediana: 2491, escrituras: 36, janela: "5 anos" },
  "PRACA DA BANDEIRA|Apartamento": { piso: 3268, teto: 8305, p1: 3845, p995: 7222, mediana: 5363, escrituras: 110, janela: "3 anos" },
  "PRACA SECA|Apartamento": { piso: 1471, teto: 4257, p1: 1730, p995: 3702, mediana: 2811, escrituras: 439, janela: "3 anos" },
  "PRACA SECA|Casa": { piso: 1000, teto: 3796, p1: 1038, p995: 3301, mediana: 1518, escrituras: 102, janela: "5 anos" },
  "QUINTINO BOCAIUVA|Apartamento": { piso: 1690, teto: 6758, p1: 2036, p995: 4122, mediana: 3379, escrituras: 104, janela: "5 anos" },
  "RAMOS|Apartamento": { piso: 1719, teto: 7262, p1: 2022, p995: 5014, mediana: 3631, escrituras: 147, janela: "5 anos" },
  "RAMOS|Casa": { piso: 1036, teto: 4766, p1: 1246, p995: 4144, mediana: 2071, escrituras: 37, janela: "5 anos" },
  "REALENGO|Apartamento": { piso: 1300, teto: 5288, p1: 1529, p995: 3468, mediana: 2644, escrituras: 96, janela: "5 anos" },
  "REALENGO|Casa": { piso: 1000, teto: 3178, p1: 1021, p995: 2692, mediana: 1589, escrituras: 51, janela: "5 anos" },
  "RECREIO DOS BANDEIRANTES|Apartamento": { piso: 3907, teto: 13556, p1: 4596, p995: 11788, mediana: 6391, escrituras: 4076, janela: "3 anos" },
  "RECREIO DOS BANDEIRANTES|Casa": { piso: 2550, teto: 8251, p1: 3000, p995: 7175, mediana: 5646, escrituras: 114, janela: "3 anos" },
  "RIACHUELO|Apartamento": { piso: 1627, teto: 6506, p1: 2235, p995: 5330, mediana: 3253, escrituras: 116, janela: "5 anos" },
  "RIBEIRA|Apartamento": { piso: 1935, teto: 8906, p1: 2276, p995: 6078, mediana: 4453, escrituras: 73, janela: "5 anos" },
  "RIO COMPRIDO|Apartamento": { piso: 1834, teto: 8617, p1: 2158, p995: 7493, mediana: 4373, escrituras: 511, janela: "3 anos" },
  "ROCHA|Apartamento": { piso: 1427, teto: 5708, p1: 2177, p995: 4425, mediana: 2854, escrituras: 69, janela: "5 anos" },
  "SAMPAIO|Apartamento": { piso: 1336, teto: 5344, p1: 1823, p995: 3013, mediana: 2672, escrituras: 31, janela: "5 anos" },
  "SANTA CRUZ|Apartamento": { piso: 1386, teto: 3724, p1: 1631, p995: 3238, mediana: 2402, escrituras: 309, janela: "3 anos" },
  "SANTA TERESA|Apartamento": { piso: 2902, teto: 9406, p1: 3414, p995: 8179, mediana: 5370, escrituras: 259, janela: "3 anos" },
  "SANTISSIMO|Apartamento": { piso: 1663, teto: 2864, p1: 1957, p995: 2490, mediana: 2154, escrituras: 122, janela: "3 anos" },
  "SANTISSIMO|Casa": { piso: 1000, teto: 3194, p1: 1452, p995: 1757, mediana: 1597, escrituras: 61, janela: "5 anos" },
  "SANTO CRISTO|Apartamento": { piso: 3576, teto: 11852, p1: 4207, p995: 10306, mediana: 7706, escrituras: 583, janela: "3 anos" },
  "SAO CONRADO|Apartamento": { piso: 6129, teto: 30076, p1: 7211, p995: 26153, mediana: 9911, escrituras: 280, janela: "3 anos" },
  "SAO CRISTOVAO|Apartamento": { piso: 2697, teto: 9982, p1: 3173, p995: 8680, mediana: 6220, escrituras: 490, janela: "3 anos" },
  "SAO CRISTOVAO|Casa": { piso: 1000, teto: 3490, p1: 1316, p995: 2944, mediana: 1745, escrituras: 37, janela: "5 anos" },
  "SAO FRANCISCO XAVIER|Apartamento": { piso: 2371, teto: 6351, p1: 2789, p995: 5523, mediana: 4225, escrituras: 408, janela: "3 anos" },
  "SENADOR CAMARA|Apartamento": { piso: 1000, teto: 3430, p1: 985, p995: 2635, mediana: 1715, escrituras: 39, janela: "5 anos" },
  "TANQUE|Apartamento": { piso: 2177, teto: 5827, p1: 2561, p995: 5067, mediana: 3815, escrituras: 126, janela: "3 anos" },
  "TANQUE|Casa": { piso: 1000, teto: 3566, p1: 1409, p995: 3059, mediana: 1783, escrituras: 42, janela: "5 anos" },
  "TAQUARA|Apartamento": { piso: 2243, teto: 7296, p1: 2639, p995: 6344, mediana: 4370, escrituras: 1080, janela: "3 anos" },
  "TAQUARA|Casa": { piso: 1313, teto: 5252, p1: 1632, p995: 4049, mediana: 2626, escrituras: 109, janela: "5 anos" },
  "TAUA|Apartamento": { piso: 1806, teto: 7224, p1: 2465, p995: 5813, mediana: 3612, escrituras: 90, janela: "5 anos" },
  "TIJUCA|Apartamento": { piso: 2709, teto: 11555, p1: 3187, p995: 10048, mediana: 5780, escrituras: 3967, janela: "3 anos" },
  "TIJUCA|Casa": { piso: 2003, teto: 9000, p1: 2356, p995: 6104, mediana: 4500, escrituras: 66, janela: "5 anos" },
  "TODOS OS SANTOS|Apartamento": { piso: 2673, teto: 7604, p1: 3145, p995: 6612, mediana: 4913, escrituras: 682, janela: "3 anos" },
  "TODOS OS SANTOS|Casa": { piso: 1204, teto: 4816, p1: 2110, p995: 3825, mediana: 2408, escrituras: 35, janela: "5 anos" },
  "URCA|Apartamento": { piso: 6751, teto: 30187, p1: 10007, p995: 26250, mediana: 13501, escrituras: 63, janela: "5 anos" },
  "VARGEM GRANDE|Apartamento": { piso: 3856, teto: 6929, p1: 4536, p995: 6025, mediana: 5144, escrituras: 147, janela: "3 anos" },
  "VARGEM GRANDE|Casa": { piso: 1847, teto: 7388, p1: 2592, p995: 4862, mediana: 3694, escrituras: 90, janela: "5 anos" },
  "VARGEM PEQUENA|Apartamento": { piso: 3393, teto: 7185, p1: 3992, p995: 6248, mediana: 4494, escrituras: 148, janela: "3 anos" },
  "VARGEM PEQUENA|Casa": { piso: 1602, teto: 7574, p1: 1885, p995: 5263, mediana: 3787, escrituras: 184, janela: "5 anos" },
  "VASCO DA GAMA|Apartamento": { piso: 1842, teto: 7368, p1: 2199, p995: 4094, mediana: 3684, escrituras: 34, janela: "5 anos" },
  "VAZ LOBO|Apartamento": { piso: 1322, teto: 5852, p1: 1555, p995: 3569, mediana: 2926, escrituras: 68, janela: "5 anos" },
  "VICENTE DE CARVALHO|Apartamento": { piso: 2048, teto: 8192, p1: 2531, p995: 5167, mediana: 4096, escrituras: 167, janela: "5 anos" },
  "VILA DA PENHA|Apartamento": { piso: 2314, teto: 7214, p1: 2722, p995: 6273, mediana: 4737, escrituras: 289, janela: "3 anos" },
  "VILA ISABEL|Apartamento": { piso: 2359, teto: 9245, p1: 2775, p995: 8039, mediana: 4569, escrituras: 1079, janela: "3 anos" },
  "VILA ISABEL|Casa": { piso: 1583, teto: 7750, p1: 2516, p995: 6739, mediana: 3165, escrituras: 58, janela: "5 anos" },
  "VILA KOSMOS|Casa": { piso: 1154, teto: 4616, p1: 1570, p995: 2640, mediana: 2308, escrituras: 36, janela: "5 anos" },
  "VILA VALQUEIRE|Apartamento": { piso: 1500, teto: 6840, p1: 1765, p995: 5948, mediana: 4157, escrituras: 216, janela: "3 anos" },
  "VILA VALQUEIRE|Casa": { piso: 1000, teto: 4562, p1: 988, p995: 3958, mediana: 2281, escrituras: 59, janela: "5 anos" },
  "ZUMBI|Apartamento": { piso: 2394, teto: 9576, p1: 3365, p995: 6089, mediana: 4788, escrituras: 32, janela: "5 anos" },
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
