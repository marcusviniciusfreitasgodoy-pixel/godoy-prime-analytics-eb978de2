import { useState } from "react";
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

interface Props {
  result: ValuationResult;
  state: ValuationState;
  combined: CombinedPrices | null;
  onReset: () => void;
}

export function Step5Recommendation({ result, state, combined, onReset }: Props) {
  const navigate = useNavigate();
  const [decisionMade, setDecisionMade] = useState<"sim" | "nao" | null>(null);

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
      exportValuationEnginePDF(result, stateWithType, combined);
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
    <div className="space-y-6">
      {/* Análise de Mercado */}
      {combined && combined.trend_percentage !== 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              📊 Análise de Mercado
            </h4>
            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              combined.trend_direction === "UP" ? "bg-emerald-100 dark:bg-emerald-950/50" :
              combined.trend_direction === "DOWN" ? "bg-red-100 dark:bg-red-950/50" :
              "bg-muted"
            }`}>
              <TrendIcon className={`h-6 w-6 ${
                combined.trend_direction === "UP" ? "text-emerald-600" :
                combined.trend_direction === "DOWN" ? "text-red-600" :
                "text-muted-foreground"
              }`} />
              <div>
                <p className="font-medium">
                  Trend: {combined.trend_percentage > 0 ? "+" : ""}{combined.trend_percentage.toFixed(1)}%
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    (Mercado em {combined.trend_direction === "UP" ? "ALTA" : combined.trend_direction === "DOWN" ? "BAIXA" : "ESTÁVEL"})
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Diferença entre preços de anúncios e transações ITBI
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Características aplicadas */}
      {state.responses.filter(r => r.response === "sim").length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-3">✅ Análise do Imóvel</h4>
            <p className="text-sm mb-2">
              Seu imóvel está <strong>{result.total_adjustment > 0 ? "+" : ""}{(result.total_adjustment * 100).toFixed(0)}%</strong> 
              {result.total_adjustment > 0 ? " ACIMA" : result.total_adjustment < 0 ? " ABAIXO" : " NA"} da referência
            </p>
            <div className="flex flex-wrap gap-1">
              {state.responses
                .filter(r => r.response === "sim" && r.weight_applied !== 0)
                .map(r => (
                  <Badge key={r.char_id} variant={r.weight_applied > 0 ? "default" : "destructive"} className="text-xs">
                    {r.char_code.replace(/_/g, " ")} ({r.weight_applied > 0 ? "+" : ""}{(r.weight_applied * 100).toFixed(0)}%)
                  </Badge>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recomendação Principal */}
      <Card className={getRecommendationColor()}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-3">
            {getRecommendationIcon()}
            <span>{result.recommendation.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{result.recommendation.message}</p>
          
          {result.recommendation.details && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Próximos passos:</p>
              <ul className="text-sm space-y-1">
                {result.recommendation.details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.recommendation.potential_gain && (
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
              <p className="text-sm">
                <strong>Potencial de ganho:</strong>{" "}
                {formatCurrency(result.recommendation.potential_gain)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estratégia de Preço */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-4">💰 Estratégia de Preço</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
              <span>Anunciar por:</span>
              <span className="font-bold">{formatCurrency(listPrice)}</span>
            </div>
            <p className="text-xs text-muted-foreground ml-2">
              ↳ Ligeiramente acima para deixar espaço de negociação
            </p>

            <div className="flex justify-between items-center p-2 bg-primary/10 rounded">
              <span>Valor Target:</span>
              <span className="font-bold text-primary">{formatCurrency(result.provavel)}</span>
            </div>
            <p className="text-xs text-muted-foreground ml-2">
              ↳ Expectativa realista para fechamento
            </p>

            <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
              <span>Mínimo Aceitável:</span>
              <span className="font-semibold text-red-600">{formatCurrency(minAcceptable)}</span>
            </div>
            <p className="text-xs text-muted-foreground ml-2">
              ↳ Piso para negociação (não aceitar abaixo)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3">⏱️ Timeline Esperada</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Exposição:</span>
              <span>30-45 dias</span>
            </div>
            <div className="flex justify-between">
              <span>Negociação:</span>
              <span>15-30 dias</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Total estimado:</span>
              <span>45-75 dias</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DECISÃO: Prosseguir para Vistoria? */}
      <Card className="border-2 border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Deseja Realizar Vistoria Completa?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A <strong>Vistoria Digital</strong> permite uma análise detalhada do estado de conservação do imóvel 
            (instalações elétricas, hidráulicas, acabamentos, etc.), tornando a avaliação mais precisa 
            e próxima da realidade de mercado.
          </p>
          
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              💡 <strong>Dica:</strong> A vistoria pode ajustar o valor em até ±15% com base nas condições reais verificadas in loco.
            </p>
          </div>

          {decisionMade === null ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button 
                onClick={handleGoToVistoria} 
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Sim, prosseguir para Vistoria
              </Button>
              <Button 
                onClick={handleGenerateSimpleReport} 
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Não, gerar relatório simplificado
              </Button>
            </div>
          ) : decisionMade === "nao" ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Relatório simplificado gerado com sucesso!
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => handleExportPDF(true)} variant="outline" className="flex-1">
                  <FileDown className="mr-2 h-4 w-4" />
                  Baixar PDF Novamente
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Redirecionando para Vistoria Digital...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        ⚠️ Esta é uma ferramenta estatística e não substitui laudo técnico PTAM (NBR 14653-2).
        Os valores são referências de mercado baseadas em transações ITBI reais.
      </p>
    </div>
  );
}
