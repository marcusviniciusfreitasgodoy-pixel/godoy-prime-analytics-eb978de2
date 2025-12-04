import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, XCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ValuationResult, CombinedPrices } from "@/utils/valuationCalculations";
import type { ValuationState } from "./ValuationEngine";

interface Props {
  result: ValuationResult;
  state: ValuationState;
  combined: CombinedPrices | null;
}

export function Step4Results({ result, state, combined }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
  };

  const getConfidenceIcon = () => {
    switch (result.confidence_level) {
      case "green":
        return <CheckCircle className="h-5 w-5 text-emerald-600" />;
      case "yellow_high":
      case "yellow_medium":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "red":
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getConfidenceLabel = () => {
    switch (result.confidence_level) {
      case "green":
        return "Alta Confiança";
      case "yellow_high":
        return "Boa Confiança";
      case "yellow_medium":
        return "Confiança Moderada";
      case "red":
        return "Baixa Confiança";
    }
  };

  const getConfidenceColor = () => {
    switch (result.confidence_level) {
      case "green":
        return "bg-emerald-500";
      case "yellow_high":
        return "bg-amber-400";
      case "yellow_medium":
        return "bg-orange-500";
      case "red":
        return "bg-red-500";
    }
  };

  const TrendIcon = combined?.trend_direction === "UP"
    ? TrendingUp
    : combined?.trend_direction === "DOWN"
    ? TrendingDown
    : Minus;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
        <h3 className="text-xl font-bold">Avaliação Concluída</h3>
        <p className="text-sm text-muted-foreground">
          {state.logradouro} • {state.area_m2} m²
        </p>
      </div>

      {/* 3 Cenários */}
      <div className="space-y-4">
        <h4 className="font-semibold text-center">📊 Três Cenários de Valor</h4>
        
        {/* Pessimista */}
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
              🔴 Cenário Pessimista (Venda Urgente)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(result.pessimista)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Use quando: precisa de dinheiro rápido, mercado em baixa, ou há urgência
            </p>
          </CardContent>
        </Card>

        {/* Provável */}
        <Card className="border-2 border-primary bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary flex items-center gap-2">
              🟡 Cenário Provável (Expectativa Realista)
              <Badge className="bg-primary">RECOMENDADO</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(result.provavel)}
            </p>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>Este é o valor mais provável com base em:</p>
              <ul className="list-disc list-inside ml-2">
                <li>Dados históricos ITBI ({state.anuncioData?.med_m2 ? "70%" : "100%"})</li>
                {state.anuncioData?.med_m2 && <li>Tendência de anúncios (30%)</li>}
                <li>Características do imóvel ({formatPercent(result.total_adjustment)})</li>
                {combined && combined.trend_percentage !== 0 && (
                  <li>Trend de mercado ({combined.trend_percentage > 0 ? "+" : ""}{combined.trend_percentage.toFixed(1)}%)</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Otimista */}
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              🟢 Cenário Otimista (Buyer Premium)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(result.otimista)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Use quando: pode esperar o comprador certo, mercado em alta forte
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Intervalo */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3">📈 Intervalo Recomendado</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mínimo Aceitável:</span>
              <span className="font-medium">{formatCurrency(result.pessimista)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor Central:</span>
              <span className="font-bold text-primary">{formatCurrency(result.provavel)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Máximo Esperado:</span>
              <span className="font-medium">{formatCurrency(result.otimista)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-muted-foreground">Spread (intervalo):</span>
              <Badge variant="outline">{result.spread_percentage.toFixed(1)}%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confiança */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            🎯 Nível de Confiança na Avaliação
          </h4>
          
          <div className="flex items-center gap-3 mb-4">
            {getConfidenceIcon()}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{getConfidenceLabel()}</span>
                <span className="text-lg font-bold">{result.confidence_score}%</span>
              </div>
              <Progress
                value={result.confidence_score}
                className="h-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              <span>Ajustes: {formatPercent(result.total_adjustment)}</span>
              {result.auto_capped && (
                <Badge variant="outline" className="text-[10px]">CAP</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              <span>Spread: {result.spread_percentage.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              <span>Doc: {state.docFactor === 1 ? "OK" : `${((1 - state.docFactor) * 100).toFixed(0)}% desconto`}</span>
            </div>
            {combined && (
              <div className="flex items-center gap-2">
                <TrendIcon className={`h-3 w-3 ${
                  combined.trend_direction === "UP" ? "text-emerald-500" :
                  combined.trend_direction === "DOWN" ? "text-red-500" :
                  "text-muted-foreground"
                }`} />
                <span>Trend: {combined.trend_percentage > 0 ? "+" : ""}{combined.trend_percentage.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
