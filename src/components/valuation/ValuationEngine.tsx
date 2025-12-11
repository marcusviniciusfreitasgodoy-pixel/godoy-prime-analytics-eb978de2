import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Calculator, ClipboardCheck, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useValuationCharacteristics, useDocumentationFactors } from "@/hooks/useValuationCharacteristics";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Step1Location } from "./Step1Location";
import { Step2BasicData } from "./Step2BasicData";
import { Step3Questionnaire } from "./Step3Questionnaire";
import { Step4Results } from "./Step4Results";
import { Step5Recommendation } from "./Step5Recommendation";
import { calculateValuation, calculateCombinedPrices } from "@/utils/valuationCalculations";
import { ValuationState, initialValuationState } from "@/types/valuation";

const STEPS = [
  { id: 1, title: "Localização", description: "Selecione o endereço" },
  { id: 2, title: "Dados Básicos", description: "Área e base de preço" },
  { id: 3, title: "Características", description: "26 fatores de avaliação" },
  { id: 4, title: "Resultados", description: "3 cenários de valor" },
  { id: 5, title: "Recomendação", description: "Análise e próximos passos" },
];

interface VistoriaData {
  logradouro?: string;
  bairro?: string;
  area_m2?: number;
  tipoImovel?: string;
  nomeCondominio?: string;
  checklistSummary?: {
    criticalCount: number;
    attentionCount: number;
    progress: number;
    eletrica?: boolean;
    hidraulica?: boolean;
    acabamentos?: boolean;
    climatizacao?: boolean;
    seguranca?: boolean;
    lazer?: boolean;
    automacao?: boolean;
  };
}

interface Props {
  bairro?: string;
  vistoriaData?: VistoriaData;
}

export function ValuationEngine({ bairro = "BARRA DA TIJUCA", vistoriaData }: Props) {
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<ValuationState>({ ...initialValuationState, bairro });
  const [fromVistoria, setFromVistoria] = useState(false);
  
  const { data: characteristics, isLoading: loadingChars } = useValuationCharacteristics();
  const { data: docFactors, isLoading: loadingDocs } = useDocumentationFactors();

  // Check for vistoria data from navigation or props
  useEffect(() => {
    const locationState = location.state as { fromVistoria?: boolean; vistoriaData?: VistoriaData } | null;
    const data = vistoriaData || locationState?.vistoriaData;
    
    if (data) {
      setFromVistoria(true);
      setState(prev => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        area_m2: data.area_m2 || prev.area_m2,
      }));
      
      // Clear location state after using it
      if (locationState?.fromVistoria) {
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, vistoriaData]);

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
        // Exige apenas status de documentação (respostas não preenchidas são tratadas como "nao")
        const hasDocStatus = state.docStatus && state.docStatus.trim() !== "";
        return hasDocStatus;
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
    setState({ ...initialValuationState, bairro });
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

  // Verificar se os dados foram carregados
  if (!characteristics || characteristics.length === 0 || !docFactors || docFactors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ferramenta de Avaliação</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Carregando configurações de avaliação...
          </p>
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
              <CardTitle className="text-lg flex items-center gap-2">
                Ferramenta de Avaliação
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-sm">
                        <strong>Metodologia:</strong> Combina 70% dados ITBI (últimos 12 meses) + 30% anúncios de mercado (últimos 30 dias) para calcular valores de referência por m².
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {fromVistoria && (
                  <Badge variant="secondary" className="text-xs">
                    <ClipboardCheck className="h-3 w-3 mr-1" />
                    Via Vistoria
                  </Badge>
                )}
              </CardTitle>
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
