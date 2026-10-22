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
// Última geração: 2026-10-22, 313 pares, 142 excluídos por amostra,
// 124035 escrituras residenciais na faixa da cidade.
// CSVs: bloco74-escrituras-sem-fora-de-mercado-2026-10-22.csv e bloco74b-cidade-sem-fora-de-mercado-2026-10-22.csv.
/** Faixa da cidade (consulta 7.4b), em preço do último trimestre do índice. Carregada em itbi_cinto como CIDADE|*. */
export const FAIXA_SEM_CALIBRACAO_PISO = 973;
export const FAIXA_SEM_CALIBRACAO_TETO = 42601;
/** Maior razão preço de hoje ÷ preço da época entre os trimestres da janela de 5 anos (consulta 7.4b). */
export const FATOR_INDICE_5_ANOS = 1.205;
/** Menor razão na mesma janela (trimestre mais caro que o último fica abaixo de 1). Converte o teto. */
export const FATOR_MIN_INDICE_5_ANOS = 0.9705;
/** Piso sem bairro calibrado, já em preço da época (FAIXA_SEM_CALIBRACAO_PISO ÷ FATOR_INDICE_5_ANOS). */
export const DEFAULT_OUTLIER_MIN = 807;
/** Teto sem bairro, em preço da época: maior teto de Apartamento/Casa da faixa padrão (3 anos), 84397, ÷ FATOR_MIN_INDICE_5_ANOS. */
export const DEFAULT_OUTLIER_MAX = 86962;
// </cinto:constantes>
export const PISO_MARGIN = 0.85;
export const TETO_MARGIN = 1.15;
/** Abaixo disso (escrituras em 3 anos) o par usa a janela de 5 anos e a largura mínima. */
export const SMALL_SAMPLE_ESCRITURAS = 200;
/** Largura mínima do cinto em amostra pequena: [mediana / 2; mediana × 2]. */
export const SMALL_SAMPLE_WIDTH = 2;

/**
 * Regras por prédio aplicadas no banco por itbi_aplicar_cinto
 * (supabase/migrations/20261021230000_itbi_cinto_regras_predio.sql).
 * Prédio = mesmo cl, número, bairro e tipologia. Referências = outras
 * escrituras do prédio, de qualquer data, com preço corrigido dentro do cinto.
 *   - fora de mercado: com MIN_REFERENCIAS ou mais referências de área parecida
 *     (área ÷ TOLERANCIA_AREA a área × TOLERANCIA_AREA), R$/m² de no máximo
 *     FATOR_FORA_MERCADO × a mediana delas;
 *   - exceção: escritura acima do teto com MIN_REFERENCIAS ou mais referências
 *     e R$/m² entre EXCECAO_MIN e EXCECAO_MAX × a mediana delas não é cortada.
 * O teste regraPredio.test.ts confere que a migration usa estes valores.
 */
export const REGRA_PREDIO = {
  FATOR_FORA_MERCADO: 0.5,
  TOLERANCIA_AREA: 1.25,
  MIN_REFERENCIAS: 2,
  EXCECAO_MIN: 0.67,
  EXCECAO_MAX: 1.5,
} as const;

export type SituacaoEscritura = "aceita" | "fora_do_cinto" | "fora_de_mercado";

export interface ReferenciasPredio {
  /** Quantidade de referências. */
  n: number;
  /** Mediana do R$/m² corrigido das referências (null sem referências). */
  mediana: number | null;
}

/**
 * Mesma decisão de itbi_aplicar_cinto para uma escritura, com preços já
 * corrigidos ao último trimestre. `refsArea` são as referências de área
 * parecida; `refsTodas`, as referências de qualquer área.
 */
export const classificarEscritura = (
  vc: number,
  faixa: { piso: number; teto: number },
  refsArea: ReferenciasPredio,
  refsTodas: ReferenciasPredio,
): { situacao: SituacaoEscritura; excecaoPredio: boolean } => {
  const { FATOR_FORA_MERCADO, MIN_REFERENCIAS, EXCECAO_MIN, EXCECAO_MAX } = REGRA_PREDIO;
  const foraMercado = refsArea.n >= MIN_REFERENCIAS && refsArea.mediana !== null && vc <= FATOR_FORA_MERCADO * refsArea.mediana;
  if (foraMercado) return { situacao: "fora_de_mercado", excecaoPredio: false };
  const dentro = vc >= faixa.piso && vc <= faixa.teto;
  if (dentro) return { situacao: "aceita", excecaoPredio: false };
  const excecao = vc > faixa.teto && refsTodas.n >= MIN_REFERENCIAS && refsTodas.mediana !== null
    && vc >= EXCECAO_MIN * refsTodas.mediana && vc <= EXCECAO_MAX * refsTodas.mediana;
  return excecao ? { situacao: "aceita", excecaoPredio: true } : { situacao: "fora_do_cinto", excecaoPredio: false };
};

/** Chave: "BAIRRO NORMALIZADO|Tipologia" (Apartamento | Casa | Comercial). Valores em preço do último trimestre do índice. */
export const OUTLIER_LIMITS_TABLE: Record<string, OutlierLimitEntry> = {
  "ABOLICAO|Apartamento": { piso: 1197, teto: 7430, p05: 1408, p1: 1415, p995: 6461, mediana: 3389, escrituras: 200, janela: "5 anos" },
  "ABOLICAO|Casa": { piso: 684, teto: 8122, p05: 805, p1: 913, p995: 7063, mediana: 2905, escrituras: 77, janela: "5 anos" },
  "AGUA SANTA|Apartamento": { piso: 1736, teto: 10089, p05: 2042, p1: 2067, p995: 8773, mediana: 5194, escrituras: 203, janela: "3 anos" },
  "AGUA SANTA|Casa": { piso: 868, teto: 8439, p05: 1021, p1: 1081, p995: 7338, mediana: 3243, escrituras: 42, janela: "5 anos" },
  "ALTO DA BOA VISTA|Apartamento": { piso: 2360, teto: 13496, p05: 2966, p1: 3020, p995: 11736, mediana: 4720, escrituras: 67, janela: "5 anos" },
  "ALTO DA BOA VISTA|Casa": { piso: 1564, teto: 12243, p05: 1840, p1: 1856, p995: 10646, mediana: 3432, escrituras: 42, janela: "5 anos" },
  "ANCHIETA|Apartamento": { piso: 745, teto: 8439, p05: 876, p1: 880, p995: 7338, mediana: 3767, escrituras: 68, janela: "5 anos" },
  "ANCHIETA|Casa": { piso: 677, teto: 18866, p05: 796, p1: 997, p995: 16405, mediana: 2159, escrituras: 94, janela: "5 anos" },
  "ANDARAI|Apartamento": { piso: 1825, teto: 12045, p05: 2147, p1: 2254, p995: 10474, mediana: 5156, escrituras: 943, janela: "3 anos" },
  "ANDARAI|Casa": { piso: 910, teto: 23696, p05: 1070, p1: 1484, p995: 20605, mediana: 4013, escrituras: 145, janela: "5 anos" },
  "ANDARAI|Comercial": { piso: 1891, teto: 16235, p05: 2225, p1: 2354, p995: 14117, mediana: 4169, escrituras: 30, janela: "5 anos" },
  "ANIL|Apartamento": { piso: 2083, teto: 10693, p05: 2450, p1: 2653, p995: 9298, mediana: 5687, escrituras: 577, janela: "3 anos" },
  "ANIL|Casa": { piso: 781, teto: 9808, p05: 919, p1: 1030, p995: 8529, mediana: 3536, escrituras: 239, janela: "3 anos" },
  "BANCARIOS|Apartamento": { piso: 1270, teto: 7956, p05: 1494, p1: 1656, p995: 6918, mediana: 3797, escrituras: 89, janela: "5 anos" },
  "BANCARIOS|Casa": { piso: 888, teto: 7608, p05: 1045, p1: 1046, p995: 6616, mediana: 2380, escrituras: 74, janela: "5 anos" },
  "BANGU|Apartamento": { piso: 992, teto: 8608, p05: 1167, p1: 1297, p995: 7485, mediana: 3353, escrituras: 251, janela: "3 anos" },
  "BANGU|Casa": { piso: 508, teto: 10697, p05: 598, p1: 659, p995: 9302, mediana: 2367, escrituras: 461, janela: "3 anos" },
  "BANGU|Comercial": { piso: 997, teto: 40306, p05: 1173, p1: 1299, p995: 35049, mediana: 4368, escrituras: 141, janela: "5 anos" },
  "BARRA DA TIJUCA|Apartamento": { piso: 4411, teto: 35720, p05: 5189, p1: 5655, p995: 31061, mediana: 12644, escrituras: 8952, janela: "3 anos" },
  "BARRA DA TIJUCA|Casa": { piso: 2065, teto: 46992, p05: 2429, p1: 3083, p995: 40863, mediana: 8832, escrituras: 817, janela: "3 anos" },
  "BARRA DA TIJUCA|Comercial": { piso: 2957, teto: 50237, p05: 3479, p1: 3669, p995: 43684, mediana: 7992, escrituras: 2091, janela: "3 anos" },
  "BARRA OLIMPICA|Apartamento": { piso: 3239, teto: 15439, p05: 3810, p1: 4108, p995: 13425, mediana: 8698, escrituras: 931, janela: "3 anos" },
  "BARRA OLIMPICA|Comercial": { piso: 1699, teto: 14790, p05: 1999, p1: 2078, p995: 12861, mediana: 5224, escrituras: 120, janela: "5 anos" },
  "BENFICA|Apartamento": { piso: 1117, teto: 10891, p05: 1314, p1: 1383, p995: 9470, mediana: 3430, escrituras: 123, janela: "5 anos" },
  "BENFICA|Casa": { piso: 801, teto: 14857, p05: 942, p1: 1065, p995: 12919, mediana: 2644, escrituras: 73, janela: "5 anos" },
  "BENFICA|Comercial": { piso: 851, teto: 9830, p05: 1001, p1: 1238, p995: 8548, mediana: 2944, escrituras: 125, janela: "5 anos" },
  "BENTO RIBEIRO|Apartamento": { piso: 1171, teto: 10960, p05: 1378, p1: 1412, p995: 9530, mediana: 3617, escrituras: 195, janela: "5 anos" },
  "BENTO RIBEIRO|Casa": { piso: 810, teto: 16626, p05: 953, p1: 1080, p995: 14457, mediana: 3268, escrituras: 252, janela: "5 anos" },
  "BONSUCESSO|Apartamento": { piso: 1382, teto: 11411, p05: 1626, p1: 1783, p995: 9923, mediana: 6121, escrituras: 812, janela: "3 anos" },
  "BONSUCESSO|Casa": { piso: 845, teto: 13141, p05: 994, p1: 1006, p995: 11427, mediana: 3012, escrituras: 123, janela: "5 anos" },
  "BONSUCESSO|Comercial": { piso: 946, teto: 37042, p05: 1113, p1: 1158, p995: 32210, mediana: 2609, escrituras: 115, janela: "5 anos" },
  "BOTAFOGO|Apartamento": { piso: 4383, teto: 26478, p05: 5156, p1: 5574, p995: 23024, mediana: 11958, escrituras: 4067, janela: "3 anos" },
  "BOTAFOGO|Casa": { piso: 2407, teto: 24513, p05: 2832, p1: 3007, p995: 21316, mediana: 8221, escrituras: 173, janela: "5 anos" },
  "BOTAFOGO|Comercial": { piso: 1737, teto: 52577, p05: 2043, p1: 3060, p995: 45719, mediana: 12295, escrituras: 283, janela: "5 anos" },
  "BRAS DE PINA|Apartamento": { piso: 937, teto: 9001, p05: 1102, p1: 1136, p995: 7827, mediana: 4480, escrituras: 350, janela: "3 anos" },
  "BRAS DE PINA|Casa": { piso: 632, teto: 19072, p05: 744, p1: 888, p995: 16584, mediana: 3328, escrituras: 249, janela: "5 anos" },
  "BRAS DE PINA|Comercial": { piso: 1100, teto: 15612, p05: 1294, p1: 1374, p995: 13576, mediana: 2979, escrituras: 41, janela: "5 anos" },
  "CACHAMBI|Apartamento": { piso: 1698, teto: 12629, p05: 1998, p1: 2083, p995: 10982, mediana: 5487, escrituras: 1444, janela: "3 anos" },
  "CACHAMBI|Casa": { piso: 1033, teto: 16856, p05: 1215, p1: 1265, p995: 14657, mediana: 4111, escrituras: 242, janela: "5 anos" },
  "CACHAMBI|Comercial": { piso: 1261, teto: 62765, p05: 1484, p1: 1556, p995: 54578, mediana: 4613, escrituras: 71, janela: "5 anos" },
  "CACUIA|Apartamento": { piso: 1756, teto: 10570, p05: 2066, p1: 2192, p995: 9191, mediana: 4662, escrituras: 75, janela: "5 anos" },
  "CACUIA|Casa": { piso: 804, teto: 9601, p05: 946, p1: 1116, p995: 8349, mediana: 3532, escrituras: 40, janela: "5 anos" },
  "CAJU|Apartamento": { piso: 1524, teto: 7192, p05: 1793, p1: 1860, p995: 6254, mediana: 3241, escrituras: 36, janela: "5 anos" },
  "CAMORIM|Apartamento": { piso: 3064, teto: 13575, p05: 3605, p1: 4340, p995: 11804, mediana: 8563, escrituras: 2996, janela: "3 anos" },
  "CAMORIM|Comercial": { piso: 2329, teto: 12374, p05: 3781, p1: 3793, p995: 10760, mediana: 4658, escrituras: 40, janela: "5 anos" },
  "CAMPINHO|Apartamento": { piso: 1154, teto: 7194, p05: 1358, p1: 1424, p995: 6186, mediana: 3597, escrituras: 135, janela: "5 anos" },
  "CAMPINHO|Casa": { piso: 633, teto: 12175, p05: 745, p1: 794, p995: 10587, mediana: 2683, escrituras: 55, janela: "5 anos" },
  "CAMPO DOS AFONSOS|Apartamento": { piso: 2340, teto: 6069, p05: 2753, p1: 2818, p995: 5277, mediana: 4204, escrituras: 243, janela: "3 anos" },
  "CAMPO GRANDE|Apartamento": { piso: 1538, teto: 11344, p05: 1809, p1: 1899, p995: 9864, mediana: 4399, escrituras: 3130, janela: "3 anos" },
  "CAMPO GRANDE|Casa": { piso: 667, teto: 17707, p05: 785, p1: 894, p995: 15397, mediana: 3079, escrituras: 1854, janela: "3 anos" },
  "CAMPO GRANDE|Comercial": { piso: 1219, teto: 40045, p05: 1434, p1: 1557, p995: 34822, mediana: 5071, escrituras: 306, janela: "3 anos" },
  "CASCADURA|Apartamento": { piso: 1004, teto: 8628, p05: 1181, p1: 1204, p995: 7503, mediana: 3107, escrituras: 219, janela: "3 anos" },
  "CASCADURA|Casa": { piso: 607, teto: 8975, p05: 714, p1: 787, p995: 7804, mediana: 2564, escrituras: 137, janela: "5 anos" },
  "CASCADURA|Comercial": { piso: 1130, teto: 18747, p05: 1329, p1: 1330, p995: 16302, mediana: 3162, escrituras: 40, janela: "5 anos" },
  "CATETE|Apartamento": { piso: 3797, teto: 22227, p05: 4467, p1: 4937, p995: 19328, mediana: 9783, escrituras: 888, janela: "3 anos" },
  "CATETE|Casa": { piso: 2306, teto: 17275, p05: 2713, p1: 2716, p995: 15022, mediana: 5210, escrituras: 44, janela: "5 anos" },
  "CATETE|Comercial": { piso: 1691, teto: 33084, p05: 1989, p1: 2799, p995: 28769, mediana: 9808, escrituras: 140, janela: "5 anos" },
  "CATUMBI|Apartamento": { piso: 828, teto: 9065, p05: 974, p1: 1256, p995: 7883, mediana: 3608, escrituras: 139, janela: "5 anos" },
  "CATUMBI|Casa": { piso: 961, teto: 6507, p05: 1130, p1: 1132, p995: 5658, mediana: 2734, escrituras: 34, janela: "5 anos" },
  "CAVALCANTI|Apartamento": { piso: 650, teto: 7648, p05: 765, p1: 786, p995: 5778, mediana: 3824, escrituras: 98, janela: "5 anos" },
  "CAVALCANTI|Casa": { piso: 530, teto: 11721, p05: 624, p1: 661, p995: 10192, mediana: 2342, escrituras: 66, janela: "5 anos" },
  "CENTRO|Apartamento": { piso: 2227, teto: 18796, p05: 2620, p1: 2810, p995: 16344, mediana: 7027, escrituras: 2036, janela: "3 anos" },
  "CENTRO|Comercial": { piso: 844, teto: 23320, p05: 993, p1: 1021, p995: 20278, mediana: 3603, escrituras: 1995, janela: "3 anos" },
  "CIDADE DE DEUS|Casa": { piso: 621, teto: 7675, p05: 731, p1: 789, p995: 6674, mediana: 2699, escrituras: 40, janela: "5 anos" },
  "CIDADE NOVA|Apartamento": { piso: 1646, teto: 9738, p05: 1937, p1: 2020, p995: 7831, mediana: 4869, escrituras: 87, janela: "5 anos" },
  "COCOTA|Apartamento": { piso: 1947, teto: 10994, p05: 2290, p1: 2317, p995: 9560, mediana: 4026, escrituras: 116, janela: "5 anos" },
  "COCOTA|Casa": { piso: 816, teto: 9179, p05: 960, p1: 1053, p995: 7982, mediana: 2953, escrituras: 48, janela: "5 anos" },
  "COELHO NETO|Apartamento": { piso: 1148, teto: 5817, p05: 1582, p1: 1602, p995: 5058, mediana: 2296, escrituras: 30, janela: "5 anos" },
  "COELHO NETO|Casa": { piso: 829, teto: 9260, p05: 975, p1: 975, p995: 8052, mediana: 2114, escrituras: 58, janela: "5 anos" },
  "COELHO NETO|Comercial": { piso: 864, teto: 4015, p05: 1086, p1: 1094, p995: 3491, mediana: 1728, escrituras: 31, janela: "5 anos" },
  "COLEGIO|Apartamento": { piso: 1401, teto: 11894, p05: 1648, p1: 1899, p995: 8895, mediana: 5947, escrituras: 338, janela: "5 anos" },
  "COLEGIO|Casa": { piso: 798, teto: 36338, p05: 939, p1: 983, p995: 31598, mediana: 3666, escrituras: 65, janela: "5 anos" },
  "COPACABANA|Apartamento": { piso: 4072, teto: 41078, p05: 4791, p1: 5291, p995: 35720, mediana: 11480, escrituras: 8333, janela: "3 anos" },
  "COPACABANA|Casa": { piso: 1056, teto: 92308, p05: 1242, p1: 1839, p995: 80268, mediana: 11880, escrituras: 60, janela: "5 anos" },
  "COPACABANA|Comercial": { piso: 1007, teto: 85345, p05: 1185, p1: 3863, p995: 74213, mediana: 8610, escrituras: 567, janela: "3 anos" },
  "CORDOVIL|Apartamento": { piso: 853, teto: 7454, p05: 1003, p1: 1041, p995: 6482, mediana: 3307, escrituras: 136, janela: "5 anos" },
  "CORDOVIL|Casa": { piso: 656, teto: 28301, p05: 772, p1: 844, p995: 24610, mediana: 2697, escrituras: 81, janela: "5 anos" },
  "COSME VELHO|Apartamento": { piso: 4101, teto: 19672, p05: 4825, p1: 5148, p995: 16644, mediana: 9836, escrituras: 197, janela: "5 anos" },
  "COSME VELHO|Casa": { piso: 1709, teto: 14776, p05: 2011, p1: 2154, p995: 12849, mediana: 5418, escrituras: 37, janela: "5 anos" },
  "COSMOS|Apartamento": { piso: 1060, teto: 7401, p05: 1247, p1: 1526, p995: 6436, mediana: 4452, escrituras: 538, janela: "3 anos" },
  "COSMOS|Casa": { piso: 566, teto: 8320, p05: 666, p1: 720, p995: 7159, mediana: 4160, escrituras: 374, janela: "5 anos" },
  "CURICICA|Apartamento": { piso: 1779, teto: 11246, p05: 2093, p1: 2332, p995: 9779, mediana: 7955, escrituras: 361, janela: "3 anos" },
  "CURICICA|Casa": { piso: 765, teto: 9958, p05: 900, p1: 964, p995: 8659, mediana: 3071, escrituras: 192, janela: "5 anos" },
  "DEL CASTILHO|Apartamento": { piso: 2059, teto: 9937, p05: 2422, p1: 2623, p995: 8641, mediana: 6211, escrituras: 607, janela: "3 anos" },
  "DEL CASTILHO|Casa": { piso: 1440, teto: 12944, p05: 1694, p1: 1734, p995: 11256, mediana: 3146, escrituras: 39, janela: "5 anos" },
  "DEL CASTILHO|Comercial": { piso: 1732, teto: 14875, p05: 2038, p1: 2163, p995: 12935, mediana: 5645, escrituras: 195, janela: "5 anos" },
  "ENCANTADO|Apartamento": { piso: 1287, teto: 9084, p05: 1514, p1: 1540, p995: 7899, mediana: 3578, escrituras: 239, janela: "5 anos" },
  "ENCANTADO|Casa": { piso: 849, teto: 10609, p05: 999, p1: 1024, p995: 9225, mediana: 2829, escrituras: 112, janela: "5 anos" },
  "ENGENHO DA RAINHA|Apartamento": { piso: 1030, teto: 9167, p05: 1212, p1: 1465, p995: 7971, mediana: 3500, escrituras: 137, janela: "5 anos" },
  "ENGENHO DA RAINHA|Casa": { piso: 596, teto: 14219, p05: 701, p1: 722, p995: 12364, mediana: 3267, escrituras: 50, janela: "5 anos" },
  "ENGENHO DE DENTRO|Apartamento": { piso: 1194, teto: 10182, p05: 1405, p1: 1619, p995: 8854, mediana: 4852, escrituras: 1066, janela: "3 anos" },
  "ENGENHO DE DENTRO|Casa": { piso: 803, teto: 12655, p05: 945, p1: 970, p995: 11004, mediana: 3164, escrituras: 240, janela: "5 anos" },
  "ENGENHO DE DENTRO|Comercial": { piso: 932, teto: 57027, p05: 1096, p1: 1298, p995: 49589, mediana: 4564, escrituras: 46, janela: "5 anos" },
  "ENGENHO NOVO|Apartamento": { piso: 1161, teto: 7335, p05: 1366, p1: 1459, p995: 6378, mediana: 3091, escrituras: 610, janela: "3 anos" },
  "ENGENHO NOVO|Casa": { piso: 655, teto: 8793, p05: 771, p1: 838, p995: 7646, mediana: 2719, escrituras: 206, janela: "5 anos" },
  "ESTACIO|Apartamento": { piso: 1482, teto: 9838, p05: 1744, p1: 1842, p995: 8555, mediana: 4266, escrituras: 256, janela: "5 anos" },
  "FLAMENGO|Apartamento": { piso: 4210, teto: 30143, p05: 4953, p1: 5326, p995: 26211, mediana: 10839, escrituras: 2549, janela: "3 anos" },
  "FLAMENGO|Comercial": { piso: 3684, teto: 60472, p05: 4334, p1: 4440, p995: 52584, mediana: 10913, escrituras: 127, janela: "5 anos" },
  "FREGUESIA (ILHA)|Apartamento": { piso: 1221, teto: 8665, p05: 1436, p1: 1503, p995: 7535, mediana: 3921, escrituras: 212, janela: "3 anos" },
  "FREGUESIA (ILHA)|Casa": { piso: 806, teto: 12986, p05: 948, p1: 1133, p995: 11292, mediana: 3275, escrituras: 115, janela: "5 anos" },
  "FREGUESIA (JACAREPAGUA)|Apartamento": { piso: 1969, teto: 11303, p05: 2316, p1: 2541, p995: 9829, mediana: 5588, escrituras: 2202, janela: "3 anos" },
  "FREGUESIA (JACAREPAGUA)|Casa": { piso: 1000, teto: 11699, p05: 1177, p1: 1321, p995: 10173, mediana: 4223, escrituras: 418, janela: "3 anos" },
  "FREGUESIA (JACAREPAGUA)|Comercial": { piso: 1673, teto: 33831, p05: 1968, p1: 2002, p995: 29418, mediana: 4237, escrituras: 346, janela: "3 anos" },
  "GAMBOA|Apartamento": { piso: 1022, teto: 14028, p05: 1202, p1: 1263, p995: 12198, mediana: 3372, escrituras: 85, janela: "5 anos" },
  "GARDENIA AZUL|Apartamento": { piso: 1418, teto: 11334, p05: 1668, p1: 2039, p995: 7501, mediana: 5667, escrituras: 136, janela: "5 anos" },
  "GARDENIA AZUL|Casa": { piso: 516, teto: 10010, p05: 607, p1: 631, p995: 8704, mediana: 2674, escrituras: 53, janela: "5 anos" },
  "GAVEA|Apartamento": { piso: 4925, teto: 41096, p05: 5794, p1: 6515, p995: 35736, mediana: 16724, escrituras: 760, janela: "3 anos" },
  "GAVEA|Casa": { piso: 1975, teto: 31656, p05: 2323, p1: 3392, p995: 27527, mediana: 11585, escrituras: 80, janela: "5 anos" },
  "GAVEA|Comercial": { piso: 4361, teto: 39638, p05: 5130, p1: 5423, p995: 34468, mediana: 15827, escrituras: 51, janela: "5 anos" },
  "GLORIA|Apartamento": { piso: 3686, teto: 34165, p05: 4336, p1: 4542, p995: 29709, mediana: 9844, escrituras: 621, janela: "3 anos" },
  "GLORIA|Comercial": { piso: 1771, teto: 19598, p05: 2083, p1: 2325, p995: 17042, mediana: 4577, escrituras: 39, janela: "5 anos" },
  "GRAJAU|Apartamento": { piso: 1669, teto: 12805, p05: 1963, p1: 2204, p995: 11135, mediana: 4946, escrituras: 971, janela: "3 anos" },
  "GRAJAU|Casa": { piso: 823, teto: 14381, p05: 968, p1: 1091, p995: 12505, mediana: 3986, escrituras: 231, janela: "5 anos" },
  "GUADALUPE|Apartamento": { piso: 878, teto: 8646, p05: 1033, p1: 1141, p995: 7518, mediana: 4065, escrituras: 124, janela: "5 anos" },
  "GUADALUPE|Casa": { piso: 763, teto: 14162, p05: 898, p1: 943, p995: 12315, mediana: 2756, escrituras: 151, janela: "5 anos" },
  "GUARATIBA|Apartamento": { piso: 1352, teto: 7555, p05: 1591, p1: 1593, p995: 6570, mediana: 4300, escrituras: 918, janela: "3 anos" },
  "GUARATIBA|Casa": { piso: 568, teto: 9047, p05: 668, p1: 806, p995: 7867, mediana: 4216, escrituras: 558, janela: "3 anos" },
  "HIGIENOPOLIS|Apartamento": { piso: 1195, teto: 6851, p05: 1406, p1: 1470, p995: 5957, mediana: 3132, escrituras: 248, janela: "3 anos" },
  "HIGIENOPOLIS|Casa": { piso: 1053, teto: 13984, p05: 1239, p1: 1392, p995: 12160, mediana: 3457, escrituras: 88, janela: "5 anos" },
  "HIGIENOPOLIS|Comercial": { piso: 1233, teto: 11043, p05: 1450, p1: 1466, p995: 9603, mediana: 2620, escrituras: 44, janela: "5 anos" },
  "HONORIO GURGEL|Apartamento": { piso: 606, teto: 10740, p05: 713, p1: 752, p995: 9339, mediana: 2305, escrituras: 30, janela: "5 anos" },
  "HONORIO GURGEL|Casa": { piso: 620, teto: 9784, p05: 729, p1: 779, p995: 8508, mediana: 2271, escrituras: 75, janela: "5 anos" },
  "HUMAITA|Apartamento": { piso: 4472, teto: 23696, p05: 5261, p1: 5999, p995: 20605, mediana: 11289, escrituras: 667, janela: "3 anos" },
  "HUMAITA|Casa": { piso: 2796, teto: 34497, p05: 3289, p1: 3869, p995: 29997, mediana: 9358, escrituras: 70, janela: "5 anos" },
  "INHAUMA|Apartamento": { piso: 1636, teto: 10456, p05: 1925, p1: 1947, p995: 9092, mediana: 6789, escrituras: 217, janela: "3 anos" },
  "INHAUMA|Casa": { piso: 755, teto: 12618, p05: 888, p1: 935, p995: 10972, mediana: 3262, escrituras: 139, janela: "5 anos" },
  "INHOAIBA|Apartamento": { piso: 1232, teto: 7325, p05: 1449, p1: 1602, p995: 6370, mediana: 4917, escrituras: 266, janela: "3 anos" },
  "INHOAIBA|Casa": { piso: 514, teto: 15352, p05: 605, p1: 673, p995: 13350, mediana: 2965, escrituras: 79, janela: "5 anos" },
  "IPANEMA|Apartamento": { piso: 6899, teto: 84397, p05: 8116, p1: 8897, p995: 73389, mediana: 21213, escrituras: 2906, janela: "3 anos" },
  "IPANEMA|Comercial": { piso: 6773, teto: 157829, p05: 7968, p1: 8120, p995: 137243, mediana: 20626, escrituras: 234, janela: "3 anos" },
  "IRAJA|Apartamento": { piso: 1431, teto: 11605, p05: 1684, p1: 1927, p995: 10091, mediana: 5875, escrituras: 1430, janela: "3 anos" },
  "IRAJA|Casa": { piso: 827, teto: 18206, p05: 973, p1: 1067, p995: 15831, mediana: 3514, escrituras: 325, janela: "3 anos" },
  "IRAJA|Comercial": { piso: 1065, teto: 10886, p05: 1253, p1: 1297, p995: 9466, mediana: 3226, escrituras: 37, janela: "5 anos" },
  "ITANHANGA|Apartamento": { piso: 2345, teto: 18489, p05: 2759, p1: 2947, p995: 16077, mediana: 5512, escrituras: 205, janela: "5 anos" },
  "ITANHANGA|Casa": { piso: 594, teto: 17043, p05: 699, p1: 731, p995: 14820, mediana: 4882, escrituras: 175, janela: "5 anos" },
  "JACAREPAGUA|Apartamento": { piso: 1756, teto: 15818, p05: 2066, p1: 2624, p995: 13755, mediana: 7820, escrituras: 4601, janela: "3 anos" },
  "JACAREPAGUA|Casa": { piso: 645, teto: 15432, p05: 759, p1: 886, p995: 13419, mediana: 3952, escrituras: 321, janela: "5 anos" },
  "JACAREPAGUA|Comercial": { piso: 1930, teto: 19767, p05: 2270, p1: 2873, p995: 17189, mediana: 5754, escrituras: 305, janela: "3 anos" },
  "JACARE|Apartamento": { piso: 593, teto: 7950, p05: 698, p1: 698, p995: 6913, mediana: 3313, escrituras: 118, janela: "5 anos" },
  "JACARE|Casa": { piso: 648, teto: 6019, p05: 762, p1: 780, p995: 5234, mediana: 2121, escrituras: 48, janela: "5 anos" },
  "JARDIM AMERICA|Apartamento": { piso: 1081, teto: 7746, p05: 1272, p1: 1366, p995: 6736, mediana: 2605, escrituras: 120, janela: "5 anos" },
  "JARDIM AMERICA|Casa": { piso: 769, teto: 13277, p05: 905, p1: 944, p995: 11545, mediana: 2609, escrituras: 163, janela: "5 anos" },
  "JARDIM BOTANICO|Apartamento": { piso: 5177, teto: 33388, p05: 6090, p1: 6746, p995: 29033, mediana: 14054, escrituras: 669, janela: "3 anos" },
  "JARDIM BOTANICO|Casa": { piso: 3004, teto: 55746, p05: 3534, p1: 4323, p995: 48475, mediana: 15244, escrituras: 169, janela: "5 anos" },
  "JARDIM BOTANICO|Comercial": { piso: 5224, teto: 34328, p05: 6146, p1: 6791, p995: 29850, mediana: 14322, escrituras: 114, janela: "5 anos" },
  "JARDIM CARIOCA|Apartamento": { piso: 1405, teto: 11229, p05: 1653, p1: 1676, p995: 9764, mediana: 5105, escrituras: 205, janela: "5 anos" },
  "JARDIM CARIOCA|Casa": { piso: 761, teto: 14060, p05: 895, p1: 957, p995: 12226, mediana: 2685, escrituras: 100, janela: "5 anos" },
  "JARDIM GUANABARA|Apartamento": { piso: 1841, teto: 15458, p05: 2166, p1: 2343, p995: 13442, mediana: 5770, escrituras: 912, janela: "3 anos" },
  "JARDIM GUANABARA|Casa": { piso: 1281, teto: 13887, p05: 1507, p1: 1609, p995: 12076, mediana: 4117, escrituras: 230, janela: "3 anos" },
  "JARDIM GUANABARA|Comercial": { piso: 1285, teto: 31373, p05: 1512, p1: 1728, p995: 27281, mediana: 5846, escrituras: 79, janela: "5 anos" },
  "JARDIM SULACAP|Apartamento": { piso: 1749, teto: 9695, p05: 2058, p1: 2097, p995: 8430, mediana: 4646, escrituras: 298, janela: "5 anos" },
  "JARDIM SULACAP|Casa": { piso: 899, teto: 10130, p05: 1058, p1: 1123, p995: 8809, mediana: 3270, escrituras: 160, janela: "5 anos" },
  "JOA|Casa": { piso: 1597, teto: 35604, p05: 1879, p1: 1964, p995: 30960, mediana: 8149, escrituras: 39, janela: "5 anos" },
  "LAGOA|Apartamento": { piso: 6226, teto: 48017, p05: 7325, p1: 7666, p995: 41754, mediana: 15462, escrituras: 929, janela: "3 anos" },
  "LARANJEIRAS|Apartamento": { piso: 3746, teto: 24014, p05: 4407, p1: 4908, p995: 20882, mediana: 9879, escrituras: 1947, janela: "3 anos" },
  "LARANJEIRAS|Casa": { piso: 1663, teto: 18853, p05: 1956, p1: 2277, p995: 16394, mediana: 6941, escrituras: 94, janela: "5 anos" },
  "LEBLON|Apartamento": { piso: 9085, teto: 72765, p05: 10688, p1: 11438, p995: 63274, mediana: 22198, escrituras: 2390, janela: "3 anos" },
  "LEBLON|Comercial": { piso: 9358, teto: 96459, p05: 11009, p1: 11792, p995: 83877, mediana: 28420, escrituras: 197, janela: "5 anos" },
  "LEME|Apartamento": { piso: 4323, teto: 40416, p05: 5086, p1: 5622, p995: 35144, mediana: 12374, escrituras: 587, janela: "3 anos" },
  "LINS DE VASCONCELOS|Apartamento": { piso: 1160, teto: 8855, p05: 1365, p1: 1428, p995: 7700, mediana: 3097, escrituras: 389, janela: "3 anos" },
  "LINS DE VASCONCELOS|Casa": { piso: 843, teto: 14783, p05: 992, p1: 1069, p995: 12855, mediana: 3468, escrituras: 144, janela: "5 anos" },
  "MADUREIRA|Apartamento": { piso: 945, teto: 7461, p05: 1112, p1: 1232, p995: 6488, mediana: 3295, escrituras: 361, janela: "3 anos" },
  "MADUREIRA|Casa": { piso: 705, teto: 13351, p05: 829, p1: 905, p995: 11610, mediana: 2604, escrituras: 201, janela: "5 anos" },
  "MADUREIRA|Comercial": { piso: 1635, teto: 50598, p05: 1923, p1: 1928, p995: 43998, mediana: 5110, escrituras: 197, janela: "5 anos" },
  "MAGALHAES BASTOS|Casa": { piso: 717, teto: 6756, p05: 843, p1: 867, p995: 5875, mediana: 2177, escrituras: 70, janela: "5 anos" },
  "MARACANA|Apartamento": { piso: 2258, teto: 17040, p05: 2656, p1: 2917, p995: 14817, mediana: 6712, escrituras: 1158, janela: "3 anos" },
  "MARACANA|Casa": { piso: 1921, teto: 16291, p05: 2260, p1: 2330, p995: 14166, mediana: 3978, escrituras: 93, janela: "5 anos" },
  "MARACANA|Comercial": { piso: 1894, teto: 17230, p05: 3123, p1: 3127, p995: 14983, mediana: 3787, escrituras: 35, janela: "5 anos" },
  "MARECHAL HERMES|Apartamento": { piso: 785, teto: 12299, p05: 924, p1: 924, p995: 10695, mediana: 5574, escrituras: 325, janela: "5 anos" },
  "MARECHAL HERMES|Casa": { piso: 793, teto: 13341, p05: 933, p1: 986, p995: 11601, mediana: 3257, escrituras: 190, janela: "5 anos" },
  "MARIA DA GRACA|Apartamento": { piso: 1379, teto: 9419, p05: 1622, p1: 1777, p995: 8190, mediana: 3594, escrituras: 215, janela: "5 anos" },
  "MARIA DA GRACA|Casa": { piso: 847, teto: 12530, p05: 997, p1: 1084, p995: 10896, mediana: 2556, escrituras: 70, janela: "5 anos" },
  "MEIER|Apartamento": { piso: 1684, teto: 10184, p05: 1981, p1: 2058, p995: 8856, mediana: 4106, escrituras: 1233, janela: "3 anos" },
  "MEIER|Casa": { piso: 993, teto: 17347, p05: 1168, p1: 1341, p995: 15084, mediana: 4200, escrituras: 313, janela: "5 anos" },
  "MEIER|Comercial": { piso: 1797, teto: 31539, p05: 2114, p1: 2185, p995: 27425, mediana: 4637, escrituras: 232, janela: "5 anos" },
  "MONERO|Apartamento": { piso: 2052, teto: 14035, p05: 2414, p1: 2423, p995: 12204, mediana: 5013, escrituras: 189, janela: "5 anos" },
  "MONERO|Casa": { piso: 1531, teto: 15101, p05: 1801, p1: 1806, p995: 13131, mediana: 4194, escrituras: 47, janela: "5 anos" },
  "OLARIA|Apartamento": { piso: 1176, teto: 10685, p05: 1383, p1: 1550, p995: 9291, mediana: 3695, escrituras: 384, janela: "3 anos" },
  "OLARIA|Casa": { piso: 939, teto: 16866, p05: 1105, p1: 1279, p995: 14666, mediana: 3460, escrituras: 281, janela: "5 anos" },
  "OLARIA|Comercial": { piso: 1020, teto: 7913, p05: 1200, p1: 1292, p995: 6881, mediana: 2793, escrituras: 47, janela: "5 anos" },
  "OSVALDO CRUZ|Apartamento": { piso: 944, teto: 9416, p05: 1110, p1: 1277, p995: 8188, mediana: 3332, escrituras: 133, janela: "5 anos" },
  "OSVALDO CRUZ|Casa": { piso: 846, teto: 20517, p05: 995, p1: 1028, p995: 17841, mediana: 3332, escrituras: 158, janela: "5 anos" },
  "PACIENCIA|Apartamento": { piso: 763, teto: 7692, p05: 898, p1: 950, p995: 4623, mediana: 3846, escrituras: 232, janela: "5 anos" },
  "PACIENCIA|Casa": { piso: 704, teto: 6834, p05: 828, p1: 848, p995: 5943, mediana: 2170, escrituras: 81, janela: "5 anos" },
  "PADRE MIGUEL|Apartamento": { piso: 968, teto: 6572, p05: 1139, p1: 1148, p995: 5715, mediana: 2807, escrituras: 84, janela: "5 anos" },
  "PADRE MIGUEL|Casa": { piso: 746, teto: 7598, p05: 878, p1: 920, p995: 6607, mediana: 2241, escrituras: 178, janela: "5 anos" },
  "PADRE MIGUEL|Comercial": { piso: 792, teto: 9121, p05: 932, p1: 936, p995: 7931, mediana: 1672, escrituras: 33, janela: "5 anos" },
  "PAQUETA|Apartamento": { piso: 1476, teto: 12821, p05: 1736, p1: 1888, p995: 11149, mediana: 5083, escrituras: 85, janela: "5 anos" },
  "PAQUETA|Casa": { piso: 1293, teto: 15037, p05: 1521, p1: 1622, p995: 13076, mediana: 4876, escrituras: 80, janela: "5 anos" },
  "PARADA DE LUCAS|Apartamento": { piso: 797, teto: 11183, p05: 938, p1: 938, p995: 9724, mediana: 5564, escrituras: 240, janela: "3 anos" },
  "PARQUE ANCHIETA|Apartamento": { piso: 1023, teto: 13541, p05: 1203, p1: 1302, p995: 11775, mediana: 2929, escrituras: 42, janela: "5 anos" },
  "PARQUE ANCHIETA|Casa": { piso: 754, teto: 10558, p05: 887, p1: 928, p995: 9181, mediana: 2216, escrituras: 109, janela: "5 anos" },
  "PARQUE COLUMBIA|Apartamento": { piso: 660, teto: 10118, p05: 776, p1: 887, p995: 6226, mediana: 5059, escrituras: 67, janela: "5 anos" },
  "PAVUNA|Apartamento": { piso: 917, teto: 9828, p05: 1079, p1: 1187, p995: 8546, mediana: 4043, escrituras: 247, janela: "5 anos" },
  "PAVUNA|Casa": { piso: 598, teto: 10677, p05: 704, p1: 748, p995: 9284, mediana: 2683, escrituras: 257, janela: "5 anos" },
  "PECHINCHA|Apartamento": { piso: 1782, teto: 9631, p05: 2097, p1: 2217, p995: 8375, mediana: 4845, escrituras: 1607, janela: "3 anos" },
  "PECHINCHA|Casa": { piso: 588, teto: 11393, p05: 692, p1: 861, p995: 9907, mediana: 3599, escrituras: 247, janela: "3 anos" },
  "PECHINCHA|Comercial": { piso: 1269, teto: 13139, p05: 1493, p1: 1817, p995: 11425, mediana: 3922, escrituras: 198, janela: "5 anos" },
  "PEDRA DE GUARATIBA|Casa": { piso: 570, teto: 7570, p05: 670, p1: 727, p995: 6583, mediana: 3286, escrituras: 151, janela: "5 anos" },
  "PENHA CIRCULAR|Apartamento": { piso: 1119, teto: 10253, p05: 1316, p1: 1451, p995: 8916, mediana: 3104, escrituras: 359, janela: "3 anos" },
  "PENHA CIRCULAR|Casa": { piso: 708, teto: 9164, p05: 833, p1: 979, p995: 7969, mediana: 2725, escrituras: 213, janela: "5 anos" },
  "PENHA CIRCULAR|Comercial": { piso: 626, teto: 12628, p05: 737, p1: 790, p995: 10981, mediana: 1807, escrituras: 71, janela: "5 anos" },
  "PENHA|Apartamento": { piso: 1119, teto: 10846, p05: 1316, p1: 1455, p995: 9431, mediana: 4198, escrituras: 547, janela: "3 anos" },
  "PENHA|Casa": { piso: 808, teto: 8996, p05: 950, p1: 1000, p995: 7823, mediana: 2577, escrituras: 250, janela: "5 anos" },
  "PENHA|Comercial": { piso: 1030, teto: 21605, p05: 1212, p1: 1244, p995: 18787, mediana: 5091, escrituras: 168, janela: "5 anos" },
  "PIEDADE|Apartamento": { piso: 1051, teto: 9914, p05: 1237, p1: 1285, p995: 8621, mediana: 3884, escrituras: 358, janela: "3 anos" },
  "PIEDADE|Casa": { piso: 676, teto: 8557, p05: 795, p1: 830, p995: 7441, mediana: 2477, escrituras: 204, janela: "3 anos" },
  "PILARES|Apartamento": { piso: 1215, teto: 8616, p05: 1429, p1: 1462, p995: 7492, mediana: 3290, escrituras: 212, janela: "5 anos" },
  "PILARES|Casa": { piso: 826, teto: 12247, p05: 972, p1: 1034, p995: 10650, mediana: 3542, escrituras: 115, janela: "5 anos" },
  "PILARES|Comercial": { piso: 1199, teto: 17580, p05: 1411, p1: 1675, p995: 15287, mediana: 4103, escrituras: 120, janela: "5 anos" },
  "PITANGUEIRAS|Apartamento": { piso: 2294, teto: 10284, p05: 2699, p1: 2709, p995: 8343, mediana: 5142, escrituras: 74, janela: "5 anos" },
  "PITANGUEIRAS|Casa": { piso: 854, teto: 10136, p05: 1005, p1: 1029, p995: 8814, mediana: 3057, escrituras: 45, janela: "5 anos" },
  "PORTUGUESA|Apartamento": { piso: 1773, teto: 11268, p05: 2086, p1: 2234, p995: 9798, mediana: 4958, escrituras: 245, janela: "5 anos" },
  "PORTUGUESA|Casa": { piso: 1004, teto: 13189, p05: 1181, p1: 1203, p995: 11469, mediana: 3952, escrituras: 163, janela: "5 anos" },
  "PRACA DA BANDEIRA|Apartamento": { piso: 1885, teto: 12174, p05: 2218, p1: 2373, p995: 10586, mediana: 5761, escrituras: 244, janela: "3 anos" },
  "PRACA DA BANDEIRA|Casa": { piso: 1329, teto: 14342, p05: 1564, p1: 1579, p995: 12471, mediana: 4175, escrituras: 39, janela: "5 anos" },
  "PRACA DA BANDEIRA|Comercial": { piso: 1181, teto: 14044, p05: 1389, p1: 1442, p995: 12212, mediana: 2710, escrituras: 38, janela: "5 anos" },
  "PRACA SECA|Apartamento": { piso: 955, teto: 9979, p05: 1123, p1: 1248, p995: 8677, mediana: 2735, escrituras: 717, janela: "3 anos" },
  "PRACA SECA|Casa": { piso: 584, teto: 6250, p05: 687, p1: 734, p995: 5435, mediana: 2277, escrituras: 237, janela: "3 anos" },
  "PRAIA DA BANDEIRA|Apartamento": { piso: 1774, teto: 9690, p05: 2087, p1: 2347, p995: 7800, mediana: 4845, escrituras: 88, janela: "5 anos" },
  "QUINTINO BOCAIUVA|Apartamento": { piso: 957, teto: 7645, p05: 1126, p1: 1288, p995: 6648, mediana: 3364, escrituras: 306, janela: "5 anos" },
  "QUINTINO BOCAIUVA|Casa": { piso: 793, teto: 8769, p05: 933, p1: 940, p995: 7625, mediana: 2393, escrituras: 224, janela: "5 anos" },
  "RAMOS|Apartamento": { piso: 1147, teto: 9519, p05: 1349, p1: 1398, p995: 8277, mediana: 4260, escrituras: 405, janela: "3 anos" },
  "RAMOS|Casa": { piso: 1015, teto: 17772, p05: 1194, p1: 1211, p995: 15454, mediana: 3410, escrituras: 232, janela: "5 anos" },
  "RAMOS|Comercial": { piso: 732, teto: 27508, p05: 861, p1: 958, p995: 23920, mediana: 2454, escrituras: 50, janela: "5 anos" },
  "REALENGO|Apartamento": { piso: 1145, teto: 7864, p05: 1347, p1: 1420, p995: 6043, mediana: 3932, escrituras: 371, janela: "5 anos" },
  "REALENGO|Casa": { piso: 641, teto: 8883, p05: 754, p1: 822, p995: 7724, mediana: 1941, escrituras: 203, janela: "3 anos" },
  "RECREIO DOS BANDEIRANTES|Apartamento": { piso: 2611, teto: 17035, p05: 3072, p1: 3387, p995: 14813, mediana: 7209, escrituras: 6583, janela: "3 anos" },
  "RECREIO DOS BANDEIRANTES|Casa": { piso: 2057, teto: 19435, p05: 2420, p1: 2841, p995: 16900, mediana: 6949, escrituras: 691, janela: "3 anos" },
  "RECREIO DOS BANDEIRANTES|Comercial": { piso: 2060, teto: 18290, p05: 2423, p1: 2517, p995: 15904, mediana: 5418, escrituras: 532, janela: "3 anos" },
  "RIACHUELO|Apartamento": { piso: 1215, teto: 9896, p05: 1429, p1: 1590, p995: 8605, mediana: 3806, escrituras: 289, janela: "3 anos" },
  "RIACHUELO|Casa": { piso: 984, teto: 10704, p05: 1158, p1: 1205, p995: 9308, mediana: 2520, escrituras: 100, janela: "5 anos" },
  "RIBEIRA|Apartamento": { piso: 2017, teto: 12098, p05: 2373, p1: 2426, p995: 10520, mediana: 5609, escrituras: 190, janela: "5 anos" },
  "RICARDO DE ALBUQUERQUE|Casa": { piso: 511, teto: 11870, p05: 601, p1: 601, p995: 10322, mediana: 2492, escrituras: 66, janela: "5 anos" },
  "RIO COMPRIDO|Apartamento": { piso: 1330, teto: 12465, p05: 1565, p1: 1730, p995: 10839, mediana: 5755, escrituras: 1058, janela: "3 anos" },
  "RIO COMPRIDO|Casa": { piso: 779, teto: 14535, p05: 916, p1: 922, p995: 12639, mediana: 2601, escrituras: 106, janela: "5 anos" },
  "RIO COMPRIDO|Comercial": { piso: 818, teto: 8188, p05: 962, p1: 1128, p995: 6123, mediana: 4094, escrituras: 76, janela: "5 anos" },
  "ROCHA MIRANDA|Apartamento": { piso: 998, teto: 8202, p05: 1174, p1: 1205, p995: 7132, mediana: 3445, escrituras: 136, janela: "5 anos" },
  "ROCHA MIRANDA|Casa": { piso: 570, teto: 20703, p05: 671, p1: 736, p995: 18003, mediana: 2882, escrituras: 132, janela: "5 anos" },
  "ROCHA|Apartamento": { piso: 1182, teto: 8176, p05: 1391, p1: 1437, p995: 7110, mediana: 3338, escrituras: 252, janela: "5 anos" },
  "ROCHA|Casa": { piso: 722, teto: 10770, p05: 849, p1: 914, p995: 9365, mediana: 2545, escrituras: 76, janela: "5 anos" },
  "SAMPAIO|Apartamento": { piso: 1085, teto: 7941, p05: 1277, p1: 1327, p995: 6905, mediana: 2912, escrituras: 121, janela: "5 anos" },
  "SAMPAIO|Casa": { piso: 756, teto: 6746, p05: 889, p1: 900, p995: 5866, mediana: 2389, escrituras: 46, janela: "5 anos" },
  "SANTA CRUZ|Apartamento": { piso: 1173, teto: 7365, p05: 1380, p1: 1835, p995: 6404, mediana: 3990, escrituras: 2047, janela: "3 anos" },
  "SANTA CRUZ|Casa": { piso: 613, teto: 38407, p05: 721, p1: 734, p995: 33397, mediana: 2791, escrituras: 133, janela: "5 anos" },
  "SANTA CRUZ|Comercial": { piso: 1304, teto: 29032, p05: 1534, p1: 1554, p995: 25245, mediana: 3277, escrituras: 46, janela: "5 anos" },
  "SANTA TERESA|Apartamento": { piso: 1826, teto: 19688, p05: 2148, p1: 2358, p995: 17120, mediana: 6190, escrituras: 543, janela: "3 anos" },
  "SANTA TERESA|Casa": { piso: 972, teto: 32428, p05: 1143, p1: 1286, p995: 28198, mediana: 4487, escrituras: 167, janela: "5 anos" },
  "SANTISSIMO|Apartamento": { piso: 1432, teto: 6439, p05: 1685, p1: 1752, p995: 5599, mediana: 4113, escrituras: 263, janela: "3 anos" },
  "SANTISSIMO|Casa": { piso: 833, teto: 8535, p05: 980, p1: 1023, p995: 7422, mediana: 4006, escrituras: 172, janela: "5 anos" },
  "SANTO CRISTO|Apartamento": { piso: 2668, teto: 18449, p05: 3139, p1: 5117, p995: 16043, mediana: 10002, escrituras: 2738, janela: "3 anos" },
  "SANTO CRISTO|Casa": { piso: 642, teto: 7251, p05: 755, p1: 795, p995: 6305, mediana: 2046, escrituras: 50, janela: "5 anos" },
  "SANTO CRISTO|Comercial": { piso: 1015, teto: 21756, p05: 1194, p1: 1230, p995: 18918, mediana: 9055, escrituras: 36, janela: "5 anos" },
  "SAO CONRADO|Apartamento": { piso: 4595, teto: 46338, p05: 5406, p1: 5775, p995: 40294, mediana: 12296, escrituras: 428, janela: "3 anos" },
  "SAO CONRADO|Casa": { piso: 879, teto: 46251, p05: 1034, p1: 1430, p995: 40218, mediana: 8073, escrituras: 64, janela: "5 anos" },
  "SAO CONRADO|Comercial": { piso: 3621, teto: 29418, p05: 4260, p1: 4316, p995: 25581, mediana: 9597, escrituras: 52, janela: "5 anos" },
  "SAO CRISTOVAO|Apartamento": { piso: 1833, teto: 13300, p05: 2156, p1: 2356, p995: 11565, mediana: 8090, escrituras: 1571, janela: "3 anos" },
  "SAO CRISTOVAO|Casa": { piso: 938, teto: 13277, p05: 1103, p1: 1199, p995: 11545, mediana: 3429, escrituras: 131, janela: "5 anos" },
  "SAO CRISTOVAO|Comercial": { piso: 1027, teto: 14246, p05: 1208, p1: 1208, p995: 12388, mediana: 5138, escrituras: 178, janela: "5 anos" },
  "SAO FRANCISCO XAVIER|Apartamento": { piso: 1536, teto: 10394, p05: 1807, p1: 1939, p995: 9038, mediana: 7414, escrituras: 475, janela: "3 anos" },
  "SAUDE|Comercial": { piso: 1053, teto: 18207, p05: 1239, p1: 1265, p995: 15832, mediana: 2526, escrituras: 78, janela: "5 anos" },
  "SENADOR CAMARA|Apartamento": { piso: 992, teto: 5791, p05: 1167, p1: 1189, p995: 5036, mediana: 2506, escrituras: 191, janela: "5 anos" },
  "SENADOR CAMARA|Casa": { piso: 644, teto: 8311, p05: 758, p1: 798, p995: 7227, mediana: 2510, escrituras: 144, janela: "5 anos" },
  "SENADOR VASCONCELOS|Apartamento": { piso: 1238, teto: 5268, p05: 1456, p1: 1471, p995: 3897, mediana: 2634, escrituras: 43, janela: "5 anos" },
  "SENADOR VASCONCELOS|Casa": { piso: 660, teto: 6833, p05: 777, p1: 838, p995: 5942, mediana: 2607, escrituras: 104, janela: "5 anos" },
  "TANQUE|Apartamento": { piso: 1527, teto: 11239, p05: 1797, p1: 1854, p995: 9773, mediana: 3954, escrituras: 328, janela: "3 anos" },
  "TANQUE|Casa": { piso: 626, teto: 13340, p05: 736, p1: 897, p995: 11600, mediana: 2820, escrituras: 175, janela: "5 anos" },
  "TANQUE|Comercial": { piso: 1175, teto: 19323, p05: 1382, p1: 1559, p995: 16803, mediana: 4158, escrituras: 63, janela: "5 anos" },
  "TAQUARA|Apartamento": { piso: 1694, teto: 11906, p05: 1993, p1: 2157, p995: 10353, mediana: 4755, escrituras: 2120, janela: "3 anos" },
  "TAQUARA|Casa": { piso: 917, teto: 12621, p05: 1079, p1: 1130, p995: 10975, mediana: 3299, escrituras: 414, janela: "3 anos" },
  "TAQUARA|Comercial": { piso: 1324, teto: 23258, p05: 1558, p1: 1970, p995: 20224, mediana: 4547, escrituras: 299, janela: "5 anos" },
  "TAUA|Apartamento": { piso: 1549, teto: 10670, p05: 1822, p1: 1911, p995: 9278, mediana: 3827, escrituras: 220, janela: "3 anos" },
  "TAUA|Casa": { piso: 603, teto: 12482, p05: 709, p1: 742, p995: 10854, mediana: 2890, escrituras: 101, janela: "5 anos" },
  "TIJUCA|Apartamento": { piso: 1975, teto: 15197, p05: 2324, p1: 2670, p995: 13215, mediana: 6154, escrituras: 5656, janela: "3 anos" },
  "TIJUCA|Casa": { piso: 1201, teto: 19121, p05: 1413, p1: 1485, p995: 16627, mediana: 5164, escrituras: 250, janela: "3 anos" },
  "TIJUCA|Comercial": { piso: 1751, teto: 29868, p05: 2060, p1: 2112, p995: 25972, mediana: 5741, escrituras: 484, janela: "3 anos" },
  "TODOS OS SANTOS|Apartamento": { piso: 1614, teto: 11081, p05: 1899, p1: 2044, p995: 9636, mediana: 5569, escrituras: 995, janela: "3 anos" },
  "TODOS OS SANTOS|Casa": { piso: 1208, teto: 16614, p05: 1421, p1: 1459, p995: 14447, mediana: 3588, escrituras: 162, janela: "5 anos" },
  "TODOS OS SANTOS|Comercial": { piso: 1574, teto: 18553, p05: 1852, p1: 2077, p995: 16133, mediana: 4780, escrituras: 249, janela: "5 anos" },
  "TOMAS COELHO|Apartamento": { piso: 1261, teto: 9068, p05: 1483, p1: 1507, p995: 5247, mediana: 4534, escrituras: 135, janela: "5 anos" },
  "TOMAS COELHO|Casa": { piso: 535, teto: 8842, p05: 629, p1: 650, p995: 7689, mediana: 2296, escrituras: 55, janela: "5 anos" },
  "TURIACU|Apartamento": { piso: 1059, teto: 7085, p05: 1246, p1: 1276, p995: 6161, mediana: 2610, escrituras: 56, janela: "5 anos" },
  "TURIACU|Casa": { piso: 602, teto: 9515, p05: 708, p1: 758, p995: 8274, mediana: 2505, escrituras: 41, janela: "5 anos" },
  "URCA|Apartamento": { piso: 6876, teto: 31566, p05: 8089, p1: 8517, p995: 27449, mediana: 14100, escrituras: 216, janela: "5 anos" },
  "URCA|Casa": { piso: 4670, teto: 33674, p05: 5494, p1: 5537, p995: 29282, mediana: 12450, escrituras: 36, janela: "5 anos" },
  "VARGEM GRANDE|Apartamento": { piso: 2458, teto: 9482, p05: 2892, p1: 2930, p995: 8245, mediana: 5592, escrituras: 367, janela: "3 anos" },
  "VARGEM GRANDE|Casa": { piso: 1200, teto: 11583, p05: 1412, p1: 1762, p995: 10072, mediana: 5782, escrituras: 219, janela: "5 anos" },
  "VARGEM PEQUENA|Apartamento": { piso: 2047, teto: 9008, p05: 2408, p1: 2447, p995: 7833, mediana: 4906, escrituras: 322, janela: "3 anos" },
  "VARGEM PEQUENA|Casa": { piso: 1067, teto: 16601, p05: 1255, p1: 1703, p995: 14436, mediana: 4938, escrituras: 274, janela: "3 anos" },
  "VASCO DA GAMA|Apartamento": { piso: 1165, teto: 10128, p05: 1370, p1: 1782, p995: 8297, mediana: 5064, escrituras: 130, janela: "5 anos" },
  "VASCO DA GAMA|Casa": { piso: 756, teto: 15129, p05: 889, p1: 1086, p995: 13156, mediana: 3714, escrituras: 42, janela: "5 anos" },
  "VAZ LOBO|Apartamento": { piso: 1026, teto: 8973, p05: 1207, p1: 1315, p995: 7803, mediana: 3248, escrituras: 224, janela: "5 anos" },
  "VAZ LOBO|Casa": { piso: 705, teto: 11216, p05: 829, p1: 868, p995: 9753, mediana: 2885, escrituras: 58, janela: "5 anos" },
  "VICENTE DE CARVALHO|Apartamento": { piso: 1146, teto: 10250, p05: 1348, p1: 1497, p995: 8843, mediana: 5125, escrituras: 272, janela: "5 anos" },
  "VICENTE DE CARVALHO|Casa": { piso: 1134, teto: 19183, p05: 1334, p1: 1373, p995: 16681, mediana: 2899, escrituras: 100, janela: "5 anos" },
  "VICENTE DE CARVALHO|Comercial": { piso: 1818, teto: 16826, p05: 2139, p1: 2277, p995: 14631, mediana: 6289, escrituras: 137, janela: "5 anos" },
  "VIDIGAL|Apartamento": { piso: 2299, teto: 56767, p05: 2705, p1: 2763, p995: 49363, mediana: 7001, escrituras: 48, janela: "5 anos" },
  "VIGARIO GERAL|Apartamento": { piso: 990, teto: 5481, p05: 1165, p1: 1169, p995: 4766, mediana: 2214, escrituras: 47, janela: "5 anos" },
  "VIGARIO GERAL|Casa": { piso: 794, teto: 17460, p05: 934, p1: 938, p995: 15183, mediana: 2765, escrituras: 55, janela: "5 anos" },
  "VILA DA PENHA|Apartamento": { piso: 1556, teto: 10742, p05: 1830, p1: 1937, p995: 9341, mediana: 4564, escrituras: 599, janela: "3 anos" },
  "VILA DA PENHA|Casa": { piso: 1065, teto: 12398, p05: 1253, p1: 1419, p995: 10781, mediana: 3481, escrituras: 187, janela: "5 anos" },
  "VILA DA PENHA|Comercial": { piso: 1230, teto: 13216, p05: 1447, p1: 1917, p995: 11492, mediana: 5551, escrituras: 95, janela: "5 anos" },
  "VILA ISABEL|Apartamento": { piso: 1360, teto: 13187, p05: 1600, p1: 1699, p995: 11467, mediana: 4859, escrituras: 1865, janela: "3 anos" },
  "VILA ISABEL|Casa": { piso: 943, teto: 13645, p05: 1109, p1: 1269, p995: 11865, mediana: 4051, escrituras: 288, janela: "5 anos" },
  "VILA ISABEL|Comercial": { piso: 1781, teto: 21840, p05: 2095, p1: 2177, p995: 18991, mediana: 4479, escrituras: 187, janela: "5 anos" },
  "VILA KOSMOS|Apartamento": { piso: 1284, teto: 9479, p05: 1510, p1: 1545, p995: 8243, mediana: 3526, escrituras: 100, janela: "5 anos" },
  "VILA KOSMOS|Casa": { piso: 910, teto: 23006, p05: 1070, p1: 1131, p995: 20005, mediana: 3241, escrituras: 118, janela: "5 anos" },
  "VILA VALQUEIRE|Apartamento": { piso: 1424, teto: 11560, p05: 1675, p1: 1782, p995: 10052, mediana: 4477, escrituras: 551, janela: "3 anos" },
  "VILA VALQUEIRE|Casa": { piso: 590, teto: 18260, p05: 694, p1: 923, p995: 15878, mediana: 3680, escrituras: 339, janela: "5 anos" },
  "VILA VALQUEIRE|Comercial": { piso: 2373, teto: 16712, p05: 2792, p1: 3058, p995: 14532, mediana: 5268, escrituras: 38, janela: "5 anos" },
  "VISTA ALEGRE|Apartamento": { piso: 1617, teto: 11957, p05: 1902, p1: 1955, p995: 10397, mediana: 4419, escrituras: 132, janela: "5 anos" },
  "VISTA ALEGRE|Casa": { piso: 1068, teto: 19111, p05: 1256, p1: 1305, p995: 16618, mediana: 4061, escrituras: 69, janela: "5 anos" },
  "ZUMBI|Apartamento": { piso: 2050, teto: 10968, p05: 2412, p1: 2710, p995: 8435, mediana: 5484, escrituras: 92, janela: "5 anos" },
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
