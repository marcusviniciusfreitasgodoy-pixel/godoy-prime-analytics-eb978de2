import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, XCircle, TrendingUp, TrendingDown, Minus, Home, Building2 } from "lucide-react";
import type { ValuationResult, CombinedPrices } from "@/utils/valuationCalculations";
import type { ValuationState } from "@/types/valuation";
import { isCasaType, calculateTerrainBonus } from "@/hooks/useValuationCharacteristics";
import { useHistoricalTransactionAnalysis } from "@/hooks/useHistoricalTransactionAnalysis";
import { HistoricalAnalysisChart } from "./HistoricalAnalysisChart";
import { PriceComparisonCard } from "./PriceComparisonCard";
import { FutureProjectionChart } from "./FutureProjectionChart";

interface Props {
  result: ValuationResult;
  state: ValuationState;
  combined: CombinedPrices | null;
}

export function Step4Results({ result, state, combined }: Props) {
  const isCasa = isCasaType(state.tipoImovel);
  const globalCap = isCasa ? 35 : 30;
  const terrainInfo = isCasa && state.area_m2 > 0 && state.area_terreno_m2 > 0 
    ? calculateTerrainBonus(state.area_m2, state.area_terreno_m2)
    : null;

  // Buscar análise histórica de 5 anos (com ruas internas do condomínio quando disponível)
  const { data: historicalAnalysis, isLoading: loadingHistorical } = useHistoricalTransactionAnalysis(
    state.logradouro,
    state.bairro,
    !!state.logradouro && !!state.bairro,
    state.condominioSelecionado?.ruas_internas
  );

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

  const TrendIcon = combined?.trend_direction === "UP"
    ? TrendingUp
    : combined?.trend_direction === "DOWN"
    ? TrendingDown
    : Minus;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center">
        <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-600 mx-auto mb-2" />
        <h3 className="text-lg sm:text-xl font-bold">Avaliação Concluída</h3>
        <p className="text-xs sm:text-sm text-muted-foreground truncate px-2">
          {state.logradouro} • {state.area_m2} m²
        </p>
        {/* Badges de tipo e caps */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {isCasa ? <Home className="h-3 w-3 mr-1" /> : <Building2 className="h-3 w-3 mr-1" />}
            {state.tipoImovel || (isCasa ? "Casa" : "Apartamento")}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Cap ±{globalCap}%
          </Badge>
          {terrainInfo && terrainInfo.proporcao > 0 && (
            <Badge 
              className={`text-xs ${
                terrainInfo.bonus > 0 
                  ? "bg-green-500/20 text-green-700 border-green-500/30" 
                  : terrainInfo.bonus < 0 
                  ? "bg-red-500/20 text-red-700 border-red-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              Terreno {terrainInfo.proporcao.toFixed(1)}:1 ({terrainInfo.bonus > 0 ? '+' : ''}{(terrainInfo.bonus * 100).toFixed(0)}%)
            </Badge>
          )}
        </div>
      </div>

      {/* 3 Cenários */}
      <div className="space-y-3 sm:space-y-4">
        <h4 className="font-semibold text-center text-sm sm:text-base">📊 Três Cenários de Valor</h4>
        
        {/* Pessimista */}
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm text-red-700 dark:text-red-400 flex items-center gap-1.5 sm:gap-2">
              🔴 <span className="hidden xs:inline">Cenário</span> Pessimista
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
            <p className="text-xl sm:text-2xl font-bold text-red-600">
              {formatCurrency(result.pessimista)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">
              Venda urgente ou mercado em baixa
            </p>
          </CardContent>
        </Card>

        {/* Provável */}
        <Card className="border-2 border-primary bg-primary/5">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm text-primary flex items-center gap-1.5 sm:gap-2 flex-wrap">
              🟡 <span className="hidden xs:inline">Cenário</span> Provável
              <Badge className="bg-primary text-[10px] sm:text-xs">RECOMENDADO</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
            <p className="text-2xl sm:text-3xl font-bold text-primary">
              {formatCurrency(result.provavel)}
            </p>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
              <p>Baseado em:</p>
              <ul className="list-disc list-inside ml-1 sm:ml-2">
                <li>Dados oficiais ({state.anuncioData?.med_m2 ? "70%" : "100%"})</li>
                {state.anuncioData?.med_m2 && <li>Anúncios (30%)</li>}
                <li>Características ({formatPercent(result.total_adjustment)})</li>
                {terrainInfo && terrainInfo.bonus !== 0 && (
                  <li>Bônus Terreno ({terrainInfo.bonus > 0 ? '+' : ''}{(terrainInfo.bonus * 100).toFixed(0)}%)</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Otimista */}
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 sm:gap-2">
              🟢 <span className="hidden xs:inline">Cenário</span> Otimista
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
            <p className="text-xl sm:text-2xl font-bold text-emerald-600">
              {formatCurrency(result.otimista)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">
              Comprador premium ou mercado em alta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Intervalo */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">📈 Intervalo Recomendado</h4>
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mínimo:</span>
              <span className="font-medium">{formatCurrency(result.pessimista)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Central:</span>
              <span className="font-bold text-primary">{formatCurrency(result.provavel)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Máximo:</span>
              <span className="font-medium">{formatCurrency(result.otimista)}</span>
            </div>
            <div className="flex justify-between pt-1.5 sm:pt-2 border-t">
              <span className="text-muted-foreground">Spread:</span>
              <Badge variant="outline" className="text-[10px] sm:text-xs">{result.spread_percentage.toFixed(1)}%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo de Ajustes Aplicados */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">⚙️ Ajustes Aplicados</h4>
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tipo de Imóvel:</span>
              <Badge variant="outline" className="text-xs">
                {isCasa ? "🏠 Casa" : "🏢 Apartamento"}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Cap Global:</span>
              <Badge variant="secondary" className="text-xs">±{globalCap}%</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Ajuste Total:</span>
              <Badge 
                variant={result.total_adjustment > 0 ? "default" : result.total_adjustment < 0 ? "destructive" : "outline"}
                className="text-xs"
              >
                {formatPercent(result.total_adjustment)}
                {result.auto_capped && " (CAP)"}
              </Badge>
            </div>
            {terrainInfo && terrainInfo.proporcao > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Proporção Terreno:</span>
                  <span className="font-medium">{terrainInfo.proporcao.toFixed(1)}:1</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Bônus Terreno:</span>
                  <Badge 
                    className={`text-xs ${
                      terrainInfo.bonus > 0 
                        ? "bg-green-500/20 text-green-700" 
                        : terrainInfo.bonus < 0 
                        ? "bg-red-500/20 text-red-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {terrainInfo.bonus > 0 ? '+' : ''}{(terrainInfo.bonus * 100).toFixed(0)}% ({terrainInfo.label})
                  </Badge>
                </div>
              </>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Fator Documentação:</span>
              <span className="font-medium">{state.docFactor === 1 ? "100% (OK)" : `${(state.docFactor * 100).toFixed(0)}%`}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confiança */}
      <Card>
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <h4 className="font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
            🎯 Nível de Confiança
          </h4>
          
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            {getConfidenceIcon()}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="font-medium text-xs sm:text-sm truncate">{getConfidenceLabel()}</span>
                <span className="text-base sm:text-lg font-bold shrink-0">{result.confidence_score}%</span>
              </div>
              <Progress
                value={result.confidence_score}
                className="h-1.5 sm:h-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
              <span className="truncate">Ajustes: {formatPercent(result.total_adjustment)}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
              <span>Spread: {result.spread_percentage.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
              <span className="truncate">Doc: {state.docFactor === 1 ? "OK" : `${((1 - state.docFactor) * 100).toFixed(0)}%`}</span>
            </div>
            {combined && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <AlertTriangle className={`h-3 w-3 shrink-0 ${
                  combined.market_alignment === 'EQUILIBRADO' ? "text-emerald-500" :
                  combined.market_alignment === 'MODERADO' ? "text-amber-500" :
                  combined.market_alignment === 'DESALINHADO' ? "text-orange-500" :
                  "text-red-500"
                }`} />
                <span>
                  {combined.market_gap_percentage === null
                    ? combined.market_alignment === 'AMOSTRA_INSUFICIENTE'
                      ? `Gap: amostra insuficiente (${combined.anuncios_count ?? 0} anúncio${(combined.anuncios_count ?? 0) === 1 ? '' : 's'})`
                      : 'Gap: sem dados de anúncio'
                    : `Gap: ${combined.market_gap_percentage.toFixed(1)}% (${combined.market_alignment})`}
                </span>
              </div>
            )}
            {historicalAnalysis && (
              <div className="flex items-center gap-1.5 sm:gap-2 col-span-2 mt-1 pt-1 border-t">
                <CheckCircle className={`h-3 w-3 shrink-0 ${
                  historicalAnalysis.liquidityScore >= 60 ? "text-emerald-500" :
                  historicalAnalysis.liquidityScore >= 40 ? "text-amber-500" :
                  "text-red-500"
                }`} />
                <span>
                  Liquidez: {historicalAnalysis.liquidityScore.toFixed(0)}% 
                  <span className="text-muted-foreground ml-1">
                    ({historicalAnalysis.liquidityLevel === 'alta' ? 'Alta' : 
                      historicalAnalysis.liquidityLevel === 'media' ? 'Média' : 'Baixa'})
                  </span>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparativo Anúncio vs Venda Rápida */}
      {combined && state.itbiData && (
        <PriceComparisonCard 
          itbiData={state.itbiData}
          anuncioData={state.anuncioData}
          area={state.area_m2}
          combined={combined}
          valorFinalRecomendado={result.provavel}
          ajusteTotal={result.total_adjustment}
        />
      )}

      {/* Análise Histórica 5 Anos */}
      {loadingHistorical ? (
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-4 gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </CardContent>
        </Card>
      ) : historicalAnalysis ? (
        <>
          <HistoricalAnalysisChart analysis={historicalAnalysis} />
          
          {/* Projeção de Valor Futuro */}
          {historicalAnalysis.futureProjection && (
            <FutureProjectionChart 
              currentValue={result.provavel}
              projection={historicalAnalysis.futureProjection}
              area={state.area_m2}
            />
          )}
        </>
      ) : null}
    </div>
  );
}