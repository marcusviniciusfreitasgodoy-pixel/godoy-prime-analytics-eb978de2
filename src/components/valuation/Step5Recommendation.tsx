import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  FileText
} from "lucide-react";
import { toast } from "sonner";
import type { ValuationResult, CombinedPrices } from "@/utils/valuationCalculations";
import type { ValuationState } from "@/types/valuation";
import { exportValuationEnginePDF } from "@/utils/valuationPdfExport";
import { useAuth } from "@/hooks/useAuth";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  result: ValuationResult;
  state: ValuationState;
  combined: CombinedPrices | null;
  onReset: () => void;
}

export function Step5Recommendation({ result, state, combined, onReset }: Props) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { trackValuation, trackExport } = useActivityTracking();
  const [decisionMade, setDecisionMade] = useState<"sim" | "nao" | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Salvar avaliação no banco ao montar o componente
  useEffect(() => {
    const saveValuation = async () => {
      if (isSaved || !user?.id) return;
      
      try {
        const { error } = await supabase.from("valuations").insert({
          user_id: user.id,
          logradouro: state.logradouro,
          numero: state.numero || null,
          bairro: state.bairro,
          property_area_m2: state.area_m2,
          property_type: state.tipoImovel || null,
          itbi_min_m2: state.itbiData?.min_m2 || 0,
          itbi_med_m2: state.itbiData?.med_m2 || 0,
          itbi_max_m2: state.itbiData?.max_m2 || 0,
          itbi_transaction_count: state.itbiData?.transaction_count || 0,
          anuncio_min_m2: state.anuncioData?.min_m2 || null,
          anuncio_med_m2: state.anuncioData?.med_m2 || null,
          anuncio_max_m2: state.anuncioData?.max_m2 || null,
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
          documentation_status: state.docStatus || "OK",
          documentation_factor: state.docFactor || 1,
          recommendation_title: result.recommendation.title,
          recommendation_action: result.recommendation.status,
          recommendation_details: result.recommendation.details ? { steps: result.recommendation.details } : null,
          trend_direction: combined?.trend_direction || null,
          trend_percentage: combined?.trend_percentage || null,
          bonus_terreno: state.bonus_terreno || null,
          area_terreno_m2: state.area_terreno_m2 || null,
          proporcao_terreno: state.proporcao_terreno || null,
          auto_capped: result.auto_capped || false,
          pdf_generated: false,
        });

        if (error) {
          console.error("Erro ao salvar avaliação:", error);
          // Não exibir toast de erro para não atrapalhar UX
        } else {
          setIsSaved(true);
          console.log("Avaliação salva com sucesso");
        }
      } catch (err) {
        console.error("Erro ao salvar avaliação:", err);
      }
    };

    saveValuation();
  }, [user?.id, result, state, combined, isSaved]);

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
      case "NEED_SPECIALIST_VALUATION":
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
        return "bg-orange-50 border-orange-200 dark:bg-orange-950/30";
      case "NEED_SPECIALIST_VALUATION":
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
        tipoAvaliacao: isSimplified ? "simples" : "completa"
      };
      
      // Passa as fontes dos anúncios para o PDF
      const anuncioFontes = state.anuncioData?.fontes;
      exportValuationEnginePDF(result, stateWithType, combined, anuncioFontes);
      
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
      // Dados da avaliação para referência
      avaliacaoData: {
        valorProvavel: result.provavel,
        valorPessimista: result.pessimista,
        valorOtimista: result.otimista,
        confidenceLevel: result.confidence_level,
        dataAvaliacao: state.dataAvaliacao,
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

  // Calcula valores para estratégia de preço
  const listPrice = Math.round(result.provavel * 1.05);
  const minAcceptable = result.pessimista;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Análise de Mercado */}
      {combined && combined.trend_percentage !== 0 && (
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
                  Trend: {combined.trend_percentage > 0 ? "+" : ""}{combined.trend_percentage.toFixed(1)}%
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
        </CardContent>
      </Card>

      {/* Estratégia de Preço */}
      <Card>
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">💰 Estratégia de Preço</h4>
          <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between items-center p-1.5 sm:p-2 bg-muted/50 rounded">
              <span>Anunciar:</span>
              <span className="font-bold">{formatCurrency(listPrice)}</span>
            </div>

            <div className="flex justify-between items-center p-1.5 sm:p-2 bg-primary/10 rounded">
              <span>Target:</span>
              <span className="font-bold text-primary">{formatCurrency(result.provavel)}</span>
            </div>

            <div className="flex justify-between items-center p-1.5 sm:p-2 bg-muted/50 rounded">
              <span>Mínimo:</span>
              <span className="font-semibold text-red-600">{formatCurrency(minAcceptable)}</span>
            </div>
          </div>
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 pt-1 sm:pt-2">
              <Button 
                onClick={handleGoToVistoria} 
                className="flex items-center justify-center gap-2 h-11 sm:h-10 text-xs sm:text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="truncate">Sim, prosseguir</span>
              </Button>
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
              
              <Button onClick={() => handleExportPDF(true)} variant="outline" className="w-full h-10 sm:h-9">
                <FileDown className="mr-2 h-4 w-4" />
                Baixar PDF
              </Button>
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
    </div>
  );
}
