import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus, AlertTriangle, CheckCircle2, XCircle, TrendingUp, Calculator, Clipboard } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AvaliacaoData {
  valorProvavel: number;
  valorPessimista: number;
  valorOtimista: number;
  confidenceLevel: string;
  confidenceScore?: number;
  dataAvaliacao: string;
  itbiMinM2?: number;
  itbiMedM2?: number;
  itbiMaxM2?: number;
  transactionCount?: number;
  trendPercentage?: number;
  trendDirection?: string;
  totalAdjustment?: number;
  spreadPercentage?: number;
  recommendationTitle?: string;
  recommendationMessage?: string;
  anuncioFontes?: string[];
}

interface Props {
  avaliacaoData: AvaliacaoData;
  vistoriaScore: number;
  progress: number;
}

// Calcula o ajuste percentual baseado no score da vistoria
export function calculateVistoriaAdjustment(score: number): {
  adjustment: number;
  label: string;
  color: string;
  icon: "up" | "down" | "stable";
} {
  // Score 0-100 → Ajuste de -15% a +10%
  // Score 80-100: +5% a +10% (excelente)
  // Score 60-79: 0% a +5% (bom)
  // Score 40-59: -5% a 0% (adequado com ressalvas)
  // Score 20-39: -10% a -5% (atenção)
  // Score 0-19: -15% a -10% (crítico)
  
  if (score >= 90) {
    const adj = 0.08 + ((score - 90) / 10) * 0.02; // 8% a 10%
    return { adjustment: adj, label: "Excelente Estado", color: "text-emerald-600", icon: "up" };
  } else if (score >= 80) {
    const adj = 0.05 + ((score - 80) / 10) * 0.03; // 5% a 8%
    return { adjustment: adj, label: "Muito Bom Estado", color: "text-green-600", icon: "up" };
  } else if (score >= 70) {
    const adj = 0.02 + ((score - 70) / 10) * 0.03; // 2% a 5%
    return { adjustment: adj, label: "Bom Estado", color: "text-green-500", icon: "up" };
  } else if (score >= 60) {
    const adj = ((score - 60) / 10) * 0.02; // 0% a 2%
    return { adjustment: adj, label: "Estado Adequado", color: "text-blue-500", icon: "stable" };
  } else if (score >= 50) {
    const adj = -0.03 + ((score - 50) / 10) * 0.03; // -3% a 0%
    return { adjustment: adj, label: "Pequenas Pendências", color: "text-amber-500", icon: "down" };
  } else if (score >= 40) {
    const adj = -0.06 + ((score - 40) / 10) * 0.03; // -6% a -3%
    return { adjustment: adj, label: "Necessita Reparos", color: "text-orange-500", icon: "down" };
  } else if (score >= 30) {
    const adj = -0.10 + ((score - 30) / 10) * 0.04; // -10% a -6%
    return { adjustment: adj, label: "Reparos Significativos", color: "text-orange-600", icon: "down" };
  } else if (score >= 20) {
    const adj = -0.13 + ((score - 20) / 10) * 0.03; // -13% a -10%
    return { adjustment: adj, label: "Estado Crítico", color: "text-red-500", icon: "down" };
  } else {
    const adj = -0.15 + (score / 20) * 0.02; // -15% a -13%
    return { adjustment: adj, label: "Requer Reforma", color: "text-red-600", icon: "down" };
  }
}

// Calcula os valores ajustados pela vistoria
export function calculateAdjustedValues(
  avaliacaoData: AvaliacaoData,
  vistoriaScore: number
): {
  valorProvavelAjustado: number;
  valorPessimistaAjustado: number;
  valorOtimistaAjustado: number;
  adjustment: ReturnType<typeof calculateVistoriaAdjustment>;
  diferencaAbsoluta: number;
  diferencaPercentual: number;
} {
  const adjustment = calculateVistoriaAdjustment(vistoriaScore);
  const multiplier = 1 + adjustment.adjustment;
  
  const valorProvavelAjustado = Math.round(avaliacaoData.valorProvavel * multiplier);
  const valorPessimistaAjustado = Math.round(avaliacaoData.valorPessimista * multiplier);
  const valorOtimistaAjustado = Math.round(avaliacaoData.valorOtimista * multiplier);
  
  const diferencaAbsoluta = valorProvavelAjustado - avaliacaoData.valorProvavel;
  const diferencaPercentual = (adjustment.adjustment * 100);
  
  return {
    valorProvavelAjustado,
    valorPessimistaAjustado,
    valorOtimistaAjustado,
    adjustment,
    diferencaAbsoluta,
    diferencaPercentual,
  };
}

export function VistoriaAvaliacaoComparativo({ avaliacaoData, vistoriaScore, progress }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const adjusted = calculateAdjustedValues(avaliacaoData, vistoriaScore);
  
  // Não exibe se a vistoria não está completa o suficiente
  if (progress < 50) {
    return null;
  }

  const AdjustmentIcon = adjusted.adjustment.icon === "up" 
    ? ArrowUp 
    : adjusted.adjustment.icon === "down" 
      ? ArrowDown 
      : Minus;

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-blue-50/50 dark:from-primary/10 dark:to-blue-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Comparativo: Avaliação vs Vistoria
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ajuste dos valores baseado na inspeção física do imóvel
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score e Ajuste Principal */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-background rounded-lg border">
            <div className="flex items-center gap-2 mb-1">
              <Clipboard className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Score Vistoria</span>
            </div>
            <p className={`text-2xl font-bold ${adjusted.adjustment.color}`}>
              {vistoriaScore}/100
            </p>
            <p className={`text-xs ${adjusted.adjustment.color}`}>
              {adjusted.adjustment.label}
            </p>
          </div>
          
          <div className="p-3 bg-background rounded-lg border">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Ajuste Aplicado</span>
            </div>
            <div className="flex items-center gap-1">
              <AdjustmentIcon className={`h-5 w-5 ${adjusted.adjustment.color}`} />
              <p className={`text-2xl font-bold ${adjusted.adjustment.color}`}>
                {adjusted.diferencaPercentual > 0 ? "+" : ""}{adjusted.diferencaPercentual.toFixed(1)}%
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {adjusted.diferencaAbsoluta >= 0 ? "+" : ""}{formatCurrency(adjusted.diferencaAbsoluta)}
            </p>
          </div>
        </div>

        <Separator />

        {/* Comparativo de Valores */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            Valores Recalculados
          </h4>
          
          {/* Tabela Comparativa */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-1 text-xs font-medium text-muted-foreground">Cenário</th>
                  <th className="text-right py-2 px-1 text-xs font-medium text-muted-foreground">Avaliação</th>
                  <th className="text-right py-2 px-1 text-xs font-medium text-muted-foreground">Pós-Vistoria</th>
                  <th className="text-right py-2 px-1 text-xs font-medium text-muted-foreground">Δ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-dashed">
                  <td className="py-2 px-1">
                    <span className="text-red-600 font-medium">Pessimista</span>
                  </td>
                  <td className="py-2 px-1 text-right text-muted-foreground">
                    {formatCurrency(avaliacaoData.valorPessimista)}
                  </td>
                  <td className="py-2 px-1 text-right font-medium">
                    {formatCurrency(adjusted.valorPessimistaAjustado)}
                  </td>
                  <td className={`py-2 px-1 text-right text-xs ${adjusted.diferencaPercentual >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {adjusted.diferencaPercentual >= 0 ? "+" : ""}{adjusted.diferencaPercentual.toFixed(1)}%
                  </td>
                </tr>
                <tr className="bg-primary/5 border-b">
                  <td className="py-2 px-1">
                    <span className="text-primary font-bold">Provável</span>
                  </td>
                  <td className="py-2 px-1 text-right text-muted-foreground">
                    {formatCurrency(avaliacaoData.valorProvavel)}
                  </td>
                  <td className="py-2 px-1 text-right font-bold text-primary">
                    {formatCurrency(adjusted.valorProvavelAjustado)}
                  </td>
                  <td className={`py-2 px-1 text-right text-xs font-medium ${adjusted.diferencaPercentual >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {adjusted.diferencaPercentual >= 0 ? "+" : ""}{adjusted.diferencaPercentual.toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-1">
                    <span className="text-emerald-600 font-medium">Otimista</span>
                  </td>
                  <td className="py-2 px-1 text-right text-muted-foreground">
                    {formatCurrency(avaliacaoData.valorOtimista)}
                  </td>
                  <td className="py-2 px-1 text-right font-medium">
                    {formatCurrency(adjusted.valorOtimistaAjustado)}
                  </td>
                  <td className={`py-2 px-1 text-right text-xs ${adjusted.diferencaPercentual >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {adjusted.diferencaPercentual >= 0 ? "+" : ""}{adjusted.diferencaPercentual.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <Separator />

        {/* Justificativa do Ajuste */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Justificativa do Ajuste</h4>
          <div className="p-3 bg-background rounded-lg border space-y-2">
            {vistoriaScore >= 80 ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <strong>Estado acima do esperado:</strong> O imóvel apresenta condições físicas superiores à média do mercado, 
                  justificando um prêmio de {adjusted.diferencaPercentual.toFixed(1)}% sobre o valor da avaliação prévia.
                </p>
              </div>
            ) : vistoriaScore >= 60 ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <strong>Estado adequado:</strong> O imóvel está em condições normais de conservação, 
                  compatível com o valor estimado na avaliação prévia. Ajuste mínimo de {adjusted.diferencaPercentual.toFixed(1)}%.
                </p>
              </div>
            ) : vistoriaScore >= 40 ? (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <strong>Pendências identificadas:</strong> A vistoria identificou itens que necessitam atenção ou reparo. 
                  Aplicado desconto de {Math.abs(adjusted.diferencaPercentual).toFixed(1)}% para refletir custos de manutenção.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <strong>Problemas significativos:</strong> A inspeção revelou múltiplos itens críticos que impactam o valor. 
                  Desconto de {Math.abs(adjusted.diferencaPercentual).toFixed(1)}% aplicado para cobrir reparos necessários.
                </p>
              </div>
            )}
            
            <div className="flex items-start gap-2 mt-2">
              <Badge variant="outline" className="text-[10px] shrink-0">Metodologia</Badge>
              <p className="text-[10px] text-muted-foreground">
                Score da vistoria (0-100) aplica ajuste de -15% a +10% sobre o valor provável da avaliação prévia.
                Scores ≥80 indicam estado superior; scores ≤40 indicam necessidade de reparos.
              </p>
            </div>
          </div>
        </div>

        {/* Resumo Final */}
        <div className="p-4 bg-gradient-to-r from-primary/10 to-emerald-500/10 rounded-lg border-2 border-primary/20">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Valor Final Recomendado (Pós-Vistoria)</p>
            <p className="text-2xl sm:text-3xl font-bold text-primary">
              {formatCurrency(adjusted.valorProvavelAjustado)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Intervalo: {formatCurrency(adjusted.valorPessimistaAjustado)} - {formatCurrency(adjusted.valorOtimistaAjustado)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
