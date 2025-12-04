import type { ITBIData, AnuncioData, CharacteristicResponse, ValuationResult } from "@/utils/valuationCalculations";

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
