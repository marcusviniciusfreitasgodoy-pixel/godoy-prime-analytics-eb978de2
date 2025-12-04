import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Calculator } from "lucide-react";
import { useValuationCharacteristics, useDocumentationFactors } from "@/hooks/useValuationCharacteristics";
import { Skeleton } from "@/components/ui/skeleton";
import { Step1Location } from "./Step1Location";
import { Step2BasicData } from "./Step2BasicData";
import { Step3Questionnaire } from "./Step3Questionnaire";
import { Step4Results } from "./Step4Results";
import { Step5Recommendation } from "./Step5Recommendation";
import type { ITBIData, AnuncioData, CharacteristicResponse, ValuationResult } from "@/utils/valuationCalculations";
import { calculateValuation, calculateCombinedPrices } from "@/utils/valuationCalculations";

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

const initialState: ValuationState = {
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

const STEPS = [
  { id: 1, title: "Localização", description: "Selecione o endereço" },
  { id: 2, title: "Dados Básicos", description: "Área e base de preço" },
  { id: 3, title: "Características", description: "26 fatores de avaliação" },
  { id: 4, title: "Resultados", description: "3 cenários de valor" },
  { id: 5, title: "Recomendação", description: "Análise e próximos passos" },
];

interface Props {
  bairro?: string;
}

export function ValuationEngine({ bairro = "BARRA DA TIJUCA" }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<ValuationState>({ ...initialState, bairro });
  
  const { data: characteristics, isLoading: loadingChars } = useValuationCharacteristics();
  const { data: docFactors, isLoading: loadingDocs } = useDocumentationFactors();

  const updateState = (updates: Partial<ValuationState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return state.logradouro && state.itbiData;
      case 2:
        return state.area_m2 > 0;
      case 3:
        return state.responses.length > 0;
      case 4:
        return state.result !== null;
      default:
        return true;
    }
  };

  const handleNext = () => {
    // Se avançando do step 3 para 4, calcula resultado
    if (currentStep === 3 && characteristics) {
      const result = calculateValuation(
        state.area_m2,
        state.itbiData!,
        state.anuncioData || undefined,
        state.responses,
        characteristics,
        state.docStatus,
        state.docFactor
      );
      updateState({ result });
    }
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setState({ ...initialState, bairro });
    setCurrentStep(1);
  };

  // Calcula preview em tempo real
  const getPreview = () => {
    if (!state.itbiData || !state.area_m2 || !characteristics) return null;
    
    return calculateValuation(
      state.area_m2,
      state.itbiData,
      state.anuncioData || undefined,
      state.responses,
      characteristics,
      state.docStatus,
      state.docFactor
    );
  };

  if (loadingChars || loadingDocs) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const progress = (currentStep / 5) * 100;
  const combined = state.itbiData 
    ? calculateCombinedPrices(state.itbiData, state.anuncioData || undefined)
    : null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-lg">Valuation Engine</CardTitle>
              <p className="text-sm text-muted-foreground">
                {STEPS[currentStep - 1].description}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium">
              Etapa {currentStep} de 5
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4 space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                disabled={step.id > currentStep}
                className={`text-xs transition-colors ${
                  step.id === currentStep
                    ? "text-primary font-medium"
                    : step.id < currentStep
                    ? "text-muted-foreground hover:text-foreground cursor-pointer"
                    : "text-muted-foreground/50"
                }`}
              >
                {step.title}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step content */}
        {currentStep === 1 && (
          <Step1Location
            state={state}
            updateState={updateState}
            combined={combined}
          />
        )}
        
        {currentStep === 2 && (
          <Step2BasicData
            state={state}
            updateState={updateState}
            combined={combined}
          />
        )}
        
        {currentStep === 3 && characteristics && docFactors && (
          <Step3Questionnaire
            state={state}
            updateState={updateState}
            characteristics={characteristics}
            docFactors={docFactors}
            preview={getPreview()}
          />
        )}
        
        {currentStep === 4 && state.result && (
          <Step4Results
            result={state.result}
            state={state}
            combined={combined}
          />
        )}
        
        {currentStep === 5 && state.result && (
          <Step5Recommendation
            result={state.result}
            state={state}
            combined={combined}
            onReset={handleReset}
          />
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleReset} variant="outline">
              Nova Avaliação
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
