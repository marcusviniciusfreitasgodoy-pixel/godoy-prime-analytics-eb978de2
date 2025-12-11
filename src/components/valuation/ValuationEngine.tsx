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
import { Step0Identification } from "./Step0Identification";
import { Step1Location } from "./Step1Location";
import { Step2BasicData } from "./Step2BasicData";
import { Step3Questionnaire } from "./Step3Questionnaire";
import { Step4Results } from "./Step4Results";
import { Step5Recommendation } from "./Step5Recommendation";
import { calculateValuation, calculateCombinedPrices } from "@/utils/valuationCalculations";
import { ValuationState, initialValuationState } from "@/types/valuation";

const STEPS = [
  { id: 0, title: "Identificação", description: "Dados do imóvel" },
  { id: 1, title: "Localização", description: "Referência de mercado" },
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
  numero?: string;
  complemento?: string;
  quartos?: number;
  suites?: number;
  banheiros?: number;
  vagas?: number;
  proprietario?: string;
  telefone?: string;
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
  const [currentStep, setCurrentStep] = useState(0);
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
        tipoImovel: data.tipoImovel || prev.tipoImovel,
        nomeCondominio: data.nomeCondominio || prev.nomeCondominio,
        numero: data.numero || prev.numero,
        complemento: data.complemento || prev.complemento,
        quartos: data.quartos || prev.quartos,
        suites: data.suites || prev.suites,
        banheiros: data.banheiros || prev.banheiros,
        vagas: data.vagas || prev.vagas,
        proprietario: data.proprietario || prev.proprietario,
        telefone: data.telefone || prev.telefone,
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
      case 0:
        // Requer logradouro, tipo de imóvel e área
        return state.logradouro.trim() !== "" && state.tipoImovel !== "" && state.area_m2 > 0;
      case 1:
        return state.itbiData !== null;
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
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setState({ ...initialValuationState, bairro });
    setCurrentStep(0);
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

  const progress = ((currentStep + 1) / 6) * 100;
  const combined = state.itbiData 
    ? calculateCombinedPrices(state.itbiData, state.anuncioData || undefined)
    : null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 flex-wrap">
                <span className="whitespace-nowrap">Ferramenta de Avaliação</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground cursor-help shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-sm">
                        <strong>Metodologia:</strong> Combina 70% dados ITBI (últimos 12 meses) + 30% anúncios de mercado (últimos 30 dias) para calcular valores de referência por m².
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {fromVistoria && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs">
                    <ClipboardCheck className="h-3 w-3 mr-1" />
                    <span className="hidden xs:inline">Via</span> Vistoria
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {STEPS[currentStep].description}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit text-xs">
            Etapa {currentStep + 1}/6
          </Badge>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3 sm:mt-4 space-y-2">
          <Progress value={progress} className="h-1.5 sm:h-2" />
          
          {/* Desktop: text labels */}
          <div className="hidden sm:flex justify-between">
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
          
          {/* Mobile: visual indicators */}
          <div className="flex sm:hidden justify-center gap-1.5">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                disabled={step.id > currentStep}
                className={`h-2 rounded-full transition-all ${
                  step.id === currentStep
                    ? "w-6 bg-primary"
                    : step.id < currentStep
                    ? "w-2 bg-primary/60"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
        {/* Step content */}
        {currentStep === 0 && (
          <Step0Identification
            state={state}
            updateState={updateState}
          />
        )}
        
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
        <div className="flex justify-between pt-3 sm:pt-4 border-t gap-2">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            size="sm"
            className="h-10 sm:h-9 px-3 sm:px-4"
          >
            <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Voltar</span>
          </Button>

          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              size="sm"
              className="h-10 sm:h-9 px-3 sm:px-4"
            >
              <span className="hidden xs:inline">Próximo</span>
              <span className="xs:hidden">Avançar</span>
              <ArrowRight className="ml-1 sm:ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleReset} variant="outline" size="sm" className="h-10 sm:h-9">
              Nova Avaliação
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
