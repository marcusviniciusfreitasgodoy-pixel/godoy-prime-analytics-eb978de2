import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Megaphone, Zap, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from "lucide-react";
import type { ITBIData, AnuncioData } from "@/types/valuation";
import type { CombinedPrices } from "@/utils/valuationCalculations";

interface Props {
  itbiData: ITBIData;
  anuncioData: AnuncioData | null;
  area: number;
  combined: CombinedPrices;
  valorFinalRecomendado?: number; // Valor provável final (após ajustes)
  ajusteTotal?: number; // Ajuste total aplicado (ex: 0.35 = +35%)
}

export function PriceComparisonCard({ 
  itbiData, 
  anuncioData, 
  area, 
  combined,
  valorFinalRecomendado,
  ajusteTotal = 0
}: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyCompact = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
      notation: "compact",
    }).format(value);
  };

  // CORREÇÃO: Preço Anúncio Sugerido deve ser o VALOR FINAL RECOMENDADO (após ajustes)
  // Se não informado, calcula usando a média combinada * area * (1 + ajuste)
  const multiplier = 1 + ajusteTotal;
  const precoAnuncio = valorFinalRecomendado || (combined.med_m2 * area * multiplier);
  const precoAnuncioM2 = precoAnuncio / area;

  // Preço Venda Rápida: baseado em ITBI (transações reais) * ajuste
  // Aplica o mesmo ajuste para manter consistência
  const precoVendaRapida = itbiData.med_m2 * area * multiplier;
  const precoVendaRapidaM2 = itbiData.med_m2 * multiplier;

  // Gap de Mercado: diferença percentual
  const marketGap = combined.market_gap_percentage;
  const marketAlignment = combined.market_alignment;

  // Estimativa de prazo baseada no gap e liquidez
  const getPrazoAnuncio = () => {
    if (marketGap <= 10) return "60-90 dias";
    if (marketGap <= 20) return "90-150 dias";
    if (marketGap <= 35) return "120-180 dias";
    return "180+ dias";
  };

  const getPrazoVendaRapida = () => {
    return "30-60 dias";
  };

  // Cores e ícones baseados no alinhamento
  const getAlignmentConfig = () => {
    switch (marketAlignment) {
      case 'EQUILIBRADO':
        return {
          color: 'text-emerald-600',
          bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          border: 'border-emerald-200 dark:border-emerald-800',
          icon: CheckCircle,
          label: 'Equilibrado',
          description: 'Mercado saudável - anúncios próximos das transações reais'
        };
      case 'MODERADO':
        return {
          color: 'text-amber-600',
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          border: 'border-amber-200 dark:border-amber-800',
          icon: Clock,
          label: 'Moderado',
          description: 'Margem de negociação típica do mercado'
        };
      case 'DESALINHADO':
        return {
          color: 'text-orange-600',
          bg: 'bg-orange-50 dark:bg-orange-950/30',
          border: 'border-orange-200 dark:border-orange-800',
          icon: AlertTriangle,
          label: 'Desalinhado',
          description: 'Anúncios acima das transações reais - pode demorar mais para vender'
        };
      case 'CRITICO':
        return {
          color: 'text-red-600',
          bg: 'bg-red-50 dark:bg-red-950/30',
          border: 'border-red-200 dark:border-red-800',
          icon: AlertTriangle,
          label: 'Crítico',
          description: 'Grande discrepância - precificação competitiva recomendada'
        };
    }
  };

  const alignmentConfig = getAlignmentConfig();
  const AlignmentIcon = alignmentConfig.icon;

  // Calcular barras de progresso proporcionais
  const maxPrice = Math.max(precoAnuncio, precoVendaRapida);
  const anuncioBarWidth = (precoAnuncio / maxPrice) * 100;
  const vendaRapidaBarWidth = (precoVendaRapida / maxPrice) * 100;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-600" />
          Estratégia de Precificação
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Comparativo entre preço de anúncio e venda rápida baseado em dados de mercado
        </p>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Cards de Comparação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Preço Anúncio */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                PREÇO ANÚNCIO
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-800 dark:text-amber-200">
              {formatCurrency(precoAnuncio)}
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {formatCurrency(precoAnuncioM2)}/m²
            </div>
            <div className="flex items-center gap-1 mt-2">
              <Clock className="h-3 w-3 text-amber-500" />
              <span className="text-[10px] text-amber-600">
                Prazo estimado: {getPrazoAnuncio()}
              </span>
            </div>
            <div className="mt-2">
              <div className="h-2 rounded-full bg-amber-200 dark:bg-amber-800">
                <div 
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${anuncioBarWidth}%` }}
                />
              </div>
            </div>
          </div>

          {/* Preço Venda Rápida */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                VENDA RÁPIDA
              </span>
              <Badge variant="outline" className="text-[9px] border-emerald-500 text-emerald-600">
                ITBI
              </Badge>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-800 dark:text-emerald-200">
              {formatCurrency(precoVendaRapida)}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(precoVendaRapidaM2)}/m²
            </div>
            <div className="flex items-center gap-1 mt-2">
              <Clock className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] text-emerald-600">
                Prazo estimado: {getPrazoVendaRapida()}
              </span>
            </div>
            <div className="mt-2">
              <div className="h-2 rounded-full bg-emerald-200 dark:bg-emerald-800">
                <div 
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${vendaRapidaBarWidth}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Gap de Mercado */}
        <div className={`rounded-lg p-4 border ${alignmentConfig.bg} ${alignmentConfig.border}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlignmentIcon className={`h-4 w-4 ${alignmentConfig.color}`} />
              <span className="text-sm font-medium">Gap de Mercado</span>
            </div>
            <Badge 
              variant="outline" 
              className={`${alignmentConfig.color} ${alignmentConfig.border}`}
            >
              {alignmentConfig.label}
            </Badge>
          </div>
          
          <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-2xl font-bold ${alignmentConfig.color}`}>
              {marketGap.toFixed(1)}%
            </span>
            {combined.trend_capped && (
              <Badge variant="secondary" className="text-[10px]">
                Capped (original: {combined.trend_original?.toFixed(1)}%)
              </Badge>
            )}
          </div>
          
          <p className={`text-xs ${alignmentConfig.color} opacity-80`}>
            {alignmentConfig.description}
          </p>

          {/* Barra visual do gap */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>0%</span>
              <span>10%</span>
              <span>20%</span>
              <span>35%+</span>
            </div>
            <div className="h-2 rounded-full bg-gradient-to-r from-emerald-200 via-amber-200 to-red-200 dark:from-emerald-900 dark:via-amber-900 dark:to-red-900">
              <div 
                className="h-full w-1 bg-slate-900 dark:bg-white rounded-full transition-all duration-500"
                style={{ marginLeft: `${Math.min(marketGap / 35 * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recomendação */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-2">
            <TrendingDown className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Recomendação: </span>
              {marketGap <= 10 && "Mercado equilibrado. Anuncie próximo ao valor médio combinado para venda em prazo normal."}
              {marketGap > 10 && marketGap <= 20 && "Gap moderado. Considere precificar entre os dois valores para equilibrar velocidade e retorno."}
              {marketGap > 20 && marketGap <= 35 && "Gap alto. Precifique competitivamente (próximo ao valor ITBI) para garantir liquidez."}
              {marketGap > 35 && "Gap crítico. Priorize o valor ITBI para venda no curto prazo. Anúncios na região estão muito inflados."}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
