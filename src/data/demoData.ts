import type { KPIStatsData } from "@/hooks/useKPIStats";
import type { EvolutionData } from "@/hooks/useEvolutionData";
import type { MicrobairroRanking } from "@/hooks/useITBITransactions";

export const DEMO_KPI_STATS: KPIStatsData = {
  precoMedio: 11245,
  precoMedioApt: 11890,
  precoMedioCasa: 9720,
  liquidez: 2648,
  liquidezApt: 1985,
  liquidezCasa: 663,
  variacaoAnual: "4.72",
  variacaoAnualApt: "5.1",
  variacaoAnualCasa: "3.8",
  bairroMaisValorizado: "Orla",
  precoMedioBairro: 18450,
  precoMedioBairroApt: 19200,
  precoMedioBairroCasa: 16800,
  variacaoMensal: "0.85",
  mesReferencia: "Jan/2026",
  usandoDadosHistoricos: false,
};

export const DEMO_EVOLUTION_DATA: EvolutionData[] = [
  { mes: "S1/20", geral: 7850, apartamento: 8200, casa: 6900, variacao: 0 },
  { mes: "S2/20", geral: 7620, apartamento: 7980, casa: 6750, variacao: -2.93 },
  { mes: "S1/21", geral: 8100, apartamento: 8520, casa: 7100, variacao: 6.30 },
  { mes: "S2/21", geral: 8480, apartamento: 8900, casa: 7350, variacao: 4.69 },
  { mes: "S1/22", geral: 8950, apartamento: 9400, casa: 7800, variacao: 5.54 },
  { mes: "S2/22", geral: 9320, apartamento: 9780, casa: 8100, variacao: 4.13 },
  { mes: "S1/23", geral: 9680, apartamento: 10150, casa: 8400, variacao: 3.86 },
  { mes: "S2/23", geral: 10050, apartamento: 10550, casa: 8750, variacao: 3.82 },
  { mes: "S1/24", geral: 10420, apartamento: 10950, casa: 9050, variacao: 3.68 },
  { mes: "S2/24", geral: 10780, apartamento: 11350, casa: 9380, variacao: 3.45 },
  { mes: "S1/25", geral: 11100, apartamento: 11680, casa: 9620, variacao: 2.97 },
  { mes: "S2/25", geral: 11245, apartamento: 11890, casa: 9720, variacao: 1.31 },
];

export const DEMO_MICROBAIRRO_RANKING: MicrobairroRanking[] = [
  { microbairro: "Orla", total_transacoes: 385, preco_medio_m2: 18450, preco_min_m2: 12800, preco_max_m2: 28500, mediana_m2: 17200 },
  { microbairro: "Península", total_transacoes: 420, preco_medio_m2: 14200, preco_min_m2: 10500, preco_max_m2: 21000, mediana_m2: 13800 },
  { microbairro: "Jardim Oceânico", total_transacoes: 310, preco_medio_m2: 12800, preco_min_m2: 9200, preco_max_m2: 18500, mediana_m2: 12400 },
  { microbairro: "ABM", total_transacoes: 280, preco_medio_m2: 10950, preco_min_m2: 8100, preco_max_m2: 15200, mediana_m2: 10600 },
  { microbairro: "Parque das Rosas", total_transacoes: 245, preco_medio_m2: 10200, preco_min_m2: 7500, preco_max_m2: 14000, mediana_m2: 9800 },
  { microbairro: "Centro Metropolitano", total_transacoes: 350, preco_medio_m2: 9800, preco_min_m2: 7200, preco_max_m2: 13500, mediana_m2: 9500 },
  { microbairro: "Ayrton Senna", total_transacoes: 290, preco_medio_m2: 8900, preco_min_m2: 6500, preco_max_m2: 12800, mediana_m2: 8600 },
  { microbairro: "Eixo Américas", total_transacoes: 368, preco_medio_m2: 8450, preco_min_m2: 5800, preco_max_m2: 12000, mediana_m2: 8100 },
];

const DEMO_MICROBAIRRO_EVOLUTION_DATA = [
  { periodo: "S1/22", Orla: 15200, Península: 11800, "Jardim Oceânico": 10500, ABM: 9200, "Parque das Rosas": 8600, "Centro Metropolitano": 8100, "Ayrton Senna": 7500, "Eixo Américas": 7100 },
  { periodo: "S2/22", Orla: 15800, Península: 12200, "Jardim Oceânico": 10900, ABM: 9500, "Parque das Rosas": 8900, "Centro Metropolitano": 8400, "Ayrton Senna": 7700, "Eixo Américas": 7300 },
  { periodo: "S1/23", Orla: 16400, Península: 12700, "Jardim Oceânico": 11300, ABM: 9800, "Parque das Rosas": 9200, "Centro Metropolitano": 8700, "Ayrton Senna": 8000, "Eixo Américas": 7600 },
  { periodo: "S2/23", Orla: 17000, Península: 13200, "Jardim Oceânico": 11800, ABM: 10200, "Parque das Rosas": 9600, "Centro Metropolitano": 9100, "Ayrton Senna": 8300, "Eixo Américas": 7800 },
  { periodo: "S1/24", Orla: 17500, Península: 13600, "Jardim Oceânico": 12200, ABM: 10500, "Parque das Rosas": 9800, "Centro Metropolitano": 9400, "Ayrton Senna": 8500, "Eixo Américas": 8000 },
  { periodo: "S2/24", Orla: 18000, Península: 13900, "Jardim Oceânico": 12500, ABM: 10700, "Parque das Rosas": 10000, "Centro Metropolitano": 9600, "Ayrton Senna": 8700, "Eixo Américas": 8200 },
  { periodo: "S1/25", Orla: 18450, Península: 14200, "Jardim Oceânico": 12800, ABM: 10950, "Parque das Rosas": 10200, "Centro Metropolitano": 9800, "Ayrton Senna": 8900, "Eixo Américas": 8450 },
];

export const DEMO_MICROBAIRRO_EVOLUTION = {
  data: DEMO_MICROBAIRRO_EVOLUTION_DATA,
  microbairros: ["ABM", "Ayrton Senna", "Centro Metropolitano", "Eixo Américas", "Jardim Oceânico", "Orla", "Parque das Rosas", "Península"],
};

export const DEMO_MAP_DATA = [
  { microbairro: "Orla", total_transacoes: 385, preco_medio_m2: 18450, latitude: -23.0128, longitude: -43.3095, aproximado: false },
  { microbairro: "Península", total_transacoes: 420, preco_medio_m2: 14200, latitude: -22.9985, longitude: -43.3350, aproximado: false },
  { microbairro: "Jardim Oceânico", total_transacoes: 310, preco_medio_m2: 12800, latitude: -23.0065, longitude: -43.3195, aproximado: false },
  { microbairro: "ABM", total_transacoes: 280, preco_medio_m2: 10950, latitude: -23.0010, longitude: -43.3550, aproximado: false },
  { microbairro: "Parque das Rosas", total_transacoes: 245, preco_medio_m2: 10200, latitude: -22.9920, longitude: -43.3680, aproximado: false },
  { microbairro: "Centro Metropolitano", total_transacoes: 350, preco_medio_m2: 9800, latitude: -22.9830, longitude: -43.3870, aproximado: false },
  { microbairro: "Ayrton Senna", total_transacoes: 290, preco_medio_m2: 8900, latitude: -22.9780, longitude: -43.3750, aproximado: false },
  { microbairro: "Eixo Américas", total_transacoes: 368, preco_medio_m2: 8450, latitude: -22.9950, longitude: -43.3480, aproximado: false },
];

// Search results demo for Pesquisas de Mercado
export const DEMO_SEARCH_RESULTS = [
  { logradouro: "AV. LÚCIO COSTA", numero: "3150", tipologia: "Apartamento", area_m2: 120, valor_m2: 18200, valor_transacao: 2184000, data_transacao: "2025-11-15", total_transacoes: 3 },
  { logradouro: "AV. LÚCIO COSTA", numero: "2800", tipologia: "Apartamento", area_m2: 95, valor_m2: 17800, valor_transacao: 1691000, data_transacao: "2025-10-22", total_transacoes: 2 },
  { logradouro: "R. ÉRICO VERÍSSIMO", numero: "580", tipologia: "Apartamento", area_m2: 85, valor_m2: 12500, valor_transacao: 1062500, data_transacao: "2025-09-18", total_transacoes: 4 },
  { logradouro: "AV. DAS AMÉRICAS", numero: "12500", tipologia: "Apartamento", area_m2: 110, valor_m2: 8900, valor_transacao: 979000, data_transacao: "2025-08-05", total_transacoes: 5 },
  { logradouro: "AV. PREFEITO DULCÍDIO CARDOSO", numero: "1800", tipologia: "Casa", area_m2: 250, valor_m2: 10200, valor_transacao: 2550000, data_transacao: "2025-07-10", total_transacoes: 1 },
];
