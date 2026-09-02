import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  FileDown, 
  CheckCircle,
  AlertTriangle,
  Clock,
  Wrench,
  XCircle,
  ClipboardCheck,
  FileText,
  Target,
  ArrowRight,
  Mail
} from "lucide-react";
import { toast } from "sonner";
import type { ValuationResult, CombinedPrices } from "@/utils/valuationCalculations";
import type { ValuationState } from "@/types/valuation";
import { exportValuationEnginePDF, generateValuationPDFForEmail, getValuationPDFFilename, PricingStrategyPDFData } from "@/utils/valuationPdfExport";
import { useAuth } from "@/hooks/useAuth";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { supabase } from "@/integrations/supabase/client";
import { PricingStrategyModule } from "@/components/pricing/PricingStrategyModule";
import { PricingStrategyState, StrategyType } from "@/types/pricingStrategy";
import { SendPdfEmailDialog, ReportType } from "@/components/SendPdfEmailDialog";
import { GerarAutorizacaoButton } from "@/components/autorizacoes/GerarAutorizacaoButton";
import { FileSignature } from "lucide-react";
import { AnalistaImobiliarioPanel } from "@/components/valuation/AnalistaImobiliarioPanel";

interface Props {
  result: ValuationResult;
  state: ValuationState;
  combined: CombinedPrices | null;
  onReset: () => void;
  /** ID da avaliação existente (para edição do histórico) */
  existingValuationId?: string;
}

export function Step5Recommendation({ result, state, combined, onReset, existingValuationId }: Props) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { trackValuation, trackExport } = useActivityTracking();
  const [decisionMade, setDecisionMade] = useState<"sim" | "nao" | null>(null);
  const [isSaved, setIsSaved] = useState(!!existingValuationId);
  const [valuationId, setValuationId] = useState<string | null>(existingValuationId || null);
  const [showPricingModule, setShowPricingModule] = useState(false);
  const [pricingCompleted, setPricingCompleted] = useState(false);
  const [pricingData, setPricingData] = useState<PricingStrategyPDFData | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [observacoes, setObservacoes] = useState(state.observacoesImovel || "");

  // Debounced save of observations to DB
  useEffect(() => {
    const currentId = valuationId || existingValuationId;
    if (!currentId || observacoes === (state.observacoesImovel || "")) return;
    
    const timer = setTimeout(async () => {
      await supabase
        .from("valuations")
        .update({ observacoes_imovel: observacoes || null })
        .eq("id", currentId);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [observacoes, valuationId, existingValuationId]);

  // Carregar estratégia de precificação existente para edição
  useEffect(() => {
    const loadExistingPricing = async () => {
      if (!existingValuationId) return;
      
      try {
        const { data, error } = await supabase
          .from('pricing_strategies')
          .select('*')
          .eq('valuation_id', existingValuationId)
          .maybeSingle();
        
        if (data && !error && data.estrategia_selecionada) {
          setPricingCompleted(true);
          
          // Reconstruir dados para PDF
          if (data.preco_anuncio_mercado) {
            setPricingData({
              valorItbi: data.valor_itbi,
              estrategiaSelecionada: data.estrategia_selecionada as any,
              estrategiaRecomendada: data.estrategia_recomendada as any,
              calculos: {
                atracao: {
                  percentual: data.p_atracao,
                  preco_anuncio: data.preco_anuncio_atracao || 0,
                  corretagem: data.corretagem_atracao || 0,
                  liquido: data.liquido_atracao || 0,
                  piso_planejado: data.piso_planejado_atracao || 0,
                  liquido_min: data.liquido_min_atracao || 0,
                  premio_liquido_pct: data.premio_liquido_pct_atracao || 0,
                },
                mercado: {
                  percentual: data.p_mercado,
                  preco_anuncio: data.preco_anuncio_mercado || 0,
                  corretagem: data.corretagem_mercado || 0,
                  liquido: data.liquido_mercado || 0,
                  piso_planejado: data.piso_planejado_mercado || 0,
                  liquido_min: data.liquido_min_mercado || 0,
                  premio_liquido_pct: data.premio_liquido_pct_mercado || 0,
                },
                premium: {
                  percentual: data.p_premium,
                  preco_anuncio: data.preco_anuncio_premium || 0,
                  corretagem: data.corretagem_premium || 0,
                  liquido: data.liquido_premium || 0,
                  piso_planejado: data.piso_planejado_premium || 0,
                  liquido_min: data.liquido_min_premium || 0,
                  premio_liquido_pct: data.premio_liquido_pct_premium || 0,
                },
              },
              planoAjusteAtivo: data.plano_ajuste_ativo || false
            });
          }
          
          console.log('Estratégia de precificação carregada do histórico');
        }
      } catch (err) {
        console.error('Erro ao carregar estratégia:', err);
      }
    };
    
    loadExistingPricing();
  }, [existingValuationId]);

  // Salvar avaliação no banco ao montar o componente
  // - Se for NOVA avaliação: INSERT em valuations + INSERT em valuation_responses
  // - Se for EDIÇÃO (existingValuationId): UPDATE em valuations + substitui valuation_responses
  // IMPORTANTE: Esperar que state.responses tenha os 26 fatores antes de salvar
  useEffect(() => {
    const saveValuation = async () => {
      if (!user?.id) return;

      const targetValuationId = existingValuationId || valuationId;
      const isEditing = !!existingValuationId;

      // Evita resalvar sem necessidade em modo "nova"
      if (!isEditing && isSaved) return;

      // Aguarda respostas estarem disponíveis (idealmente 26 já normalizadas no Step 3 -> 4)
      if (!state.responses || state.responses.length === 0) {
        console.log("Aguardando respostas serem populadas...");
        return;
      }

      console.log(`${isEditing ? "Atualizando" : "Salvando"} avaliação com ${state.responses.length} fatores`);

      try {
        const payload = {
          user_id: user.id,
          logradouro: state.logradouro,
          numero: state.numero || null,
          bairro: state.bairro,
          property_area_m2: state.area_m2,
          property_type: state.tipoImovel || null,
          // Campos de identificação do imóvel
          complemento: state.complemento || null,
          nome_condominio: state.nomeCondominio || null,
          quartos: state.quartos ?? null,
          suites: state.suites ?? null,
          banheiros: state.banheiros ?? null,
          vagas: state.vagas ?? null,
          andar: state.andar || null,
          proprietario: state.proprietario || null,
          telefone: state.telefone || null,
          proprietario_cpf: state.proprietario_cpf || null,
          proprietario_rg: state.proprietario_rg || null,
          proprietario_rg_orgao: state.proprietario_rg_orgao || null,
          proprietario_email: state.proprietario_email || null,
          cep: state.cep || null,
          cidade: state.cidade || null,
          valor_condominio: state.valor_condominio || null,
          valor_iptu: state.valor_iptu || null,
          observacoes_imovel: state.observacoesImovel || null,
          // Dados ITBI
          itbi_min_m2: state.itbiData?.min_m2 || 0,
          itbi_med_m2: state.itbiData?.med_m2 || 0,
          itbi_max_m2: state.itbiData?.max_m2 || 0,
          itbi_transaction_count: state.itbiData?.transaction_count || 0,
          anuncio_min_m2: state.anuncioData?.min_m2 || null,
          anuncio_med_m2: state.anuncioData?.med_m2 || null,
          anuncio_max_m2: state.anuncioData?.max_m2 || null,
          // Sanitiza JSON para garantir persistência (remove undefined)
          anuncio_fontes: state.anuncioData?.fontes
            ? JSON.parse(JSON.stringify(state.anuncioData.fontes))
            : null,
          combined_min_m2: combined?.min_m2 || state.itbiData?.min_m2 || 0,
          combined_med_m2: combined?.med_m2 || state.itbiData?.med_m2 || 0,
          combined_max_m2: combined?.max_m2 || state.itbiData?.max_m2 || 0,
          final_value_min: result.pessimista,
          final_value_med: result.provavel,
          final_value_max: result.otimista,
          total_adjustment: result.total_adjustment,
          confidence_level: result.confidence_level,
          confidence_score: result.confidence_score,
          spread_percentage: result.spread_percentage,
          documentation_status: state.docStatus || "ok",
          documentation_factor: state.docFactor ?? 1,
          documentation_notes: state.docNotes || null,
          recommendation_title: result.recommendation.title,
          recommendation_action: result.recommendation.status,
          recommendation_details: result.recommendation.details ? { steps: result.recommendation.details } : null,
          trend_direction: combined?.trend_direction || null,
          trend_percentage: combined?.trend_percentage || null,
          bonus_terreno: state.bonus_terreno ?? null,
          area_terreno_m2: state.area_terreno_m2 ?? null,
          proporcao_terreno: state.proporcao_terreno ?? null,
          auto_capped: result.auto_capped || false,
          pdf_generated: false,
          base_price_selected: state.baseSelected || "med",
          tipo_avaliacao: state.tipoAvaliacao || "completa",
        };

        let finalValuationId: string | null = targetValuationId || null;

        if (isEditing && existingValuationId) {
          const { error: updateError } = await supabase
            .from("valuations")
            .update(payload)
            .eq("id", existingValuationId);

          if (updateError) {
            console.error("Erro ao atualizar avaliação:", updateError);
            toast.error("Não foi possível atualizar a avaliação. Tente novamente.");
            return;
          }

          finalValuationId = existingValuationId;
        } else {
          const { data: insertedValuation, error: insertError } = await supabase
            .from("valuations")
            .insert(payload as any)
            .select("id")
            .single();

          if (insertError) {
            console.error("Erro ao salvar avaliação:", insertError);
            toast.error("Não foi possível salvar a avaliação. Tente novamente.");
            return;
          }

          finalValuationId = insertedValuation?.id ?? null;
        }

        if (!finalValuationId) {
          toast.error("Não foi possível identificar o ID da avaliação para salvar os fatores.");
          return;
        }

        // Rastreabilidade do motor (Fase 1 da auditoria). Gravado em chamada separada
        // para que uma migration ainda não aplicada não impeça o salvamento da avaliação.
        if (state.itbiData?.meta) {
          const { error: metaError } = await supabase
            .from("valuations")
            .update({ itbi_metadata: JSON.parse(JSON.stringify(state.itbiData.meta)) } as never)
            .eq("id", finalValuationId);
          if (metaError) {
            console.warn("Não foi possível gravar itbi_metadata (migration aplicada?):", metaError.message);
          }
        }

        // Substitui as respostas (garante consistência com as 26 características)
        const responsesData = state.responses.map((r) => ({
          valuation_id: finalValuationId,
          characteristic_id: r.char_id,
          response_value: r.response,
          weight_applied: r.weight_applied,
        }));

        // Em edição, removemos as antigas e inserimos novamente (simples e confiável)
        if (isEditing) {
          const { error: delErr } = await supabase
            .from("valuation_responses")
            .delete()
            .eq("valuation_id", finalValuationId);

          if (delErr) {
            console.error("Erro ao limpar respostas antigas:", delErr);
            toast.error("Não foi possível atualizar os fatores da avaliação.");
            return;
          }
        }

        const { error: responsesError } = await supabase
          .from("valuation_responses")
          .insert(responsesData);

        if (responsesError) {
          console.error("Erro ao salvar respostas:", responsesError);
          toast.error("Não foi possível salvar os 26 itens da avaliação. Tente novamente.");
          return;
        }

        setIsSaved(true);
        setValuationId(finalValuationId);

        if (isEditing) {
          toast.success("Avaliação atualizada com sucesso!");
        } else {
          console.log(`✅ ${responsesData.length} fatores de avaliação salvos com sucesso`);
          console.log("Avaliação salva com sucesso:", finalValuationId);
        }
      } catch (err) {
        console.error("Erro ao salvar avaliação:", err);
        toast.error("Erro inesperado ao salvar. Tente novamente.");
      }
    };

    saveValuation();
  }, [user?.id, result, state, combined, isSaved, state.responses, existingValuationId, valuationId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRecommendationIcon = () => {
    switch (result.recommendation.status) {
      case "READY_TO_MARKET":
        return <CheckCircle className="h-6 w-6 text-emerald-600" />;
      case "WAIT_30_DAYS":
        return <Clock className="h-6 w-6 text-blue-600" />;
      case "REGULARIZE_FIRST":
        return <Wrench className="h-6 w-6 text-amber-600" />;
      case "CONSULT_SPECIALIST":
        return <AlertTriangle className="h-6 w-6 text-orange-600" />;
      case "MARKET_CAUTION":
        return <TrendingDown className="h-6 w-6 text-amber-600" />;
      case "REVIEW_PRICING":
        return <AlertTriangle className="h-6 w-6 text-orange-600" />;
      case "NEED_SPECIALIST_VALUATION":
      case "INSUFFICIENT_SAMPLE":
      case "BLOCKED_EVALUATION":
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return <CheckCircle className="h-6 w-6 text-primary" />;
    }
  };

  const getRecommendationColor = () => {
    switch (result.recommendation.status) {
      case "READY_TO_MARKET":
        return "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30";
      case "WAIT_30_DAYS":
        return "bg-blue-50 border-blue-200 dark:bg-blue-950/30";
      case "REGULARIZE_FIRST":
        return "bg-amber-50 border-amber-200 dark:bg-amber-950/30";
      case "CONSULT_SPECIALIST":
      case "MARKET_CAUTION":
      case "REVIEW_PRICING":
        return "bg-orange-50 border-orange-200 dark:bg-orange-950/30";
      case "NEED_SPECIALIST_VALUATION":
      case "INSUFFICIENT_SAMPLE":
      case "BLOCKED_EVALUATION":
        return "bg-red-50 border-red-200 dark:bg-red-950/30";
      default:
        return "bg-muted";
    }
  };

  const TrendIcon = combined?.trend_direction === "UP"
    ? TrendingUp
    : combined?.trend_direction === "DOWN"
    ? TrendingDown
    : Minus;

  const handleExportPDF = (isSimplified: boolean = false) => {
    try {
      const stateWithType: ValuationState = {
        ...state,
        observacoesImovel: observacoes,
        tipoAvaliacao: isSimplified ? "simples" : "completa"
      };
      
      // Passa as fontes dos anúncios e dados de precificação para o PDF
      const anuncioFontes = state.anuncioData?.fontes;
      exportValuationEnginePDF(result, stateWithType, combined, anuncioFontes, pricingData);
      
      // Track the valuation export
      trackValuation();
      trackExport(isSimplified ? 'valuation_simple_pdf' : 'valuation_complete_pdf');
      
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  const handleGoToVistoria = () => {
    setDecisionMade("sim");
    
    // Prepara dados para transferir para Vistoria Digital
    const vistoriaData = {
      logradouro: state.logradouro,
      numero: state.numero,
      complemento: state.complemento,
      bairro: state.bairro,
      nomeCondominio: state.nomeCondominio,
      tipoImovel: state.tipoImovel,
      areaM2: state.area_m2.toString(),
      quartos: state.quartos.toString(),
      suites: state.suites.toString(),
      banheiros: state.banheiros.toString(),
      vagas: state.vagas.toString(),
      proprietario: state.proprietario,
      telefone: state.telefone,
      observacoes: state.observacoesImovel,
      // Mantém o vínculo com a avaliação salva (quando existir)
      valuationId: valuationId || existingValuationId || null,
      // Estratégia de precificação (para aparecer no PDF de vistoria)
      pricingStrategy: pricingData,
      // Dados COMPLETOS da avaliação para relatório integrado
      avaliacaoData: {
        valorProvavel: result.provavel,
        valorPessimista: result.pessimista,
        valorOtimista: result.otimista,
        confidenceLevel: result.confidence_level,
        confidenceScore: result.confidence_score,
        dataAvaliacao: state.dataAvaliacao,
        // Dados de mercado ITBI - usamos combined (ITBI+Anúncios) ou fallback para ITBI puro
        itbiMinM2: combined?.min_m2 || state.itbiData?.min_m2,
        itbiMedM2: combined?.med_m2 || state.itbiData?.med_m2,
        itbiMaxM2: combined?.max_m2 || state.itbiData?.max_m2,
        transactionCount: state.itbiData?.transaction_count,
        // Tendência
        trendPercentage: combined?.trend_percentage,
        trendDirection: combined?.trend_direction,
        // Métricas de ajuste
        totalAdjustment: result.total_adjustment,
        spreadPercentage: result.spread_percentage,
        // Recomendação
        recommendationTitle: result.recommendation.title,
        recommendationMessage: result.recommendation.message,
        // Fontes dos anúncios
        anuncioFontes: state.anuncioData?.fontes?.filter(f => f.fonte)?.map(f => f.fonte) || [],
        // Dados históricos para o relatório de vistoria
        historicalAnalysis: state.historicalAnalysis,
      }
    };

    toast.success("Dados transferidos para Vistoria Digital!");
    
    navigate("/vistoria-digital", {
      state: {
        fromAvaliacao: true,
        propertyData: vistoriaData
      }
    });
  };

  const handleGenerateSimpleReport = () => {
    setDecisionMade("nao");
    handleExportPDF(true);
  };

  const handleOpenPricingModule = () => {
    // A estratégia precisa ficar vinculada a uma avaliação salva (valuation_id) para aparecer no histórico/edição.
    // Se o usuário abrir antes de salvar, a estratégia pode ser criada “órfã” (valuation_id = null).
    if (!valuationId && !existingValuationId) {
      toast.message("Aguarde um instante", {
        description: "Estamos salvando a avaliação para liberar a estratégia de precificação.",
      });
      return;
    }

    setShowPricingModule(true);
  };

  const handlePricingComplete = (pricingState: PricingStrategyState) => {
    setPricingCompleted(true);
    
    // Armazena dados para exportar no PDF
    if (pricingState.calculos && pricingState.estrategia_selecionada && pricingState.estrategia_recomendada) {
      setPricingData({
        valorItbi: pricingState.valor_itbi,
        estrategiaSelecionada: pricingState.estrategia_selecionada,
        estrategiaRecomendada: pricingState.estrategia_recomendada,
        calculos: pricingState.calculos,
        planoAjusteAtivo: pricingState.plano_ajuste_ativo
      });
    }
    
    // Fecha o módulo de precificação e volta para a tela principal
    setShowPricingModule(false);
  };

  const handleClosePricingModule = () => {
    setShowPricingModule(false);
  };

  // Função para gerar PDF para e-mail (com suporte a tipo de relatório)
  const generatePdfForEmail = (reportType: ReportType) => {
    const tipoAvaliacao = reportType === 'simplificado' ? 'simples' : 'completa';
    const stateWithType: ValuationState = {
      ...state,
      observacoesImovel: observacoes,
      tipoAvaliacao
    };
    return generateValuationPDFForEmail(result, stateWithType, combined, state.anuncioData?.fontes, pricingData);
  };

  // Calcula valores para estratégia de preço (fallback simples)
  const listPrice = Math.round(result.provavel * 1.05);
  const minAcceptable = result.pessimista;

  // Se o módulo de precificação estiver ativo, mostra apenas ele
  if (showPricingModule) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PricingStrategyModule
          valuationId={valuationId || undefined}
          valorItbiInicial={result.provavel}
          valorJustoReferencia={result.provavel}
          onComplete={handlePricingComplete}
          onBack={handleClosePricingModule}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Análise de Mercado */}
      {combined && combined.trend_percentage !== null && combined.trend_percentage !== 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <h4 className="font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
              📊 Análise de Mercado
            </h4>
            <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg ${
              combined.trend_direction === "UP" ? "bg-emerald-100 dark:bg-emerald-950/50" :
              combined.trend_direction === "DOWN" ? "bg-red-100 dark:bg-red-950/50" :
              "bg-muted"
            }`}>
              <TrendIcon className={`h-5 w-5 sm:h-6 sm:w-6 shrink-0 ${
                combined.trend_direction === "UP" ? "text-emerald-600" :
                combined.trend_direction === "DOWN" ? "text-red-600" :
                "text-muted-foreground"
              }`} />
              <div className="min-w-0">
                <p className="font-medium text-xs sm:text-sm">
                  Trend: {combined.trend_percentage! > 0 ? "+" : ""}{combined.trend_percentage!.toFixed(1)}%
                  <span className="ml-1 sm:ml-2 text-[10px] sm:text-sm font-normal text-muted-foreground">
                    ({combined.trend_direction === "UP" ? "ALTA" : combined.trend_direction === "DOWN" ? "BAIXA" : "ESTÁVEL"})
                  </span>
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Diferença anúncios vs Dados Oficiais
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Características aplicadas - apenas para admin */}
      {isAdmin && state.responses.filter(r => r.response === "sim").length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">✅ Análise (Admin)</h4>
            <p className="text-xs sm:text-sm mb-2">
              Ajuste: <strong>{result.total_adjustment > 0 ? "+" : ""}{(result.total_adjustment * 100).toFixed(0)}%</strong> 
              {result.total_adjustment > 0 ? " ACIMA" : result.total_adjustment < 0 ? " ABAIXO" : " NA"} da referência
            </p>
            <div className="flex flex-wrap gap-1">
              {state.responses
                .filter(r => r.response === "sim" && r.weight_applied !== 0)
                .map(r => (
                  <Badge key={r.char_id} variant={r.weight_applied > 0 ? "default" : "destructive"} className="text-[10px] sm:text-xs">
                    {r.char_code.replace(/_/g, " ")} ({r.weight_applied > 0 ? "+" : ""}{(r.weight_applied * 100).toFixed(0)}%)
                  </Badge>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Para não-admin: mostrar apenas contagem de características */}
      {!isAdmin && state.responses.filter(r => r.response === "sim").length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">✅ Características</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {state.responses.filter(r => r.response === "sim").length} características positivas
              {state.responses.filter(r => r.response === "sim" && r.weight_applied < 0).length > 0 && (
                <span className="ml-1 text-amber-600">
                  ({state.responses.filter(r => r.response === "sim" && r.weight_applied < 0).length} atenção)
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recomendação Principal */}
      <Card className={getRecommendationColor()}>
        <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2 sm:gap-3">
            {getRecommendationIcon()}
            <span className="truncate">{result.recommendation.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
          <p className="text-xs sm:text-sm">{result.recommendation.message}</p>
          
          {result.recommendation.details && (
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Próximos passos:</p>
              <ul className="text-xs sm:text-sm space-y-0.5 sm:space-y-1">
                {result.recommendation.details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-1.5 sm:gap-2">
                    <span className="text-primary shrink-0">✓</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.recommendation.potential_gain && (
            <div className="p-2 sm:p-3 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
              <p className="text-xs sm:text-sm">
                <strong>Potencial:</strong> {formatCurrency(result.recommendation.potential_gain)}
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-border/40">
            <GerarAutorizacaoButton
              state={{ ...state, observacoesImovel: observacoes }}
              valuationId={valuationId || existingValuationId}
              defaultValorAvaliacao={result.provavel}
              size="lg"
              fullWidth
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 text-center">
              Envie a Autorização de Captação ao proprietário e colete a assinatura digital.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Analista Imobiliário — QA (rascunho, revisão humana antes do PDF) */}
      <AnalistaImobiliarioPanel
        avaliacaoId={valuationId || existingValuationId || null}
        identificacao={{
          logradouro: state.logradouro,
          bairro: state.bairro,
          numero: state.numero || undefined,
          nome_condominio: state.nomeCondominio || undefined,
          tipologia: state.tipoImovel || undefined,
        }}
      />

      {/* Estratégia de Preço - Novo Módulo */}
      <Card className={`border-2 ${pricingCompleted ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-primary'}`}>
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Target className={`h-5 w-5 ${pricingCompleted ? 'text-green-600' : 'text-primary'}`} />
              <div>
                <h4 className="font-semibold text-sm sm:text-base">
                  Estratégia de Precificação
                </h4>
                <p className="text-xs text-muted-foreground">
                  {pricingCompleted 
                    ? 'Estratégia definida ✓' 
                    : 'Defina a melhor estratégia de preço'}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleOpenPricingModule}
              variant={pricingCompleted ? "outline" : "default"}
              size="sm"
              className="shrink-0"
            >
              {pricingCompleted ? 'Revisar' : 'Definir Estratégia'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          {/* Botões de PDF - aparecem após confirmar estratégia */}
          {pricingCompleted && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Avaliação completa! Gere o relatório:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button onClick={() => handleExportPDF(false)} className="h-10">
                  <FileDown className="mr-2 h-4 w-4" />
                  Baixar PDF Completo
                </Button>
                <Button onClick={() => setShowEmailDialog(true)} variant="outline" className="h-10">
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar por E-mail
                </Button>
              </div>
            </div>
          )}
          
          {!pricingCompleted && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <p className="text-muted-foreground">Referência rápida (valores base):</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-muted/50 rounded text-center">
                    <div className="text-[10px] text-muted-foreground">Anunciar</div>
                    <div className="font-semibold text-xs">{formatCurrency(listPrice)}</div>
                  </div>
                  <div className="p-2 bg-primary/10 rounded text-center">
                    <div className="text-[10px] text-muted-foreground">Target</div>
                    <div className="font-semibold text-xs text-primary">{formatCurrency(result.provavel)}</div>
                  </div>
                  <div className="p-2 bg-muted/50 rounded text-center">
                    <div className="text-[10px] text-muted-foreground">Mínimo</div>
                    <div className="font-semibold text-xs text-red-600">{formatCurrency(minAcceptable)}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">⏱️ Timeline</h4>
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span>Exposição:</span>
              <span>30-45 dias</span>
            </div>
            <div className="flex justify-between">
              <span>Negociação:</span>
              <span>15-30 dias</span>
            </div>
            <div className="flex justify-between font-medium pt-1.5 sm:pt-2 border-t">
              <span>Total:</span>
              <span>45-75 dias</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OBSERVAÇÕES E DADOS ADICIONAIS */}
      <Card className="border border-border">
        <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
            Observações e Dados Adicionais
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-4">
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Insira observações relevantes sobre o imóvel, condições especiais, informações complementares para o relatório..."
            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            rows={4}
          />
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5">
            Este campo será incluído no relatório PDF completo. Salva automaticamente.
          </p>
        </CardContent>
      </Card>

      {/* DECISÃO: Prosseguir para Vistoria? */}
      <Card className="border-2 border-primary">
        <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <span className="truncate">Realizar Vistoria Completa?</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
          <p className="text-xs sm:text-sm text-muted-foreground">
            A <strong>Vistoria Digital</strong> permite análise detalhada do estado de conservação.
          </p>
          
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-amber-800 dark:text-amber-200">
              💡 A vistoria pode ajustar o valor em até ±15%
            </p>
          </div>

          {decisionMade === null ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 pt-1 sm:pt-2">
              <Button 
                onClick={handleGoToVistoria} 
                className="flex items-center justify-center gap-2 h-11 sm:h-10 text-xs sm:text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="truncate">Sim, prosseguir</span>
              </Button>
              <GerarAutorizacaoButton
                state={{ ...state, observacoesImovel: observacoes }}
                valuationId={valuationId || existingValuationId}
                defaultValorAvaliacao={result.provavel}
                label="Gerar Autorização"
                fullWidth
              />
              <Button 
                onClick={handleGenerateSimpleReport} 
                variant="outline"
                className="flex items-center justify-center gap-2 h-11 sm:h-10 text-xs sm:text-sm"
              >
                <FileText className="h-4 w-4" />
                <span className="truncate">Não, gerar relatório</span>
              </Button>
            </div>
          ) : decisionMade === "nao" ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Relatório gerado!
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button onClick={() => handleExportPDF(true)} variant="outline" className="h-10 sm:h-9">
                  <FileDown className="mr-2 h-4 w-4" />
                  Baixar PDF
                </Button>
                <Button onClick={() => setShowEmailDialog(true)} variant="outline" className="h-10 sm:h-9">
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar por E-mail
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 shrink-0" />
                Redirecionando...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="text-[10px] sm:text-xs text-muted-foreground text-center px-2">
        ⚠️ Ferramenta estatística. Não substitui laudo PTAM (NBR 14653-2).
      </p>

      {/* Email Dialog */}
      <SendPdfEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        generatePdf={generatePdfForEmail}
        documentType="avaliacao"
        defaultName={state.proprietario || ''}
        defaultSubject={`Avaliação Imobiliária - ${state.logradouro || 'Imóvel'}`}
        pdfFilename={getValuationPDFFilename({...state, tipoAvaliacao: "completa"})}
        showReportTypeSelector={true}
      />

    </div>
  );
}
