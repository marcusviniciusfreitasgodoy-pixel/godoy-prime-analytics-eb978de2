// Limites absolutos de R$/m² por bairro × tipologia usados como cinto de
// segurança antes da estatística do motor. FONTE ÚNICA para o app
// (src/lib/outlierLimits.ts reexporta este arquivo) e para as edge functions.
//
// TABELA E CONSTANTES GERADAS, NÃO EDITAR À MÃO:
//   bun run cinto <csv da consulta 7.4> <csv da consulta 7.4b>
// (docs/calibracao-consultas.sql) reescreve OUTLIER_LIMITS_TABLE e o bloco
// entre os marcadores <cinto:constantes>, e grava docs/calibracao/cinto-<data>.sql
// para carregar a tabela itbi_cinto do banco. Regras em outlierLimitsGen.ts
// (seção 2.5 da especificação):
//   - base: escrituras individuais de itbi_escrituras, R$/m² corrigido ao
//     último trimestre do itbi_price_index; pares Apartamento, Casa e Comercial;
//   - >= 200 escrituras em 3 anos: piso = P0,5 × 0,85, teto = P99,5 × 1,15;
//   - senão, >= 30 em 5 anos: janela de 5 anos e largura mínima
//     [mediana / 2; mediana × 2];
//   - senão, fora da tabela: faixa da cidade.
//
// Unidade: piso e teto da tabela estão em preço do último trimestre. As linhas
// de itbi_transactions estão em preço da época (até 5 anos atrás), então
// getOutlierLimits devolve o piso dividido por FATOR_INDICE_5_ANOS (trimestre
// mais barato da janela) e o teto dividido por FATOR_MIN_INDICE_5_ANOS
// (trimestre mais caro; fica abaixo de 1 quando algum trimestre recente custou
// mais que o último). Assim o app nunca corta uma linha que o banco aceitou. A
// filtragem por escritura antes da agregação (itbi_aplicar_cinto, no banco)
// corrige cada preço e compara com os valores sem conversão.
//
// Sem dependências: precisa rodar em Deno e no navegador.

export interface OutlierLimitEntry {
  piso: number;
  teto: number;
  /** P0,5 corrigido: base do piso desde 2026-10-22. Ausente em tabelas antigas. */
  p05?: number;
  /** P1 corrigido: só referência. */
  p1: number;
  p995: number;
  /** Mediana ponderada da janela; preenchida nos pares de amostra pequena, onde entra na regra de largura mínima. */
  mediana?: number;
  escrituras: number;
  janela?: "3 anos" | "5 anos";
}

// <cinto:constantes> (gerado por bun run cinto; não editar)
// Última geração: 2026-10-21, 317 pares, 138 excluídos por amostra,
// 126381 escrituras residenciais na faixa da cidade.
// CSVs: bloco74-escrituras-p05-2026-10-22.csv e bloco74b-cidade-p05-2026-10-22.csv.
/** Faixa da cidade (consulta 7.4b), em preço do último trimestre do índice. Carregada em itbi_cinto como CIDADE|*. */
export const FAIXA_SEM_CALIBRACAO_PISO = 907;
export const FAIXA_SEM_CALIBRACAO_TETO = 42013;
/** Maior razão preço de hoje ÷ preço da época entre os trimestres da janela de 5 anos (consulta 7.4b). */
export const FATOR_INDICE_5_ANOS = 1.1721;
/** Menor razão na mesma janela (trimestre mais caro que o último fica abaixo de 1). Converte o teto. */
export const FATOR_MIN_INDICE_5_ANOS = 0.9667;
/** Piso sem bairro calibrado, já em preço da época (FAIXA_SEM_CALIBRACAO_PISO ÷ FATOR_INDICE_5_ANOS). */
export const DEFAULT_OUTLIER_MIN = 774;
/** Teto sem bairro, em preço da época: maior teto de Apartamento/Casa da faixa padrão (3 anos), 84363, ÷ FATOR_MIN_INDICE_5_ANOS. */
export const DEFAULT_OUTLIER_MAX = 87269;
// </cinto:constantes>
export const PISO_MARGIN = 0.85;
export const TETO_MARGIN = 1.15;
/** Abaixo disso (escrituras em 3 anos) o par usa a janela de 5 anos e a largura mínima. */
export const SMALL_SAMPLE_ESCRITURAS = 200;
/** Largura mínima do cinto em amostra pequena: [mediana / 2; mediana × 2]. */
export const SMALL_SAMPLE_WIDTH = 2;

/** Chave: "BAIRRO NORMALIZADO|Tipologia" (Apartamento | Casa | Comercial). Valores em preço do último trimestre do índice. */
export const OUTLIER_LIMITS_TABLE: Record<string, OutlierLimitEntry> = {
  "ABOLICAO|Apartamento": { piso: 1131, teto: 7240, p05: 1330, p1: 1333, p995: 6296, mediana: 3322, escrituras: 207, janela: "5 anos" },
  "ABOLICAO|Casa": { piso: 674, teto: 7918, p05: 793, p1: 903, p995: 6885, mediana: 2852, escrituras: 77, janela: "5 anos" },
  "AGUA SANTA|Apartamento": { piso: 1021, teto: 9883, p05: 1201, p1: 1250, p995: 8594, mediana: 4969, escrituras: 230, janela: "3 anos" },
  "AGUA SANTA|Casa": { piso: 621, teto: 8239, p05: 730, p1: 785, p995: 7164, mediana: 3191, escrituras: 43, janela: "5 anos" },
  "ALTO DA BOA VISTA|Apartamento": { piso: 1476, teto: 13487, p05: 1736, p1: 1736, p995: 11728, mediana: 4630, escrituras: 69, janela: "5 anos" },
  "ALTO DA BOA VISTA|Casa": { piso: 1558, teto: 12091, p05: 1833, p1: 1842, p995: 10514, mediana: 3398, escrituras: 42, janela: "5 anos" },
  "ANCHIETA|Apartamento": { piso: 734, teto: 8275, p05: 864, p1: 867, p995: 7196, mediana: 3401, escrituras: 70, janela: "5 anos" },
  "ANCHIETA|Casa": { piso: 662, teto: 18509, p05: 779, p1: 976, p995: 16095, mediana: 2112, escrituras: 95, janela: "5 anos" },
  "ANDARAI|Apartamento": { piso: 1618, teto: 11846, p05: 1904, p1: 2137, p995: 10301, mediana: 5088, escrituras: 953, janela: "3 anos" },
  "ANDARAI|Casa": { piso: 910, teto: 22806, p05: 1070, p1: 1484, p995: 19831, mediana: 3914, escrituras: 148, janela: "5 anos" },
  "ANDARAI|Comercial": { piso: 1879, teto: 15841, p05: 2210, p1: 2333, p995: 13775, mediana: 4028, escrituras: 31, janela: "5 anos" },
  "ANIL|Apartamento": { piso: 1833, teto: 10475, p05: 2157, p1: 2403, p995: 9109, mediana: 5577, escrituras: 585, janela: "3 anos" },
  "ANIL|Casa": { piso: 623, teto: 9686, p05: 733, p1: 928, p995: 8423, mediana: 3509, escrituras: 242, janela: "3 anos" },
  "BANCARIOS|Apartamento": { piso: 1257, teto: 7766, p05: 1479, p1: 1625, p995: 6753, mediana: 3737, escrituras: 90, janela: "5 anos" },
  "BANCARIOS|Casa": { piso: 870, teto: 7484, p05: 1024, p1: 1029, p995: 6508, mediana: 2346, escrituras: 74, janela: "5 anos" },
  "BANGU|Apartamento": { piso: 893, teto: 8511, p05: 1051, p1: 1110, p995: 7401, mediana: 3254, escrituras: 265, janela: "3 anos" },
  "BANGU|Casa": { piso: 501, teto: 10480, p05: 589, p1: 659, p995: 9113, mediana: 2317, escrituras: 467, janela: "3 anos" },
  "BANGU|Comercial": { piso: 978, teto: 39734, p05: 1150, p1: 1280, p995: 34551, mediana: 4298, escrituras: 142, janela: "5 anos" },
  "BARRA DA TIJUCA|Apartamento": { piso: 3909, teto: 35346, p05: 4599, p1: 5272, p995: 30736, mediana: 12499, escrituras: 9017, janela: "3 anos" },
  "BARRA DA TIJUCA|Casa": { piso: 2020, teto: 45856, p05: 2376, p1: 3048, p995: 39875, mediana: 8700, escrituras: 820, janela: "3 anos" },
  "BARRA DA TIJUCA|Comercial": { piso: 2258, teto: 49643, p05: 2656, p1: 3221, p995: 43168, mediana: 7760, escrituras: 2181, janela: "3 anos" },
  "BARRA OLIMPICA|Apartamento": { piso: 3199, teto: 15476, p05: 3764, p1: 3939, p995: 13457, mediana: 8707, escrituras: 935, janela: "3 anos" },
  "BARRA OLIMPICA|Comercial": { piso: 1699, teto: 14787, p05: 1999, p1: 2079, p995: 12858, mediana: 5238, escrituras: 121, janela: "5 anos" },
  "BENFICA|Apartamento": { piso: 1104, teto: 10629, p05: 1299, p1: 1368, p995: 9243, mediana: 3346, escrituras: 125, janela: "5 anos" },
  "BENFICA|Casa": { piso: 783, teto: 14484, p05: 921, p1: 1044, p995: 12595, mediana: 2563, escrituras: 74, janela: "5 anos" },
  "BENFICA|Comercial": { piso: 853, teto: 9593, p05: 1003, p1: 1201, p995: 8342, mediana: 2858, escrituras: 127, janela: "5 anos" },
  "BENTO RIBEIRO|Apartamento": { piso: 980, teto: 10623, p05: 1153, p1: 1230, p995: 9237, mediana: 3512, escrituras: 202, janela: "5 anos" },
  "BENTO RIBEIRO|Casa": { piso: 796, teto: 16216, p05: 936, p1: 1082, p995: 14101, mediana: 3204, escrituras: 257, janela: "5 anos" },
  "BONSUCESSO|Apartamento": { piso: 1389, teto: 11148, p05: 1634, p1: 1756, p995: 9694, mediana: 5848, escrituras: 860, janela: "3 anos" },
  "BONSUCESSO|Casa": { piso: 825, teto: 12905, p05: 970, p1: 987, p995: 11222, mediana: 2934, escrituras: 124, janela: "5 anos" },
  "BONSUCESSO|Comercial": { piso: 940, teto: 35294, p05: 1106, p1: 1138, p995: 30690, mediana: 2582, escrituras: 119, janela: "5 anos" },
  "BOTAFOGO|Apartamento": { piso: 3717, teto: 26088, p05: 4373, p1: 5162, p995: 22685, mediana: 11808, escrituras: 4097, janela: "3 anos" },
  "BOTAFOGO|Casa": { piso: 2366, teto: 23892, p05: 2784, p1: 2985, p995: 20776, mediana: 8051, escrituras: 175, janela: "5 anos" },
  "BOTAFOGO|Comercial": { piso: 1201, teto: 51613, p05: 1413, p1: 1511, p995: 44881, mediana: 11903, escrituras: 291, janela: "5 anos" },
  "BRAS DE PINA|Apartamento": { piso: 575, teto: 8967, p05: 677, p1: 1094, p995: 7797, mediana: 4367, escrituras: 357, janela: "3 anos" },
  "BRAS DE PINA|Casa": { piso: 623, teto: 18647, p05: 733, p1: 873, p995: 16215, mediana: 3267, escrituras: 255, janela: "5 anos" },
  "BRAS DE PINA|Comercial": { piso: 1093, teto: 15561, p05: 1286, p1: 1359, p995: 13531, mediana: 2911, escrituras: 41, janela: "5 anos" },
  "CACHAMBI|Apartamento": { piso: 1455, teto: 12339, p05: 1712, p1: 1968, p995: 10730, mediana: 5406, escrituras: 1460, janela: "3 anos" },
  "CACHAMBI|Casa": { piso: 1012, teto: 16437, p05: 1190, p1: 1247, p995: 14293, mediana: 4041, escrituras: 244, janela: "5 anos" },
  "CACHAMBI|Comercial": { piso: 1236, teto: 61556, p05: 1454, p1: 1528, p995: 53527, mediana: 4531, escrituras: 71, janela: "5 anos" },
  "CACUIA|Apartamento": { piso: 1725, teto: 10451, p05: 2029, p1: 2172, p995: 9088, mediana: 4600, escrituras: 75, janela: "5 anos" },
  "CACUIA|Casa": { piso: 794, teto: 9392, p05: 934, p1: 1099, p995: 8167, mediana: 3451, escrituras: 40, janela: "5 anos" },
  "CAJU|Apartamento": { piso: 978, teto: 7012, p05: 1151, p1: 1264, p995: 6097, mediana: 3161, escrituras: 38, janela: "5 anos" },
  "CAMORIM|Apartamento": { piso: 2818, teto: 13432, p05: 3315, p1: 3816, p995: 11680, mediana: 8487, escrituras: 3008, janela: "3 anos" },
  "CAMORIM|Comercial": { piso: 2304, teto: 12073, p05: 3737, p1: 3737, p995: 10498, mediana: 4607, escrituras: 40, janela: "5 anos" },
  "CAMPINHO|Apartamento": { piso: 1148, teto: 6945, p05: 1351, p1: 1411, p995: 6039, mediana: 3466, escrituras: 141, janela: "5 anos" },
  "CAMPINHO|Casa": { piso: 622, teto: 11861, p05: 732, p1: 784, p995: 10314, mediana: 2550, escrituras: 56, janela: "5 anos" },
  "CAMPO DOS AFONSOS|Apartamento": { piso: 2304, teto: 6050, p05: 2711, p1: 2799, p995: 5261, mediana: 4152, escrituras: 243, janela: "3 anos" },
  "CAMPO GRANDE|Apartamento": { piso: 1068, teto: 11108, p05: 1256, p1: 1338, p995: 9659, mediana: 4241, escrituras: 3441, janela: "3 anos" },
  "CAMPO GRANDE|Casa": { piso: 649, teto: 17539, p05: 763, p1: 859, p995: 15251, mediana: 3000, escrituras: 1917, janela: "3 anos" },
  "CAMPO GRANDE|Comercial": { piso: 1222, teto: 39447, p05: 1438, p1: 1523, p995: 34302, mediana: 4998, escrituras: 318, janela: "3 anos" },
  "CASCADURA|Apartamento": { piso: 791, teto: 8571, p05: 930, p1: 1167, p995: 7453, mediana: 2972, escrituras: 230, janela: "3 anos" },
  "CASCADURA|Casa": { piso: 604, teto: 8722, p05: 710, p1: 781, p995: 7584, mediana: 2500, escrituras: 139, janela: "5 anos" },
  "CASCADURA|Comercial": { piso: 1052, teto: 18284, p05: 1238, p1: 1252, p995: 15899, mediana: 3077, escrituras: 41, janela: "5 anos" },
  "CATETE|Apartamento": { piso: 3583, teto: 22075, p05: 4215, p1: 4781, p995: 19196, mediana: 9704, escrituras: 890, janela: "3 anos" },
  "CATETE|Casa": { piso: 2295, teto: 16846, p05: 2700, p1: 2701, p995: 14649, mediana: 5034, escrituras: 45, janela: "5 anos" },
  "CATETE|Comercial": { piso: 1675, teto: 32282, p05: 1971, p1: 2520, p995: 28071, mediana: 9603, escrituras: 142, janela: "5 anos" },
  "CATUMBI|Apartamento": { piso: 821, teto: 8824, p05: 966, p1: 1250, p995: 7673, mediana: 3524, escrituras: 141, janela: "5 anos" },
  "CATUMBI|Casa": { piso: 937, teto: 6518, p05: 1102, p1: 1105, p995: 5668, mediana: 2641, escrituras: 36, janela: "5 anos" },
  "CAVALCANTI|Apartamento": { piso: 649, teto: 6656, p05: 764, p1: 791, p995: 5690, mediana: 3328, escrituras: 109, janela: "5 anos" },
  "CAVALCANTI|Casa": { piso: 533, teto: 11475, p05: 627, p1: 661, p995: 9978, mediana: 2228, escrituras: 67, janela: "5 anos" },
  "CENTRO|Apartamento": { piso: 2147, teto: 18669, p05: 2526, p1: 2725, p995: 16234, mediana: 6939, escrituras: 2050, janela: "3 anos" },
  "CENTRO|Comercial": { piso: 678, teto: 22691, p05: 798, p1: 983, p995: 19731, mediana: 3498, escrituras: 2095, janela: "3 anos" },
  "CIDADE DE DEUS|Casa": { piso: 609, teto: 7501, p05: 717, p1: 778, p995: 6523, mediana: 2657, escrituras: 40, janela: "5 anos" },
  "CIDADE NOVA|Apartamento": { piso: 1611, teto: 9480, p05: 1895, p1: 1985, p995: 7678, mediana: 4740, escrituras: 89, janela: "5 anos" },
  "COCOTA|Apartamento": { piso: 1785, teto: 10728, p05: 2100, p1: 2248, p995: 9329, mediana: 4000, escrituras: 117, janela: "5 anos" },
  "COCOTA|Casa": { piso: 797, teto: 9100, p05: 938, p1: 1029, p995: 7913, mediana: 2922, escrituras: 48, janela: "5 anos" },
  "COELHO NETO|Apartamento": { piso: 1095, teto: 5674, p05: 1522, p1: 1528, p995: 4934, mediana: 2189, escrituras: 31, janela: "5 anos" },
  "COELHO NETO|Casa": { piso: 813, teto: 9156, p05: 957, p1: 957, p995: 7962, mediana: 1970, escrituras: 60, janela: "5 anos" },
  "COELHO NETO|Comercial": { piso: 848, teto: 4000, p05: 1077, p1: 1085, p995: 3478, mediana: 1695, escrituras: 31, janela: "5 anos" },
  "COLEGIO|Apartamento": { piso: 1201, teto: 11604, p05: 1413, p1: 1809, p995: 8695, mediana: 5802, escrituras: 340, janela: "5 anos" },
  "COLEGIO|Casa": { piso: 780, teto: 35576, p05: 918, p1: 959, p995: 30936, mediana: 3569, escrituras: 65, janela: "5 anos" },
  "COPACABANA|Apartamento": { piso: 3622, teto: 40863, p05: 4261, p1: 4956, p995: 35533, mediana: 11313, escrituras: 8386, janela: "3 anos" },
  "COPACABANA|Casa": { piso: 1035, teto: 90965, p05: 1218, p1: 1800, p995: 79100, mediana: 11661, escrituras: 60, janela: "5 anos" },
  "COPACABANA|Comercial": { piso: 988, teto: 84116, p05: 1162, p1: 3830, p995: 73144, mediana: 8526, escrituras: 574, janela: "3 anos" },
  "CORDOVIL|Apartamento": { piso: 671, teto: 7216, p05: 789, p1: 877, p995: 6275, mediana: 3076, escrituras: 148, janela: "5 anos" },
  "CORDOVIL|Casa": { piso: 646, teto: 27831, p05: 760, p1: 835, p995: 24201, mediana: 2714, escrituras: 81, janela: "5 anos" },
  "COSME VELHO|Apartamento": { piso: 4084, teto: 19490, p05: 4805, p1: 5019, p995: 16311, mediana: 9745, escrituras: 198, janela: "5 anos" },
  "COSME VELHO|Casa": { piso: 1691, teto: 14431, p05: 1989, p1: 2134, p995: 12549, mediana: 5429, escrituras: 37, janela: "5 anos" },
  "COSMOS|Apartamento": { piso: 881, teto: 7357, p05: 1037, p1: 1098, p995: 6397, mediana: 4276, escrituras: 619, janela: "3 anos" },
  "COSMOS|Casa": { piso: 542, teto: 7733, p05: 638, p1: 665, p995: 6724, mediana: 3701, escrituras: 207, janela: "3 anos" },
  "CURICICA|Apartamento": { piso: 1743, teto: 11083, p05: 2050, p1: 2326, p995: 9637, mediana: 7782, escrituras: 379, janela: "3 anos" },
  "CURICICA|Casa": { piso: 746, teto: 9677, p05: 878, p1: 952, p995: 8415, mediana: 2995, escrituras: 194, janela: "5 anos" },
  "DEL CASTILHO|Apartamento": { piso: 1806, teto: 9752, p05: 2125, p1: 2506, p995: 8480, mediana: 6136, escrituras: 612, janela: "3 anos" },
  "DEL CASTILHO|Casa": { piso: 1392, teto: 12837, p05: 1638, p1: 1659, p995: 11163, mediana: 2977, escrituras: 42, janela: "5 anos" },
  "DEL CASTILHO|Comercial": { piso: 1703, teto: 14514, p05: 2004, p1: 2134, p995: 12621, mediana: 5514, escrituras: 198, janela: "5 anos" },
  "ENCANTADO|Apartamento": { piso: 1116, teto: 8819, p05: 1313, p1: 1459, p995: 7669, mediana: 3442, escrituras: 255, janela: "5 anos" },
  "ENCANTADO|Casa": { piso: 841, teto: 10333, p05: 989, p1: 1018, p995: 8985, mediana: 2791, escrituras: 113, janela: "5 anos" },
  "ENGENHO DA RAINHA|Apartamento": { piso: 1009, teto: 9144, p05: 1187, p1: 1434, p995: 7951, mediana: 3442, escrituras: 137, janela: "5 anos" },
  "ENGENHO DA RAINHA|Casa": { piso: 581, teto: 13833, p05: 684, p1: 706, p995: 12029, mediana: 3143, escrituras: 52, janela: "5 anos" },
  "ENGENHO DE DENTRO|Apartamento": { piso: 1100, teto: 10136, p05: 1294, p1: 1502, p995: 8814, mediana: 4710, escrituras: 1086, janela: "3 anos" },
  "ENGENHO DE DENTRO|Casa": { piso: 785, teto: 12302, p05: 923, p1: 949, p995: 10697, mediana: 3098, escrituras: 242, janela: "5 anos" },
  "ENGENHO DE DENTRO|Comercial": { piso: 925, teto: 55524, p05: 1088, p1: 1285, p995: 48282, mediana: 4474, escrituras: 46, janela: "5 anos" },
  "ENGENHO NOVO|Apartamento": { piso: 999, teto: 7229, p05: 1175, p1: 1320, p995: 6286, mediana: 3028, escrituras: 626, janela: "3 anos" },
  "ENGENHO NOVO|Casa": { piso: 660, teto: 8584, p05: 777, p1: 832, p995: 7464, mediana: 2626, escrituras: 210, janela: "5 anos" },
  "ESTACIO|Apartamento": { piso: 1450, teto: 9583, p05: 1706, p1: 1771, p995: 8333, mediana: 4169, escrituras: 260, janela: "5 anos" },
  "ESTACIO|Casa": { piso: 517, teto: 6934, p05: 608, p1: 637, p995: 6030, mediana: 1841, escrituras: 31, janela: "5 anos" },
  "FLAMENGO|Apartamento": { piso: 3801, teto: 29604, p05: 4472, p1: 4853, p995: 25743, mediana: 10712, escrituras: 2570, janela: "3 anos" },
  "FLAMENGO|Comercial": { piso: 3563, teto: 58751, p05: 4192, p1: 4257, p995: 51088, mediana: 10667, escrituras: 130, janela: "5 anos" },
  "FREGUESIA (ILHA)|Apartamento": { piso: 1085, teto: 8466, p05: 1277, p1: 1438, p995: 7362, mediana: 3849, escrituras: 216, janela: "3 anos" },
  "FREGUESIA (ILHA)|Casa": { piso: 811, teto: 12619, p05: 954, p1: 1127, p995: 10973, mediana: 3041, escrituras: 119, janela: "5 anos" },
  "FREGUESIA (JACAREPAGUA)|Apartamento": { piso: 1877, teto: 11089, p05: 2208, p1: 2427, p995: 9643, mediana: 5531, escrituras: 2211, janela: "3 anos" },
  "FREGUESIA (JACAREPAGUA)|Casa": { piso: 904, teto: 11443, p05: 1064, p1: 1294, p995: 9950, mediana: 4183, escrituras: 424, janela: "3 anos" },
  "FREGUESIA (JACAREPAGUA)|Comercial": { piso: 1429, teto: 33801, p05: 1681, p1: 1885, p995: 29392, mediana: 4090, escrituras: 365, janela: "3 anos" },
  "GAMBOA|Apartamento": { piso: 1002, teto: 14023, p05: 1179, p1: 1240, p995: 12194, mediana: 3287, escrituras: 86, janela: "5 anos" },
  "GARDENIA AZUL|Apartamento": { piso: 1145, teto: 10970, p05: 1347, p1: 1619, p995: 7302, mediana: 5485, escrituras: 141, janela: "5 anos" },
  "GARDENIA AZUL|Casa": { piso: 502, teto: 9823, p05: 591, p1: 614, p995: 8542, mediana: 2638, escrituras: 53, janela: "5 anos" },
  "GAVEA|Apartamento": { piso: 4837, teto: 41115, p05: 5691, p1: 6477, p995: 35752, mediana: 16581, escrituras: 762, janela: "3 anos" },
  "GAVEA|Casa": { piso: 1950, teto: 31088, p05: 2294, p1: 3334, p995: 27033, mediana: 11441, escrituras: 80, janela: "5 anos" },
  "GAVEA|Comercial": { piso: 4259, teto: 39030, p05: 5011, p1: 5297, p995: 33939, mediana: 15783, escrituras: 51, janela: "5 anos" },
  "GLORIA|Apartamento": { piso: 1324, teto: 33858, p05: 1558, p1: 3999, p995: 29442, mediana: 9696, escrituras: 629, janela: "3 anos" },
  "GLORIA|Comercial": { piso: 1733, teto: 19065, p05: 2039, p1: 2272, p995: 16578, mediana: 4461, escrituras: 39, janela: "5 anos" },
  "GRAJAU|Apartamento": { piso: 1623, teto: 12528, p05: 1909, p1: 2173, p995: 10894, mediana: 4875, escrituras: 976, janela: "3 anos" },
  "GRAJAU|Casa": { piso: 820, teto: 14242, p05: 965, p1: 1090, p995: 12384, mediana: 3900, escrituras: 232, janela: "5 anos" },
  "GUADALUPE|Apartamento": { piso: 859, teto: 8543, p05: 1010, p1: 1117, p995: 7429, mediana: 3841, escrituras: 127, janela: "5 anos" },
  "GUADALUPE|Casa": { piso: 745, teto: 13956, p05: 877, p1: 925, p995: 12136, mediana: 2676, escrituras: 152, janela: "5 anos" },
  "GUARATIBA|Apartamento": { piso: 939, teto: 7399, p05: 1105, p1: 1165, p995: 6434, mediana: 4110, escrituras: 999, janela: "3 anos" },
  "GUARATIBA|Casa": { piso: 570, teto: 8995, p05: 670, p1: 791, p995: 7822, mediana: 4152, escrituras: 573, janela: "3 anos" },
  "HIGIENOPOLIS|Apartamento": { piso: 1185, teto: 6833, p05: 1394, p1: 1421, p995: 5942, mediana: 3076, escrituras: 253, janela: "3 anos" },
  "HIGIENOPOLIS|Casa": { piso: 1035, teto: 13874, p05: 1218, p1: 1374, p995: 12064, mediana: 3400, escrituras: 89, janela: "5 anos" },
  "HIGIENOPOLIS|Comercial": { piso: 1203, teto: 10802, p05: 1415, p1: 1433, p995: 9393, mediana: 2564, escrituras: 44, janela: "5 anos" },
  "HONORIO GURGEL|Apartamento": { piso: 602, teto: 10468, p05: 708, p1: 748, p995: 9103, mediana: 2142, escrituras: 32, janela: "5 anos" },
  "HONORIO GURGEL|Casa": { piso: 607, teto: 9535, p05: 714, p1: 764, p995: 8291, mediana: 2207, escrituras: 76, janela: "5 anos" },
  "HUMAITA|Apartamento": { piso: 4238, teto: 23293, p05: 4986, p1: 5792, p995: 20255, mediana: 11167, escrituras: 669, janela: "3 anos" },
  "HUMAITA|Casa": { piso: 2732, teto: 34126, p05: 3214, p1: 3773, p995: 29675, mediana: 9190, escrituras: 70, janela: "5 anos" },
  "INHAUMA|Apartamento": { piso: 1481, teto: 10220, p05: 1742, p1: 1902, p995: 8887, mediana: 6760, escrituras: 220, janela: "3 anos" },
  "INHAUMA|Casa": { piso: 649, teto: 12377, p05: 764, p1: 850, p995: 10763, mediana: 3069, escrituras: 143, janela: "5 anos" },
  "INHOAIBA|Apartamento": { piso: 1242, teto: 7102, p05: 1461, p1: 1490, p995: 6176, mediana: 4742, escrituras: 331, janela: "3 anos" },
  "INHOAIBA|Casa": { piso: 509, teto: 15010, p05: 599, p1: 664, p995: 13052, mediana: 2882, escrituras: 81, janela: "5 anos" },
  "IPANEMA|Apartamento": { piso: 6413, teto: 84363, p05: 7545, p1: 8453, p995: 73359, mediana: 20946, escrituras: 2919, janela: "3 anos" },
  "IPANEMA|Comercial": { piso: 6639, teto: 155930, p05: 7810, p1: 8052, p995: 135591, mediana: 20588, escrituras: 235, janela: "3 anos" },
  "IRAJA|Apartamento": { piso: 1368, teto: 11536, p05: 1609, p1: 1789, p995: 10031, mediana: 5731, escrituras: 1448, janela: "3 anos" },
  "IRAJA|Casa": { piso: 808, teto: 18251, p05: 950, p1: 984, p995: 15870, mediana: 3473, escrituras: 327, janela: "3 anos" },
  "IRAJA|Comercial": { piso: 1066, teto: 10808, p05: 1254, p1: 1290, p995: 9398, mediana: 3208, escrituras: 37, janela: "5 anos" },
  "ITANHANGA|Apartamento": { piso: 1650, teto: 18034, p05: 1941, p1: 1984, p995: 15682, mediana: 5378, escrituras: 221, janela: "5 anos" },
  "ITANHANGA|Casa": { piso: 599, teto: 16836, p05: 705, p1: 723, p995: 14640, mediana: 4799, escrituras: 177, janela: "5 anos" },
  "JACAREPAGUA|Apartamento": { piso: 1697, teto: 15742, p05: 1996, p1: 2407, p995: 13689, mediana: 7723, escrituras: 4635, janela: "3 anos" },
  "JACAREPAGUA|Casa": { piso: 632, teto: 15254, p05: 743, p1: 882, p995: 13264, mediana: 3843, escrituras: 327, janela: "5 anos" },
  "JACAREPAGUA|Comercial": { piso: 1531, teto: 19430, p05: 1801, p1: 2402, p995: 16896, mediana: 5626, escrituras: 315, janela: "3 anos" },
  "JACARE|Apartamento": { piso: 581, teto: 7836, p05: 683, p1: 683, p995: 6814, mediana: 3173, escrituras: 121, janela: "5 anos" },
  "JACARE|Casa": { piso: 646, teto: 6047, p05: 760, p1: 779, p995: 5258, mediana: 1990, escrituras: 49, janela: "5 anos" },
  "JARDIM AMERICA|Apartamento": { piso: 1070, teto: 7552, p05: 1259, p1: 1357, p995: 6567, mediana: 2571, escrituras: 120, janela: "5 anos" },
  "JARDIM AMERICA|Casa": { piso: 755, teto: 12955, p05: 888, p1: 926, p995: 11265, mediana: 2589, escrituras: 164, janela: "5 anos" },
  "JARDIM BOTANICO|Apartamento": { piso: 3885, teto: 32789, p05: 4570, p1: 5919, p995: 28512, mediana: 13904, escrituras: 673, janela: "3 anos" },
  "JARDIM BOTANICO|Casa": { piso: 2975, teto: 55064, p05: 3500, p1: 4237, p995: 47882, mediana: 14857, escrituras: 171, janela: "5 anos" },
  "JARDIM BOTANICO|Comercial": { piso: 2941, teto: 33486, p05: 3460, p1: 3723, p995: 29118, mediana: 13863, escrituras: 116, janela: "5 anos" },
  "JARDIM CARIOCA|Apartamento": { piso: 719, teto: 11086, p05: 846, p1: 1636, p995: 9640, mediana: 4872, escrituras: 208, janela: "5 anos" },
  "JARDIM CARIOCA|Casa": { piso: 742, teto: 13695, p05: 873, p1: 936, p995: 11909, mediana: 2649, escrituras: 102, janela: "5 anos" },
  "JARDIM CARIOCA|Comercial": { piso: 1688, teto: 42927, p05: 1986, p1: 2038, p995: 37328, mediana: 5741, escrituras: 30, janela: "5 anos" },
  "JARDIM GUANABARA|Apartamento": { piso: 1683, teto: 15303, p05: 1980, p1: 2225, p995: 13307, mediana: 5693, escrituras: 926, janela: "3 anos" },
  "JARDIM GUANABARA|Casa": { piso: 1279, teto: 13618, p05: 1505, p1: 1605, p995: 11842, mediana: 4076, escrituras: 230, janela: "3 anos" },
  "JARDIM GUANABARA|Comercial": { piso: 1263, teto: 30667, p05: 1486, p1: 1705, p995: 26667, mediana: 5719, escrituras: 82, janela: "5 anos" },
  "JARDIM SULACAP|Apartamento": { piso: 1723, teto: 9422, p05: 2027, p1: 2049, p995: 8193, mediana: 4589, escrituras: 302, janela: "5 anos" },
  "JARDIM SULACAP|Casa": { piso: 893, teto: 9885, p05: 1050, p1: 1104, p995: 8596, mediana: 3200, escrituras: 162, janela: "5 anos" },
  "JOA|Casa": { piso: 1565, teto: 35781, p05: 1841, p1: 1931, p995: 31114, mediana: 8078, escrituras: 39, janela: "5 anos" },
  "LAGOA|Apartamento": { piso: 6014, teto: 47685, p05: 7075, p1: 7429, p995: 41465, mediana: 15162, escrituras: 938, janela: "3 anos" },
  "LARANJEIRAS|Apartamento": { piso: 3566, teto: 23842, p05: 4195, p1: 4781, p995: 20732, mediana: 9746, escrituras: 1959, janela: "3 anos" },
  "LARANJEIRAS|Casa": { piso: 1658, teto: 18669, p05: 1950, p1: 2269, p995: 16234, mediana: 6951, escrituras: 94, janela: "5 anos" },
  "LARANJEIRAS|Comercial": { piso: 823, teto: 36812, p05: 968, p1: 968, p995: 32010, mediana: 8075, escrituras: 30, janela: "5 anos" },
  "LEBLON|Apartamento": { piso: 8520, teto: 71100, p05: 10023, p1: 11120, p995: 61826, mediana: 21958, escrituras: 2400, janela: "3 anos" },
  "LEBLON|Comercial": { piso: 7549, teto: 94544, p05: 8881, p1: 9526, p995: 82212, mediana: 27754, escrituras: 200, janela: "5 anos" },
  "LEME|Apartamento": { piso: 3619, teto: 40214, p05: 4258, p1: 5034, p995: 34969, mediana: 12214, escrituras: 596, janela: "3 anos" },
  "LINS DE VASCONCELOS|Apartamento": { piso: 886, teto: 8677, p05: 1042, p1: 1185, p995: 7545, mediana: 3026, escrituras: 403, janela: "3 anos" },
  "LINS DE VASCONCELOS|Casa": { piso: 828, teto: 14376, p05: 974, p1: 1044, p995: 12501, mediana: 3373, escrituras: 146, janela: "5 anos" },
  "MADUREIRA|Apartamento": { piso: 811, teto: 7289, p05: 954, p1: 1063, p995: 6338, mediana: 3207, escrituras: 372, janela: "3 anos" },
  "MADUREIRA|Casa": { piso: 699, teto: 13247, p05: 822, p1: 890, p995: 11519, mediana: 2471, escrituras: 206, janela: "5 anos" },
  "MADUREIRA|Comercial": { piso: 1595, teto: 48981, p05: 1876, p1: 1899, p995: 42592, mediana: 4768, escrituras: 213, janela: "5 anos" },
  "MAGALHAES BASTOS|Apartamento": { piso: 1229, teto: 6947, p05: 1446, p1: 1447, p995: 6041, mediana: 2693, escrituras: 30, janela: "5 anos" },
  "MAGALHAES BASTOS|Casa": { piso: 709, teto: 6695, p05: 834, p1: 853, p995: 5822, mediana: 2135, escrituras: 70, janela: "5 anos" },
  "MARACANA|Apartamento": { piso: 2226, teto: 16711, p05: 2619, p1: 2879, p995: 14531, mediana: 6638, escrituras: 1161, janela: "3 anos" },
  "MARACANA|Casa": { piso: 1873, teto: 16064, p05: 2204, p1: 2270, p995: 13969, mediana: 3913, escrituras: 94, janela: "5 anos" },
  "MARACANA|Comercial": { piso: 1887, teto: 16811, p05: 3050, p1: 3053, p995: 14618, mediana: 3773, escrituras: 35, janela: "5 anos" },
  "MARECHAL HERMES|Apartamento": { piso: 765, teto: 12003, p05: 900, p1: 900, p995: 10437, mediana: 5455, escrituras: 327, janela: "5 anos" },
  "MARECHAL HERMES|Casa": { piso: 774, teto: 13409, p05: 911, p1: 980, p995: 11660, mediana: 3222, escrituras: 190, janela: "5 anos" },
  "MARIA DA GRACA|Apartamento": { piso: 1359, teto: 9222, p05: 1599, p1: 1733, p995: 8019, mediana: 3526, escrituras: 216, janela: "5 anos" },
  "MARIA DA GRACA|Casa": { piso: 836, teto: 12236, p05: 983, p1: 1064, p995: 10640, mediana: 2497, escrituras: 70, janela: "5 anos" },
  "MEIER|Apartamento": { piso: 1549, teto: 10002, p05: 1822, p1: 1992, p995: 8697, mediana: 4070, escrituras: 1249, janela: "3 anos" },
  "MEIER|Casa": { piso: 981, teto: 16819, p05: 1154, p1: 1349, p995: 14625, mediana: 4155, escrituras: 321, janela: "5 anos" },
  "MEIER|Comercial": { piso: 1720, teto: 30715, p05: 2024, p1: 2067, p995: 26709, mediana: 4426, escrituras: 241, janela: "5 anos" },
  "MONERO|Apartamento": { piso: 2004, teto: 13716, p05: 2358, p1: 2397, p995: 11927, mediana: 4916, escrituras: 189, janela: "5 anos" },
  "MONERO|Casa": { piso: 1518, teto: 15137, p05: 1786, p1: 1789, p995: 13163, mediana: 4154, escrituras: 47, janela: "5 anos" },
  "OLARIA|Apartamento": { piso: 1168, teto: 10685, p05: 1374, p1: 1544, p995: 9291, mediana: 3671, escrituras: 386, janela: "3 anos" },
  "OLARIA|Casa": { piso: 929, teto: 16416, p05: 1093, p1: 1252, p995: 14275, mediana: 3433, escrituras: 282, janela: "5 anos" },
  "OLARIA|Comercial": { piso: 998, teto: 7820, p05: 1174, p1: 1261, p995: 6800, mediana: 2717, escrituras: 47, janela: "5 anos" },
  "OSVALDO CRUZ|Apartamento": { piso: 947, teto: 9206, p05: 1114, p1: 1274, p995: 8005, mediana: 3238, escrituras: 137, janela: "5 anos" },
  "OSVALDO CRUZ|Casa": { piso: 830, teto: 20073, p05: 976, p1: 1000, p995: 17455, mediana: 3262, escrituras: 159, janela: "5 anos" },
  "PACIENCIA|Apartamento": { piso: 753, teto: 7362, p05: 886, p1: 932, p995: 4514, mediana: 3681, escrituras: 256, janela: "5 anos" },
  "PACIENCIA|Casa": { piso: 608, teto: 6749, p05: 715, p1: 778, p995: 5869, mediana: 2122, escrituras: 83, janela: "5 anos" },
  "PADRE MIGUEL|Apartamento": { piso: 961, teto: 6410, p05: 1130, p1: 1131, p995: 5574, mediana: 2727, escrituras: 87, janela: "5 anos" },
  "PADRE MIGUEL|Casa": { piso: 731, teto: 7518, p05: 860, p1: 902, p995: 6537, mediana: 2191, escrituras: 178, janela: "5 anos" },
  "PADRE MIGUEL|Comercial": { piso: 772, teto: 8947, p05: 908, p1: 911, p995: 7780, mediana: 1639, escrituras: 33, janela: "5 anos" },
  "PAQUETA|Apartamento": { piso: 1437, teto: 12628, p05: 1691, p1: 1838, p995: 10981, mediana: 4982, escrituras: 85, janela: "5 anos" },
  "PAQUETA|Casa": { piso: 1278, teto: 14684, p05: 1504, p1: 1587, p995: 12769, mediana: 4851, escrituras: 80, janela: "5 anos" },
  "PARADA DE LUCAS|Apartamento": { piso: 786, teto: 10957, p05: 925, p1: 925, p995: 9528, mediana: 5462, escrituras: 244, janela: "3 anos" },
  "PARQUE ANCHIETA|Apartamento": { piso: 963, teto: 13196, p05: 1133, p1: 1165, p995: 11475, mediana: 2790, escrituras: 43, janela: "5 anos" },
  "PARQUE ANCHIETA|Casa": { piso: 736, teto: 10490, p05: 866, p1: 908, p995: 9122, mediana: 2149, escrituras: 110, janela: "5 anos" },
  "PARQUE COLUMBIA|Apartamento": { piso: 653, teto: 10164, p05: 768, p1: 877, p995: 6202, mediana: 5082, escrituras: 69, janela: "5 anos" },
  "PAVUNA|Apartamento": { piso: 780, teto: 9796, p05: 918, p1: 981, p995: 8518, mediana: 3957, escrituras: 255, janela: "5 anos" },
  "PAVUNA|Casa": { piso: 589, teto: 10480, p05: 693, p1: 733, p995: 9113, mediana: 2553, escrituras: 266, janela: "5 anos" },
  "PECHINCHA|Apartamento": { piso: 1684, teto: 9583, p05: 1981, p1: 2135, p995: 8333, mediana: 4780, escrituras: 1620, janela: "3 anos" },
  "PECHINCHA|Casa": { piso: 580, teto: 11254, p05: 682, p1: 872, p995: 9786, mediana: 3504, escrituras: 254, janela: "3 anos" },
  "PECHINCHA|Comercial": { piso: 1243, teto: 12706, p05: 1462, p1: 1787, p995: 11049, mediana: 3805, escrituras: 203, janela: "5 anos" },
  "PEDRA DE GUARATIBA|Casa": { piso: 554, teto: 7443, p05: 652, p1: 730, p995: 6472, mediana: 2985, escrituras: 167, janela: "5 anos" },
  "PENHA CIRCULAR|Apartamento": { piso: 861, teto: 9911, p05: 1013, p1: 1300, p995: 8618, mediana: 3003, escrituras: 373, janela: "3 anos" },
  "PENHA CIRCULAR|Casa": { piso: 693, teto: 9126, p05: 815, p1: 960, p995: 7936, mediana: 2670, escrituras: 214, janela: "5 anos" },
  "PENHA CIRCULAR|Comercial": { piso: 622, teto: 12610, p05: 732, p1: 786, p995: 10965, mediana: 1780, escrituras: 73, janela: "5 anos" },
  "PENHA|Apartamento": { piso: 1012, teto: 10773, p05: 1190, p1: 1249, p995: 9368, mediana: 4090, escrituras: 553, janela: "3 anos" },
  "PENHA|Casa": { piso: 709, teto: 8860, p05: 834, p1: 955, p995: 7704, mediana: 2538, escrituras: 251, janela: "5 anos" },
  "PENHA|Comercial": { piso: 1029, teto: 21092, p05: 1210, p1: 1250, p995: 18341, mediana: 4703, escrituras: 183, janela: "5 anos" },
  "PIEDADE|Apartamento": { piso: 1004, teto: 9626, p05: 1181, p1: 1228, p995: 8370, mediana: 3640, escrituras: 382, janela: "3 anos" },
  "PIEDADE|Casa": { piso: 681, teto: 8415, p05: 801, p1: 818, p995: 7317, mediana: 2441, escrituras: 209, janela: "3 anos" },
  "PILARES|Apartamento": { piso: 1053, teto: 8451, p05: 1239, p1: 1410, p995: 7349, mediana: 3155, escrituras: 219, janela: "5 anos" },
  "PILARES|Casa": { piso: 728, teto: 11935, p05: 857, p1: 904, p995: 10378, mediana: 3394, escrituras: 118, janela: "5 anos" },
  "PILARES|Comercial": { piso: 1195, teto: 17233, p05: 1406, p1: 1672, p995: 14985, mediana: 4076, escrituras: 120, janela: "5 anos" },
  "PITANGUEIRAS|Apartamento": { piso: 2259, teto: 10134, p05: 2658, p1: 2687, p995: 8255, mediana: 5067, escrituras: 74, janela: "5 anos" },
  "PITANGUEIRAS|Casa": { piso: 848, teto: 10044, p05: 998, p1: 1016, p995: 8734, mediana: 2903, escrituras: 46, janela: "5 anos" },
  "PORTUGUESA|Apartamento": { piso: 1531, teto: 10957, p05: 1801, p1: 2104, p995: 9528, mediana: 4838, escrituras: 247, janela: "5 anos" },
  "PORTUGUESA|Casa": { piso: 980, teto: 12872, p05: 1153, p1: 1172, p995: 11193, mediana: 3892, escrituras: 163, janela: "5 anos" },
  "PRACA DA BANDEIRA|Apartamento": { piso: 1880, teto: 11894, p05: 2212, p1: 2371, p995: 10343, mediana: 5647, escrituras: 245, janela: "3 anos" },
  "PRACA DA BANDEIRA|Casa": { piso: 1301, teto: 14045, p05: 1530, p1: 1552, p995: 12213, mediana: 4129, escrituras: 40, janela: "5 anos" },
  "PRACA DA BANDEIRA|Comercial": { piso: 1165, teto: 13691, p05: 1371, p1: 1423, p995: 11905, mediana: 2686, escrituras: 38, janela: "5 anos" },
  "PRACA SECA|Apartamento": { piso: 895, teto: 9827, p05: 1053, p1: 1129, p995: 8545, mediana: 2679, escrituras: 740, janela: "3 anos" },
  "PRACA SECA|Casa": { piso: 581, teto: 6243, p05: 684, p1: 739, p995: 5429, mediana: 2221, escrituras: 241, janela: "3 anos" },
  "PRAIA DA BANDEIRA|Apartamento": { piso: 1588, teto: 9428, p05: 1868, p1: 1915, p995: 7623, mediana: 4714, escrituras: 93, janela: "5 anos" },
  "QUINTINO BOCAIUVA|Apartamento": { piso: 940, teto: 7480, p05: 1106, p1: 1249, p995: 6504, mediana: 3289, escrituras: 311, janela: "5 anos" },
  "QUINTINO BOCAIUVA|Casa": { piso: 742, teto: 8649, p05: 873, p1: 892, p995: 7521, mediana: 2316, escrituras: 229, janela: "5 anos" },
  "RAMOS|Apartamento": { piso: 1111, teto: 9436, p05: 1307, p1: 1371, p995: 8205, mediana: 4176, escrituras: 415, janela: "3 anos" },
  "RAMOS|Casa": { piso: 847, teto: 17276, p05: 997, p1: 1193, p995: 15023, mediana: 3335, escrituras: 234, janela: "5 anos" },
  "RAMOS|Comercial": { piso: 729, teto: 27429, p05: 858, p1: 955, p995: 23851, mediana: 2416, escrituras: 50, janela: "5 anos" },
  "REALENGO|Apartamento": { piso: 740, teto: 6932, p05: 871, p1: 915, p995: 6028, mediana: 3572, escrituras: 223, janela: "3 anos" },
  "REALENGO|Casa": { piso: 636, teto: 8823, p05: 748, p1: 806, p995: 7672, mediana: 1907, escrituras: 206, janela: "3 anos" },
  "RECREIO DOS BANDEIRANTES|Apartamento": { piso: 2381, teto: 16927, p05: 2801, p1: 3220, p995: 14719, mediana: 7134, escrituras: 6633, janela: "3 anos" },
  "RECREIO DOS BANDEIRANTES|Casa": { piso: 1516, teto: 19204, p05: 1783, p1: 2567, p995: 16699, mediana: 6828, escrituras: 700, janela: "3 anos" },
  "RECREIO DOS BANDEIRANTES|Comercial": { piso: 2032, teto: 17765, p05: 2391, p1: 2434, p995: 15448, mediana: 5372, escrituras: 541, janela: "3 anos" },
  "RIACHUELO|Apartamento": { piso: 1127, teto: 9819, p05: 1326, p1: 1464, p995: 8538, mediana: 3700, escrituras: 297, janela: "3 anos" },
  "RIACHUELO|Casa": { piso: 927, teto: 10382, p05: 1091, p1: 1099, p995: 9028, mediana: 2435, escrituras: 102, janela: "5 anos" },
  "RIBEIRA|Apartamento": { piso: 1850, teto: 11883, p05: 2177, p1: 2298, p995: 10333, mediana: 5496, escrituras: 195, janela: "5 anos" },
  "RICARDO DE ALBUQUERQUE|Casa": { piso: 502, teto: 11625, p05: 591, p1: 592, p995: 10109, mediana: 2421, escrituras: 67, janela: "5 anos" },
  "RIO COMPRIDO|Apartamento": { piso: 1248, teto: 12180, p05: 1468, p1: 1585, p995: 10591, mediana: 5663, escrituras: 1066, janela: "3 anos" },
  "RIO COMPRIDO|Casa": { piso: 711, teto: 14324, p05: 837, p1: 894, p995: 12456, mediana: 2520, escrituras: 108, janela: "5 anos" },
  "RIO COMPRIDO|Comercial": { piso: 814, teto: 7994, p05: 958, p1: 1135, p995: 6018, mediana: 3997, escrituras: 77, janela: "5 anos" },
  "ROCHA MIRANDA|Apartamento": { piso: 963, teto: 8055, p05: 1133, p1: 1155, p995: 7004, mediana: 3329, escrituras: 140, janela: "5 anos" },
  "ROCHA MIRANDA|Casa": { piso: 506, teto: 20038, p05: 595, p1: 634, p995: 17424, mediana: 2753, escrituras: 137, janela: "5 anos" },
  "ROCHA|Apartamento": { piso: 1142, teto: 8084, p05: 1343, p1: 1385, p995: 7030, mediana: 3207, escrituras: 258, janela: "5 anos" },
  "ROCHA|Casa": { piso: 713, teto: 10672, p05: 839, p1: 895, p995: 9280, mediana: 2485, escrituras: 76, janela: "5 anos" },
  "SAMPAIO|Apartamento": { piso: 996, teto: 7744, p05: 1172, p1: 1233, p995: 6734, mediana: 2832, escrituras: 124, janela: "5 anos" },
  "SAMPAIO|Casa": { piso: 735, teto: 6611, p05: 865, p1: 876, p995: 5749, mediana: 2381, escrituras: 46, janela: "5 anos" },
  "SANTA CRUZ|Apartamento": { piso: 827, teto: 7337, p05: 973, p1: 1047, p995: 6380, mediana: 3885, escrituras: 2271, janela: "3 anos" },
  "SANTA CRUZ|Casa": { piso: 599, teto: 37844, p05: 705, p1: 709, p995: 32908, mediana: 2715, escrituras: 135, janela: "5 anos" },
  "SANTA CRUZ|Comercial": { piso: 1282, teto: 28569, p05: 1508, p1: 1524, p995: 24843, mediana: 3282, escrituras: 46, janela: "5 anos" },
  "SANTA TERESA|Apartamento": { piso: 1802, teto: 19551, p05: 2120, p1: 2257, p995: 17001, mediana: 6082, escrituras: 556, janela: "3 anos" },
  "SANTA TERESA|Casa": { piso: 949, teto: 31670, p05: 1116, p1: 1272, p995: 27539, mediana: 4400, escrituras: 168, janela: "5 anos" },
  "SANTISSIMO|Apartamento": { piso: 1055, teto: 5878, p05: 1241, p1: 1313, p995: 5111, mediana: 3913, escrituras: 335, janela: "3 anos" },
  "SANTISSIMO|Casa": { piso: 661, teto: 8435, p05: 778, p1: 839, p995: 7335, mediana: 3902, escrituras: 177, janela: "5 anos" },
  "SANTO CRISTO|Apartamento": { piso: 2665, teto: 18083, p05: 3135, p1: 4769, p995: 15724, mediana: 9820, escrituras: 2742, janela: "3 anos" },
  "SANTO CRISTO|Casa": { piso: 626, teto: 7246, p05: 736, p1: 776, p995: 6301, mediana: 2002, escrituras: 50, janela: "5 anos" },
  "SANTO CRISTO|Comercial": { piso: 997, teto: 21257, p05: 1173, p1: 1216, p995: 18484, mediana: 8816, escrituras: 41, janela: "5 anos" },
  "SAO CONRADO|Apartamento": { piso: 2741, teto: 46118, p05: 3225, p1: 4251, p995: 40103, mediana: 12077, escrituras: 434, janela: "3 anos" },
  "SAO CONRADO|Casa": { piso: 863, teto: 45217, p05: 1015, p1: 1408, p995: 39319, mediana: 7856, escrituras: 64, janela: "5 anos" },
  "SAO CONRADO|Comercial": { piso: 2635, teto: 28875, p05: 3100, p1: 3148, p995: 25109, mediana: 8466, escrituras: 55, janela: "5 anos" },
  "SAO CRISTOVAO|Apartamento": { piso: 1796, teto: 13227, p05: 2113, p1: 2332, p995: 11502, mediana: 7939, escrituras: 1582, janela: "3 anos" },
  "SAO CRISTOVAO|Casa": { piso: 841, teto: 13074, p05: 989, p1: 1071, p995: 11369, mediana: 3277, escrituras: 136, janela: "5 anos" },
  "SAO CRISTOVAO|Comercial": { piso: 1018, teto: 14239, p05: 1198, p1: 1198, p995: 12382, mediana: 5059, escrituras: 178, janela: "5 anos" },
  "SAO FRANCISCO XAVIER|Apartamento": { piso: 1412, teto: 10224, p05: 1661, p1: 1900, p995: 8890, mediana: 7256, escrituras: 477, janela: "3 anos" },
  "SAUDE|Comercial": { piso: 1054, teto: 17778, p05: 1240, p1: 1272, p995: 15459, mediana: 2544, escrituras: 80, janela: "5 anos" },
  "SENADOR CAMARA|Apartamento": { piso: 745, teto: 5816, p05: 876, p1: 995, p995: 5057, mediana: 2447, escrituras: 195, janela: "5 anos" },
  "SENADOR CAMARA|Casa": { piso: 630, teto: 8156, p05: 741, p1: 781, p995: 7092, mediana: 2396, escrituras: 146, janela: "5 anos" },
  "SENADOR VASCONCELOS|Apartamento": { piso: 870, teto: 5148, p05: 1023, p1: 1135, p995: 3862, mediana: 2574, escrituras: 46, janela: "5 anos" },
  "SENADOR VASCONCELOS|Casa": { piso: 648, teto: 6733, p05: 762, p1: 817, p995: 5855, mediana: 2537, escrituras: 106, janela: "5 anos" },
  "TANQUE|Apartamento": { piso: 1360, teto: 11208, p05: 1600, p1: 1671, p995: 9746, mediana: 3885, escrituras: 333, janela: "3 anos" },
  "TANQUE|Casa": { piso: 614, teto: 13187, p05: 722, p1: 880, p995: 11467, mediana: 2766, escrituras: 177, janela: "5 anos" },
  "TANQUE|Comercial": { piso: 1162, teto: 18766, p05: 1367, p1: 1534, p995: 16318, mediana: 4005, escrituras: 64, janela: "5 anos" },
  "TAQUARA|Apartamento": { piso: 1559, teto: 11753, p05: 1834, p1: 1945, p995: 10220, mediana: 4679, escrituras: 2149, janela: "3 anos" },
  "TAQUARA|Casa": { piso: 750, teto: 12481, p05: 882, p1: 1071, p995: 10853, mediana: 3200, escrituras: 425, janela: "3 anos" },
  "TAQUARA|Comercial": { piso: 1199, teto: 22762, p05: 1411, p1: 1645, p995: 19793, mediana: 4446, escrituras: 311, janela: "5 anos" },
  "TAUA|Apartamento": { piso: 1408, teto: 10440, p05: 1657, p1: 1810, p995: 9078, mediana: 3793, escrituras: 222, janela: "3 anos" },
  "TAUA|Casa": { piso: 590, teto: 12191, p05: 694, p1: 725, p995: 10601, mediana: 2847, escrituras: 101, janela: "5 anos" },
  "TIJUCA|Apartamento": { piso: 1854, teto: 15076, p05: 2181, p1: 2521, p995: 13110, mediana: 6077, escrituras: 5707, janela: "3 anos" },
  "TIJUCA|Casa": { piso: 1193, teto: 18694, p05: 1404, p1: 1475, p995: 16256, mediana: 5108, escrituras: 251, janela: "3 anos" },
  "TIJUCA|Comercial": { piso: 1736, teto: 29256, p05: 2042, p1: 2119, p995: 25440, mediana: 5609, escrituras: 509, janela: "3 anos" },
  "TODOS OS SANTOS|Apartamento": { piso: 1439, teto: 10827, p05: 1693, p1: 1905, p995: 9415, mediana: 5469, escrituras: 1006, janela: "3 anos" },
  "TODOS OS SANTOS|Casa": { piso: 1182, teto: 16201, p05: 1390, p1: 1447, p995: 14088, mediana: 3499, escrituras: 163, janela: "5 anos" },
  "TODOS OS SANTOS|Comercial": { piso: 1574, teto: 18063, p05: 1852, p1: 2077, p995: 15707, mediana: 4668, escrituras: 249, janela: "5 anos" },
  "TOMAS COELHO|Apartamento": { piso: 991, teto: 8674, p05: 1166, p1: 1274, p995: 5095, mediana: 4337, escrituras: 144, janela: "5 anos" },
  "TOMAS COELHO|Casa": { piso: 522, teto: 8815, p05: 614, p1: 635, p995: 7665, mediana: 2290, escrituras: 55, janela: "5 anos" },
  "TURIACU|Apartamento": { piso: 1034, teto: 6990, p05: 1216, p1: 1238, p995: 6078, mediana: 2542, escrituras: 57, janela: "5 anos" },
  "TURIACU|Casa": { piso: 592, teto: 9358, p05: 696, p1: 746, p995: 8137, mediana: 2341, escrituras: 42, janela: "5 anos" },
  "URCA|Apartamento": { piso: 6690, teto: 31027, p05: 7871, p1: 8327, p995: 26980, mediana: 13838, escrituras: 216, janela: "5 anos" },
  "URCA|Casa": { piso: 4644, teto: 32885, p05: 5464, p1: 5497, p995: 28596, mediana: 12225, escrituras: 36, janela: "5 anos" },
  "VARGEM GRANDE|Apartamento": { piso: 2303, teto: 9396, p05: 2709, p1: 2816, p995: 8170, mediana: 5542, escrituras: 373, janela: "3 anos" },
  "VARGEM GRANDE|Casa": { piso: 936, teto: 11356, p05: 1101, p1: 1433, p995: 9875, mediana: 5646, escrituras: 224, janela: "5 anos" },
  "VARGEM PEQUENA|Apartamento": { piso: 1988, teto: 8937, p05: 2339, p1: 2359, p995: 7771, mediana: 4833, escrituras: 330, janela: "3 anos" },
  "VARGEM PEQUENA|Casa": { piso: 932, teto: 16271, p05: 1097, p1: 1403, p995: 14149, mediana: 4745, escrituras: 283, janela: "3 anos" },
  "VASCO DA GAMA|Apartamento": { piso: 1142, teto: 9864, p05: 1343, p1: 1741, p995: 8104, mediana: 4932, escrituras: 131, janela: "5 anos" },
  "VASCO DA GAMA|Casa": { piso: 742, teto: 15128, p05: 873, p1: 1070, p995: 13155, mediana: 3667, escrituras: 43, janela: "5 anos" },
  "VAZ LOBO|Apartamento": { piso: 550, teto: 8715, p05: 647, p1: 1145, p995: 7578, mediana: 3141, escrituras: 236, janela: "5 anos" },
  "VAZ LOBO|Casa": { piso: 693, teto: 10940, p05: 815, p1: 854, p995: 9513, mediana: 2815, escrituras: 60, janela: "5 anos" },
  "VICENTE DE CARVALHO|Apartamento": { piso: 1097, teto: 9944, p05: 1291, p1: 1328, p995: 8647, mediana: 4900, escrituras: 287, janela: "5 anos" },
  "VICENTE DE CARVALHO|Casa": { piso: 1131, teto: 18685, p05: 1331, p1: 1373, p995: 16248, mediana: 2846, escrituras: 100, janela: "5 anos" },
  "VICENTE DE CARVALHO|Comercial": { piso: 1782, teto: 16511, p05: 2097, p1: 2251, p995: 14357, mediana: 6208, escrituras: 137, janela: "5 anos" },
  "VIDIGAL|Apartamento": { piso: 2271, teto: 55721, p05: 2672, p1: 2720, p995: 48453, mediana: 6973, escrituras: 48, janela: "5 anos" },
  "VIGARIO GERAL|Apartamento": { piso: 913, teto: 5357, p05: 1074, p1: 1095, p995: 4658, mediana: 2127, escrituras: 48, janela: "5 anos" },
  "VIGARIO GERAL|Casa": { piso: 774, teto: 17463, p05: 911, p1: 915, p995: 15185, mediana: 2784, escrituras: 55, janela: "5 anos" },
  "VILA DA PENHA|Apartamento": { piso: 1466, teto: 10527, p05: 1725, p1: 1795, p995: 9154, mediana: 4456, escrituras: 610, janela: "3 anos" },
  "VILA DA PENHA|Casa": { piso: 1045, teto: 12273, p05: 1229, p1: 1397, p995: 10672, mediana: 3407, escrituras: 187, janela: "5 anos" },
  "VILA DA PENHA|Comercial": { piso: 867, teto: 13036, p05: 1020, p1: 1057, p995: 11336, mediana: 5269, escrituras: 97, janela: "5 anos" },
  "VILA ISABEL|Apartamento": { piso: 1221, teto: 13072, p05: 1436, p1: 1609, p995: 11367, mediana: 4782, escrituras: 1893, janela: "3 anos" },
  "VILA ISABEL|Casa": { piso: 930, teto: 13579, p05: 1094, p1: 1241, p995: 11808, mediana: 3961, escrituras: 291, janela: "5 anos" },
  "VILA ISABEL|Comercial": { piso: 1574, teto: 21298, p05: 1852, p1: 1859, p995: 18520, mediana: 4356, escrituras: 191, janela: "5 anos" },
  "VILA KOSMOS|Apartamento": { piso: 1274, teto: 9324, p05: 1499, p1: 1512, p995: 8108, mediana: 3442, escrituras: 102, janela: "5 anos" },
  "VILA KOSMOS|Casa": { piso: 795, teto: 22476, p05: 935, p1: 1004, p995: 19544, mediana: 3171, escrituras: 119, janela: "5 anos" },
  "VILA VALQUEIRE|Apartamento": { piso: 1294, teto: 11407, p05: 1522, p1: 1737, p995: 9919, mediana: 4404, escrituras: 564, janela: "3 anos" },
  "VILA VALQUEIRE|Casa": { piso: 583, teto: 17837, p05: 686, p1: 905, p995: 15510, mediana: 3590, escrituras: 345, janela: "5 anos" },
  "VILA VALQUEIRE|Comercial": { piso: 2371, teto: 16333, p05: 2789, p1: 3035, p995: 14203, mediana: 5193, escrituras: 38, janela: "5 anos" },
  "VISTA ALEGRE|Apartamento": { piso: 1524, teto: 11627, p05: 1793, p1: 1859, p995: 10110, mediana: 4309, escrituras: 134, janela: "5 anos" },
  "VISTA ALEGRE|Casa": { piso: 1050, teto: 18694, p05: 1235, p1: 1294, p995: 16256, mediana: 3879, escrituras: 70, janela: "5 anos" },
  "ZUMBI|Apartamento": { piso: 2035, teto: 10702, p05: 2394, p1: 2723, p995: 8309, mediana: 5351, escrituras: 92, janela: "5 anos" },
};

/** Normaliza o nome do bairro: maiúsculas, sem acentos, espaços colapsados. */
export const normalizeBairro = (bairro: string | null | undefined): string =>
  (bairro || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

type TipologiaCinto = "Apartamento" | "Casa" | "Comercial";

const normalizeTipologia = (tipologia: string | null | undefined): TipologiaCinto | null => {
  const t = (tipologia || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!t) return null;
  if (t.includes("casa")) return "Casa";
  if (t.includes("apartamento") || t.includes("cobertura") || t.includes("flat")) return "Apartamento";
  if (["comercial", "sala", "loja", "escritorio"].some((k) => t.includes(k))) return "Comercial";
  return null;
};

/** Pares residenciais do bairro (Comercial fica de fora para o teto da loja não afrouxar o residencial). */
const entriesForBairro = (bairro: string | null | undefined): OutlierLimitEntry[] => {
  const nome = normalizeBairro(bairro);
  return ["Apartamento", "Casa"]
    .map((t) => OUTLIER_LIMITS_TABLE[`${nome}|${t}`])
    .filter((e): e is OutlierLimitEntry => Boolean(e));
};

/** Piso em preço do último trimestre convertido para preço da época (linhas de até 5 anos). */
const pisoNominal = (piso: number): number => Math.round(piso / FATOR_INDICE_5_ANOS);
/** Teto em preço do último trimestre convertido para preço da época (linhas de até 5 anos). */
const tetoNominal = (teto: number): number => Math.round(teto / FATOR_MIN_INDICE_5_ANOS);

/**
 * Piso e teto para filtrar linhas de itbi_transactions (preço da época).
 *   1. par exato bairro × tipologia (Apartamento, Casa ou Comercial);
 *   2. senão, menor piso e maior teto entre Apartamento e Casa do bairro;
 *   3. senão, faixa da cidade.
 * Piso e teto saem convertidos para preço da época (ver cabeçalho).
 */
export const getOutlierLimits = (
  bairro: string | null | undefined,
  tipologia?: string | null
): { piso: number; teto: number; calibrado: boolean } => {
  const tip = normalizeTipologia(tipologia);
  if (tip) {
    const exact = OUTLIER_LIMITS_TABLE[`${normalizeBairro(bairro)}|${tip}`];
    if (exact) return { piso: pisoNominal(exact.piso), teto: tetoNominal(exact.teto), calibrado: true };
  }
  const entries = entriesForBairro(bairro);
  if (entries.length > 0) {
    return {
      piso: pisoNominal(Math.min(...entries.map((e) => e.piso))),
      teto: tetoNominal(Math.max(...entries.map((e) => e.teto))),
      calibrado: true,
    };
  }
  return { piso: DEFAULT_OUTLIER_MIN, teto: tetoNominal(FAIXA_SEM_CALIBRACAO_TETO), calibrado: false };
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
