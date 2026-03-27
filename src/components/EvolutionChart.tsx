import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useEvolutionData, GranularityType } from "@/hooks/useEvolutionData";
import { Skeleton } from "./ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { Calendar, CalendarDays, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { 
  StandardChartTooltip, 
  StandardChartLegend,
  formatCurrencyBR,
  type LegendItem 
} from "./ui/chart-tooltip";

const EVOLUTION_LABELS: Record<string, string> = {
  geral: "Preço Médio",
  apartamento: "Apartamento",
  casa: "Casa",
  variacao: "Variação",
};

const TIPOLOGIA_LEGEND_ITEMS: LegendItem[] = [
  { dataKey: "apartamento", iconType: "line", color: "hsl(var(--accent))" },
  { dataKey: "casa", iconType: "line", color: "hsl(var(--chart-3))" },
];

interface EvolutionChartProps {
  bairro?: string;
}

export function EvolutionChart({ bairro = "BARRA DA TIJUCA" }: EvolutionChartProps) {
  const [granularity, setGranularity] = useState<GranularityType>('semester');
  const { data: evolutionData, isLoading } = useEvolutionData(bairro, granularity);
  const { data: semesterData } = useEvolutionData(bairro, 'semester');
  const { data: annualData } = useEvolutionData(bairro, 'annual');

  const chartData = evolutionData || [];
  const periodCount = chartData.length;
  const periodLabel = granularity === 'annual' ? 'anos' : 'semestres';

  // Resumo interpretativo — Aba Geral
  const geralSummary = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const growth = ((last.geral - first.geral) / first.geral) * 100;
    const peak = chartData.reduce((max, d) => d.geral > max.geral ? d : max, chartData[0]);
    const direction = growth > 0 ? 'valorização' : growth < 0 ? 'queda' : 'estabilidade';
    const colorClass = growth > 0 ? 'text-emerald-600 dark:text-emerald-400' : growth < 0 ? 'text-destructive' : 'text-muted-foreground';
    return { first: first.mes, last: last.mes, firstVal: first.geral, lastVal: last.geral, growth, peak: peak.mes, peakVal: peak.geral, direction, colorClass };
  }, [chartData]);

  // Resumo interpretativo — Aba Tipologia
  const tipologiaSummary = useMemo(() => {
    if (chartData.length < 2) return null;
    const last = chartData[chartData.length - 1];
    const prev = chartData[chartData.length - 2];
    const spread = last.apartamento > 0 && last.casa > 0
      ? ((last.apartamento - last.casa) / last.casa) * 100
      : 0;
    const aptTrend = last.apartamento >= prev.apartamento ? 'alta' : 'queda';
    const casaTrend = last.casa >= prev.casa ? 'alta' : 'queda';
    return { apt: last.apartamento, casa: last.casa, spread, aptTrend, casaTrend };
  }, [chartData]);

  // Resumo interpretativo — Aba Variação
  const variacaoSummary = useMemo(() => {
    if (chartData.length < 2) return null;
    const positivos = chartData.filter(d => d.variacao > 0).length;
    const total = chartData.length;
    const last = chartData[chartData.length - 1];
    const predominancia = positivos > total / 2 ? 'alta' : positivos < total / 2 ? 'queda' : 'estável';
    const colorClass = last.variacao > 0 ? 'text-emerald-600 dark:text-emerald-400' : last.variacao < 0 ? 'text-destructive' : 'text-muted-foreground';
    return { positivos, total, lastVar: last.variacao, lastPeriod: last.mes, predominancia, colorClass };
  }, [chartData]);

  // Calcular tendência de curto prazo (semestral)
  const shortTermTrend = useMemo(() => {
    if (!semesterData || semesterData.length < 2) return { direction: 'neutral' as const, value: 0, period: '' };
    const lastPeriod = semesterData[semesterData.length - 1];
    const prevPeriod = semesterData[semesterData.length - 2];
    const variation = lastPeriod.variacao;
    const periodLabel = `${lastPeriod.mes} vs ${prevPeriod.mes}`;
    
    if (variation > 1) return { direction: 'up' as const, value: variation, period: periodLabel };
    if (variation < -1) return { direction: 'down' as const, value: variation, period: periodLabel };
    return { direction: 'neutral' as const, value: variation, period: periodLabel };
  }, [semesterData]);

  // Calcular tendência de longo prazo (anual)
  const longTermTrend = useMemo(() => {
    if (!annualData || annualData.length < 2) return { direction: 'neutral' as const, value: 0, period: '' };
    const lastPeriod = annualData[annualData.length - 1];
    const prevPeriod = annualData[annualData.length - 2];
    const variation = lastPeriod.variacao;
    const periodLabel = `${lastPeriod.mes} vs ${prevPeriod.mes}`;
    
    if (variation > 1) return { direction: 'up' as const, value: variation, period: periodLabel };
    if (variation < -1) return { direction: 'down' as const, value: variation, period: periodLabel };
    return { direction: 'neutral' as const, value: variation, period: periodLabel };
  }, [annualData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução Histórica</CardTitle>
          <CardDescription>Tendência de Mercado</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const tooltipValueFormatter = (value: number, key: string) => {
    if (key === 'variacao') return `${value.toFixed(2)}%`;
    return formatCurrencyBR(value);
  };

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex flex-col gap-3">
          {/* Title and granularity toggle row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm sm:text-lg leading-tight">Evolução Histórica ({periodCount} {periodLabel})</CardTitle>
              <CardDescription className="text-[10px] sm:text-sm mt-0.5">
                Tendência - {granularity === 'annual' ? 'Anual' : 'Semestral'}
              </CardDescription>
            </div>
            <ToggleGroup 
              type="single" 
              value={granularity} 
              onValueChange={(value) => value && setGranularity(value as GranularityType)}
              className="flex-shrink-0"
            >
              <ToggleGroupItem value="semester" aria-label="Semestral" className="text-[10px] sm:text-xs gap-0.5 sm:gap-1 px-2 sm:px-3 h-7 sm:h-8">
                <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Semestral</span>
                <span className="sm:hidden">Sem</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="annual" aria-label="Anual" className="text-[10px] sm:text-xs gap-0.5 sm:gap-1 px-2 sm:px-3 h-7 sm:h-8">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Anual</span>
                <span className="sm:hidden">Ano</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          {/* Trend badges row */}
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 cursor-help">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Curto:</span>
                    <Badge 
                      variant={shortTermTrend.direction === 'up' ? 'default' : shortTermTrend.direction === 'down' ? 'destructive' : 'secondary'}
                      className="flex items-center gap-0.5 text-[10px] sm:text-xs h-5 px-1.5"
                    >
                      {shortTermTrend.direction === 'up' && <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                      {shortTermTrend.direction === 'down' && <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                      {shortTermTrend.direction === 'neutral' && <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                      {shortTermTrend.value > 0 ? '+' : ''}{shortTermTrend.value.toFixed(1)}%
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px]">
                  <p className="text-xs font-medium">Tendência de curto prazo</p>
                  <p className="text-xs text-muted-foreground mt-1">Variação entre os dois últimos semestres: {shortTermTrend.period}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 cursor-help">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Longo:</span>
                    <Badge 
                      variant={longTermTrend.direction === 'up' ? 'default' : longTermTrend.direction === 'down' ? 'destructive' : 'secondary'}
                      className="flex items-center gap-0.5 text-[10px] sm:text-xs h-5 px-1.5"
                    >
                      {longTermTrend.direction === 'up' && <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                      {longTermTrend.direction === 'down' && <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                      {longTermTrend.direction === 'neutral' && <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                      {longTermTrend.value > 0 ? '+' : ''}{longTermTrend.value.toFixed(1)}%
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px]">
                  <p className="text-xs font-medium">Tendência de longo prazo</p>
                  <p className="text-xs text-muted-foreground mt-1">Variação entre os dois últimos anos: {longTermTrend.period}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 h-auto">
            <TabsTrigger value="geral" className="text-xs sm:text-sm py-2">Geral</TabsTrigger>
            <TabsTrigger value="tipologia" className="text-xs sm:text-sm py-2">Tipologia</TabsTrigger>
            <TabsTrigger value="variacao" className="text-xs sm:text-sm py-2">Variação</TabsTrigger>
          </TabsList>
          
          <TabsContent value="geral" className="mt-2">
            <ResponsiveContainer width="100%" height={280} className="sm:!h-[320px]">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="mes" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  yAxisId="price"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)} mil`}
                />
                <YAxis 
                  yAxisId="volume"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  hide
                />
                <Tooltip 
                  content={
                    <StandardChartTooltip 
                      labelMap={EVOLUTION_LABELS}
                      valueFormatter={tooltipValueFormatter}
                      excludeKeys={["Tendência"]}
                    />
                  }
                />
                <Bar 
                  yAxisId="price"
                  dataKey="geral" 
                  fill="hsl(42 74% 52% / 0.6)" 
                  radius={[2, 2, 0, 0]}
                  name="geral"
                />
                <Line 
                  yAxisId="price"
                  type="monotone" 
                  dataKey="geral" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  name="Tendência"
                />
              </ComposedChart>
            </ResponsiveContainer>
            {geralSummary && (
              <p className="text-xs bg-muted/50 rounded p-2 mt-2 leading-relaxed">
                O preço médio saiu de <span className="font-medium">{formatCurrencyBR(geralSummary.firstVal)}/m²</span> ({geralSummary.first}) para <span className="font-medium">{formatCurrencyBR(geralSummary.lastVal)}/m²</span> ({geralSummary.last}) — <span className={geralSummary.colorClass + ' font-semibold'}>{geralSummary.direction} de {geralSummary.growth > 0 ? '+' : ''}{geralSummary.growth.toFixed(1)}%</span>. Pico em {geralSummary.peak} ({formatCurrencyBR(geralSummary.peakVal)}/m²).
              </p>
            )}
          
          <TabsContent value="tipologia" className="mt-2">
            <ResponsiveContainer width="100%" height={280} className="sm:!h-[320px]">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="mes" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)} mil`}
                />
                <Tooltip 
                  content={
                    <StandardChartTooltip 
                      labelMap={EVOLUTION_LABELS}
                      valueFormatter={tooltipValueFormatter}
                    />
                  }
                />
                <StandardChartLegend 
                  items={TIPOLOGIA_LEGEND_ITEMS}
                  labelMap={EVOLUTION_LABELS}
                  className="mt-2"
                />
                <Line 
                  type="monotone" 
                  dataKey="apartamento" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  dot={false}
                  name="Apartamento"
                />
                <Line 
                  type="monotone" 
                  dataKey="casa" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={false}
                  name="Casa"
                />
              </ComposedChart>
            </ResponsiveContainer>
            {tipologiaSummary && (
              <p className="text-xs bg-muted/50 rounded p-2 mt-2 leading-relaxed">
                Apartamentos (<span className="font-medium">{formatCurrencyBR(tipologiaSummary.apt)}/m²</span>) estão <span className="font-semibold">{tipologiaSummary.spread > 0 ? '+' : ''}{tipologiaSummary.spread.toFixed(0)}%</span> {tipologiaSummary.spread >= 0 ? 'acima' : 'abaixo'} de Casas (<span className="font-medium">{formatCurrencyBR(tipologiaSummary.casa)}/m²</span>). Apto em {tipologiaSummary.aptTrend}, Casa em {tipologiaSummary.casaTrend}.
              </p>
            )}
            <ResponsiveContainer width="100%" height={280} className="sm:!h-[320px]">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="mes" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                />
                <Tooltip 
                  content={
                    <StandardChartTooltip 
                      labelMap={EVOLUTION_LABELS}
                      valueFormatter={tooltipValueFormatter}
                    />
                  }
                />
                <Bar 
                  dataKey="variacao" 
                  fill="hsl(var(--accent))"
                  radius={[2, 2, 0, 0]}
                />
                <Line 
                  type="monotone" 
                  dataKey="variacao" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            {variacaoSummary && (
              <p className="text-xs bg-muted/50 rounded p-2 mt-2 leading-relaxed">
                <span className="font-semibold">{variacaoSummary.positivos} de {variacaoSummary.total}</span> períodos com valorização. Último período ({variacaoSummary.lastPeriod}): <span className={variacaoSummary.colorClass + ' font-semibold'}>{variacaoSummary.lastVar > 0 ? '+' : ''}{variacaoSummary.lastVar.toFixed(1)}%</span>. Mercado predominantemente em <span className="font-medium">{variacaoSummary.predominancia}</span>.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
