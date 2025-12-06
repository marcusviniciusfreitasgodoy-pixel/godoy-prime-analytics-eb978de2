// Types for Ferramenta de Avaliação - defined inline to avoid circular dependencies

export interface ITBIData {
  min_m2: number;
  med_m2: number;
  max_m2: number;
  transaction_count: number;
}

export interface AnuncioData {
  min_m2: number;
  med_m2: number;
  max_m2: number;
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

export interface ValuationState {
  // Step 1: Location
  logradouro: string;
  bairro: string;
  itbiData: ITBIData | null;
  anuncioData: AnuncioData | null;
  
  // Step 2: Basic Data
  area_m2: number;
  baseSelected: "min" | "med" | "max" | "custom";
  customBaseM2: number | null;
  
  // Step 3: Questionnaire
  responses: CharacteristicResponse[];
  
  // Step 4-5: Documentation
  docStatus: string;
  docFactor: number;
  docNotes: string;
  
  // Results
  result: ValuationResult | null;
}

export const initialValuationState: ValuationState = {
  logradouro: "",
  bairro: "BARRA DA TIJUCA",
  itbiData: null,
  anuncioData: null,
  area_m2: 0,
  baseSelected: "med",
  customBaseM2: null,
  responses: [],
  docStatus: "ok",
  docFactor: 1.0,
  docNotes: "",
  result: null,
};