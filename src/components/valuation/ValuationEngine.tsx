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
import { AutoSaveIndicator } from "./AutoSaveIndicator";
import { calculateValuation, calculateCombinedPrices } from "@/utils/valuationCalculations";
import { ValuationState, initialValuationState } from "@/types/valuation";
import { useHistoricalTransactionAnalysis } from "@/hooks/useHistoricalTransactionAnalysis";
import { useAutoSaveValuation } from "@/hooks/useAutoSaveValuation";
import { useDraftValuation } from "@/hooks/useDraftValuation";

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

interface EditarAvaliacaoData {
  id?: string;
  logradouro: string;
  numero?: string;
  bairro: string;
  tipoImovel: string;
  area_m2: number;
  itbiData: {
    min_m2: number;
    med_m2: number;
    max_m2: number;
    transaction_count: number;
  };
  anuncioData?: {
    min_m2: number;
    med_m2: number;
    max_m2: number;
    fontes?: { valor: number; area: number; fonte?: string }[];
  } | null;
  docStatus: string;
  docFactor: number;
  docNotes?: string;
  area_terreno_m2?: number;
  proporcao_terreno?: number;
  bonus_terreno?: number;
  baseSelected?: string;
  // Campos de identificação do imóvel
  complemento?: string;
  nomeCondominio?: string;
  quartos?: number;
  suites?: number;
  banheiros?: number;
  vagas?: number;
  andar?: string;
  proprietario?: string;
  telefone?: string;
  observacoesImovel?: string;
  // Respostas dos fatores de avaliação
  responses?: {
    char_id: string;
    char_code: string;
    response: "sim" | "nao" | "nao_aplica";
    weight_applied: number;
  }[];
}

interface Props {
  bairro?: string;
  vistoriaData?: VistoriaData;
  editarData?: EditarAvaliacaoData;
}

export function ValuationEngine({ bairro = "BARRA DA TIJUCA", vistoriaData, editarData }: Props) {
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<ValuationState>({ ...initialValuationState, bairro });
  const [fromVistoria, setFromVistoria] = useState(false);
  const [fromEditar, setFromEditar] = useState(false);
  const [editingValuationId, setEditingValuationId] = useState<string | undefined>(undefined);
  
  const { data: characteristics, isLoading: loadingChars } = useValuationCharacteristics(state.tipoImovel);
  const { data: docFactors, isLoading: loadingDocs } = useDocumentationFactors();
  
  // Buscar análise histórica para calcular score de liquidez
  const { data: historicalAnalysis } = useHistoricalTransactionAnalysis(
    state.logradouro,
    state.bairro,
    !!state.logradouro && !!state.bairro && state.itbiData !== null
  );

  // Check for editar data from props (priority over vistoria)
  useEffect(() => {
    if (editarData) {
      setFromEditar(true);
      setEditingValuationId(editarData.id);
      setState(prev => ({
        ...prev,
        logradouro: editarData.logradouro,
        numero: editarData.numero || "",
        bairro: editarData.bairro,
        tipoImovel: editarData.tipoImovel,
        area_m2: editarData.area_m2,
        itbiData: editarData.itbiData,
        anuncioData: editarData.anuncioData || null,
        docStatus: editarData.docStatus,
        docFactor: editarData.docFactor,
        docNotes: editarData.docNotes || "",
        area_terreno_m2: editarData.area_terreno_m2 || 0,
        proporcao_terreno: editarData.proporcao_terreno || 0,
        bonus_terreno: editarData.bonus_terreno || 0,
        baseSelected: (editarData.baseSelected as "min" | "med" | "max" | "custom") || "med",
        // Campos de identificação do imóvel
        complemento: editarData.complemento || "",
        nomeCondominio: editarData.nomeCondominio || "",
        quartos: editarData.quartos || 0,
        suites: editarData.suites || 0,
        banheiros: editarData.banheiros || 0,
        vagas: editarData.vagas || 0,
        andar: editarData.andar || "",
        proprietario: editarData.proprietario || "",
        telefone: editarData.telefone || "",
        observacoesImovel: editarData.observacoesImovel || "",
        // Respostas dos fatores de avaliação carregadas do histórico
        responses: editarData.responses || [],
      }));
      // Clear location state after using it
      window.history.replaceState({}, document.title);
      return;
    }
  }, [editarData]);

  // Check for vistoria data from navigation or props
  useEffect(() => {
    if (editarData) return; // Skip if editing
    
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
  }, [location.state, vistoriaData, editarData]);

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
    // Se avançando do step 3 para 4, calcula resultado e normaliza as 26 respostas em UMA única atualização
    // (evita condição de corrida onde o Step5 salva antes de responses estar preenchido)
    if (currentStep === 3 && characteristics) {
      setState((prev) => {
        const normalizedResponses = characteristics.map((c) => {
          const existing = prev.responses.find((r) => r.char_id === c.id);
          return {
            char_id: c.id,
            char_code: c.char_code,
            response: existing?.response || "nao",
            weight_applied:
              existing?.response === "sim"
                ? (existing.weight_applied ?? c.weight_value)
                : 0,
          };
        });

        const result = calculateValuation(
          prev.area_m2,
          prev.itbiData!,
          prev.anuncioData || undefined,
          normalizedResponses,
          characteristics,
          prev.docStatus,
          prev.docFactor,
          prev.bonus_terreno,
          prev.tipoImovel,
          historicalAnalysis?.liquidityScore
        );

        return { ...prev, responses: normalizedResponses, result, historicalAnalysis };
      });
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
      state.docFactor,
      state.bonus_terreno,
      state.tipoImovel, // Passa tipo de imóvel para caps diferenciados
      historicalAnalysis?.liquidityScore // Passa score de liquidez histórico
    );
  };

  const progress = ((currentStep + 1) / 6) * 100;
  const combined = state.itbiData 
    ? calculateCombinedPrices(state.itbiData, state.anuncioData || undefined)
    : null;

  // Hooks de auto-save DEVEM ser chamados sempre (nunca após returns condicionais)
  const isNewValuation = !fromEditar && !editingValuationId;
  const canAutoPersist = !loadingChars && !loadingDocs;

  // Auto-save para novas avaliações (cria rascunho desde a primeira etapa)
  const { draftId, isCreating: isDraftCreating } = useDraftValuation({
    state,
    combined,
    enabled: canAutoPersist && isNewValuation && currentStep < 4,
    debounceMs: 800,
  });

  // Determina qual ID usar para auto-save: rascunho ou edição existente
  const activeValuationId = fromEditar ? editingValuationId : draftId;

  // Auto-save para modo de edição OU rascunho (somente nas etapas 0-3)
  const { status: autoSaveStatus, lastSavedAt } = useAutoSaveValuation({
    valuationId: activeValuationId || undefined,
    state,
    combined,
    enabled: canAutoPersist && !!activeValuationId && currentStep < 4,
    debounceMs: 800,
  });

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
                    <TooltipContent side="bottom" className="max-w-sm">
                      <div className="space-y-2 text-xs">
                        <p className="font-semibold">Metodologia de Cálculo</p>
                        <ul className="space-y-1 list-disc list-inside">
                          <li><strong>Fonte:</strong> Transações oficiais ITBI da Prefeitura do Rio</li>
                          <li><strong>Filtro:</strong> Apenas imóveis com ≥90% de transferência</li>
                          <li><strong>Mínimo:</strong> 3 transações para garantir precisão estatística</li>
                          <li><strong>Faixa:</strong> Calculada com base em mín, mediana e máx do m²</li>
                          <li><strong>Atualização:</strong> Diária automática às 02:00</li>
                        </ul>
                        <p className="text-muted-foreground italic pt-1 border-t border-border">
                          Esta é uma ferramenta estatística e não substitui laudo PTAM.
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {fromVistoria && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs">
                    <ClipboardCheck className="h-3 w-3 mr-1" />
                    <span className="hidden xs:inline">Via</span> Vistoria
                  </Badge>
                )}
                {fromEditar && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <Calculator className="h-3 w-3 mr-1" />
                    Editando
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {STEPS[currentStep].description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Auto-save indicator (edição ou nova avaliação com rascunho) */}
            {currentStep < 4 && (activeValuationId || isDraftCreating) && (
              <AutoSaveIndicator 
                status={isDraftCreating ? "saving" : autoSaveStatus} 
                lastSavedAt={lastSavedAt} 
              />
            )}
            <Badge variant="outline" className="w-fit text-xs">
              Etapa {currentStep + 1}/6
            </Badge>
          </div>
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
        {/* Step content with transition animation */}
        <div 
          key={currentStep}
          className="animate-fade-in"
        >
          {currentStep === 0 && (
            <div data-tour="avaliacao-step0">
              <Step0Identification
                state={state}
                updateState={updateState}
              />
            </div>
          )}
          
          {currentStep === 1 && (
            <div data-tour="avaliacao-step1">
              <Step1Location
                state={state}
                updateState={updateState}
                combined={combined}
              />
            </div>
          )}
          
          {currentStep === 2 && (
            <div data-tour="avaliacao-step2">
              <Step2BasicData
                state={state}
                updateState={updateState}
                combined={combined}
              />
            </div>
          )}
          
          {currentStep === 3 && characteristics && docFactors && (
            <div data-tour="avaliacao-step3">
              <Step3Questionnaire
                state={state}
                updateState={updateState}
                characteristics={characteristics}
                docFactors={docFactors}
                preview={getPreview()}
              />
            </div>
          )}
          
          {currentStep === 4 && state.result && (
            <div data-tour="avaliacao-step4">
              <Step4Results
                result={state.result}
                state={state}
                combined={combined}
              />
            </div>
          )}
          
          {currentStep === 5 && state.result && (
            <div data-tour="avaliacao-step5">
              <Step5Recommendation
                result={state.result}
                state={state}
                combined={combined}
                onReset={handleReset}
                existingValuationId={activeValuationId || undefined}
              />
            </div>
          )}
        </div>

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
