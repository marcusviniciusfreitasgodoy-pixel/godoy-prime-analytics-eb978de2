// Types for Ferramenta de Avaliação - defined inline to avoid circular dependencies

export interface ITBIData {
  min_m2: number;
  med_m2: number;
  max_m2: number;
  transaction_count: number;
  avg_valor_transacao?: number; // Preço médio das transações na região
}

export interface AnuncioFonte {
  valor: number;
  area: number;
  fonte?: string;
}

export interface AnuncioData {
  min_m2: number;
  med_m2: number;
  max_m2: number;
  count?: number; // Nº de anúncios encontrados (mínimo recomendado: 3)
  fontes?: AnuncioFonte[]; // Fontes/links dos anúncios para rastreabilidade
}

export interface CharacteristicResponse {
  char_id: string;
  char_code: string;
  response: "sim" | "nao" | "nao_aplica";
  weight_applied: number;
}

export interface RecommendationResult {
  status: string;
  title: string;
  icon?: string;  // Ícone PDF-safe (sem emojis que corrompem no jsPDF)
  message: string;
  details?: string[];
  urgency?: string;
  potential_gain?: number;
}

export interface ValuationResult {
  pessimista: number;
  provavel: number;
  otimista: number;
  spread_percentage: number;
  confidence_score: number;
  confidence_level: "green" | "yellow_high" | "yellow_medium" | "red";
  total_adjustment: number;
  auto_capped: boolean;
  recommendation: RecommendationResult;
}

export interface YearlyData {
  ano: number;
  transacoes: number;
  valorMedioM2: number;
  valorMinM2: number;
  valorMaxM2: number;
}

export interface FutureProjection {
  oneYear: { optimistic: number; pessimistic: number; probable: number };
  twoYears: { optimistic: number; pessimistic: number; probable: number };
  threeYears: { optimistic: number; pessimistic: number; probable: number };
  optimisticRate: number;
  pessimisticRate: number;
  probableRate: number;
  confidence: 'alta' | 'media' | 'baixa';
  disclaimer: string;
}

export interface HistoricalAnalysis {
  yearlyData: YearlyData[];
  transactionTrend: 'crescente' | 'estavel' | 'decrescente';
  priceTrend: 'alta' | 'estavel' | 'baixa';
  liquidityScore: number;
  liquidityLevel: 'alta' | 'media' | 'baixa';
  transactionGrowth: number;
  priceGrowth: number;
  diagnostico: string;
  alertas: string[];
  futureProjection?: FutureProjection;
  dataSource?: 'logradouro' | 'bairro' | 'raio500';
  logradouroUsado?: string;
  bairroUsado?: string;
  raioMetros?: number;
  hasCurrentYearData?: boolean;
  currentYearCount?: number;
  currentYearAvgM2?: number;
}

export interface CondominioSelecionado {
  nome: string;
  ruas_internas: string[];
  logradouro_padrao: string;
  logradouro_itbi_normalizado?: string | null;
  logradouros_busca?: string[];
}

export interface ValuationState {
  // Step 0: Identificação do Imóvel
  numero: string;
  complemento: string;
  nomeCondominio: string;
  condominioSelecionado: CondominioSelecionado | null;
  tipoImovel: string;
  quartos: number;
  suites: number;
  banheiros: number;
  vagas: number;
  andar: string;
  proprietario: string;
  telefone: string;
  // Dados do proprietário para emissão de Autorização de Captação
  proprietario_cpf: string;
  proprietario_rg: string;
  proprietario_rg_orgao: string;
  proprietario_email: string;
  cep: string;
  cidade: string;
  valor_condominio: number;
  valor_iptu: number;
  dataAvaliacao: string;
  observacoesImovel: string;
  
  // Step 1: Location
  logradouro: string;
  bairro: string;
  itbiData: ITBIData | null;
  anuncioData: AnuncioData | null;
  
  // Step 2: Basic Data
  area_m2: number;
  baseSelected: "min" | "med" | "max" | "custom";
  customBaseM2: number | null;
  
  // Campos específicos para Casas (terreno)
  area_terreno_m2: number;
  proporcao_terreno: number;
  bonus_terreno: number;
  
  // Step 3: Questionnaire
  responses: CharacteristicResponse[];
  
  // Step 4-5: Documentation
  docStatus: string;
  docFactor: number;
  docNotes: string;
  
  // Results
  result: ValuationResult | null;
  
  // Histórico 5 anos
  historicalAnalysis: HistoricalAnalysis | null;
  
  // Tipo de avaliação
  tipoAvaliacao: "simples" | "completa";
}

export const initialValuationState: ValuationState = {
  // Step 0: Identificação
  numero: "",
  complemento: "",
  nomeCondominio: "",
  condominioSelecionado: null,
  tipoImovel: "",
  quartos: 0,
  suites: 0,
  banheiros: 0,
  vagas: 0,
  andar: "",
  proprietario: "",
  telefone: "",
  proprietario_cpf: "",
  proprietario_rg: "",
  proprietario_rg_orgao: "",
  proprietario_email: "",
  cep: "",
  cidade: "Rio de Janeiro",
  valor_condominio: 0,
  valor_iptu: 0,
  dataAvaliacao: new Date().toISOString().split('T')[0],
  observacoesImovel: "",
  
  // Step 1: Location
  logradouro: "",
  bairro: "BARRA DA TIJUCA",
  itbiData: null,
  anuncioData: null,
  
  // Step 2: Basic Data
  area_m2: 0,
  baseSelected: "med",
  customBaseM2: null,
  
  // Campos específicos para Casas (terreno)
  area_terreno_m2: 0,
  proporcao_terreno: 0,
  bonus_terreno: 0,
  
  // Step 3: Questionnaire
  responses: [],
  
  // Step 4-5: Documentation
  docStatus: "ok",
  docFactor: 1.0,
  docNotes: "",
  
  // Results
  result: null,
  
  // Histórico 5 anos
  historicalAnalysis: null,
  
  // Tipo de avaliação
  tipoAvaliacao: "simples",
};
