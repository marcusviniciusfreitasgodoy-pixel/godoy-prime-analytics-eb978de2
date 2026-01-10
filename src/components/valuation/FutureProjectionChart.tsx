import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend
} from "recharts";
import { TrendingUp, Calendar, AlertTriangle, Info } from "lucide-react";
import type { FutureProjection } from "@/hooks/useHistoricalTransactionAnalysis";

interface Props {
  currentValue: number;
  projection: FutureProjection;
  area: number;
}

export function FutureProjectionChart({ currentValue, projection, area }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(2)}M`;
    }
    return `R$ ${(value / 1000).toFixed(0)}k`;
  };

  const seriesLabel: Record<string, string> = {
    pessimistic: "Pessimista",
    probable: "Provável",
    optimistic: "Otimista",
  };

  const allowedTooltipKeys = new Set(["pessimistic", "probable", "optimistic"]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const clean = payload.filter((p: any) => allowedTooltipKeys.has(p.dataKey));

    if (!clean.length) return null;

    return (
      <div
        className="rounded-lg border bg-background/95 px-3 py-2 shadow-sm"
        style={{ fontSize: "11px" }}
      >
        <div className="font-medium mb-1">{label}</div>
        <div className="space-y-0.5">
          {clean.map((p: any) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-3">
              <span className="truncate" style={{ color: p.color }}>
                {seriesLabel[p.dataKey] || p.dataKey}
              </span>
              <span className="font-medium">{formatCurrency(p.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const currentYear = new Date().getFullYear();

  // Calcula valores absolutos a partir dos multiplicadores
  // projection.oneYear.probable é um multiplicador (ex: 1.062 para +6.2%)
  // Precisamos multiplicar pelo currentValue para obter o valor absoluto
  const getAbsoluteValue = (multiplier: number) => Math.round(currentValue * multiplier);

  // Dados para o gráfico - convertendo multiplicadores em valores absolutos
  const chartData = [
    {
      year: currentYear.toString(),
      label: "Atual",
      pessimistic: currentValue,
      probable: currentValue,
      optimistic: currentValue,
    },
    {
      year: (currentYear + 1).toString(),
      label: "1 ano",
      pessimistic: getAbsoluteValue(projection.oneYear.pessimistic),
      probable: getAbsoluteValue(projection.oneYear.probable),
      optimistic: getAbsoluteValue(projection.oneYear.optimistic),
    },
    {
      year: (currentYear + 2).toString(),
      label: "2 anos",
      pessimistic: getAbsoluteValue(projection.twoYears.pessimistic),
      probable: getAbsoluteValue(projection.twoYears.probable),
      optimistic: getAbsoluteValue(projection.twoYears.optimistic),
    },
    {
      year: (currentYear + 3).toString(),
      label: "3 anos",
      pessimistic: getAbsoluteValue(projection.threeYears.pessimistic),
      probable: getAbsoluteValue(projection.threeYears.probable),
      optimistic: getAbsoluteValue(projection.threeYears.optimistic),
    },
  ];

  // Variações percentuais (baseadas nos multiplicadores)
  const variacao1Ano = (projection.oneYear.probable - 1) * 100;
  const variacao3Anos = (projection.threeYears.probable - 1) * 100;
  const variacao2Anos = (projection.twoYears.probable - 1) * 100;

  const getConfidenceConfig = () => {
    switch (projection.confidence) {
      case 'alta':
        return {
          color: 'text-emerald-600',
          bg: 'bg-emerald-100 dark:bg-emerald-950/40',
          border: 'border-emerald-500',
          label: 'Alta Confiança'
        };
      case 'media':
        return {
          color: 'text-amber-600',
          bg: 'bg-amber-100 dark:bg-amber-950/40',
          border: 'border-amber-500',
          label: 'Confiança Média'
        };
      case 'baixa':
        return {
          color: 'text-red-600',
          bg: 'bg-red-100 dark:bg-red-950/40',
          border: 'border-red-500',
          label: 'Baixa Confiança'
        };
    }
  };

  const confidenceConfig = getConfidenceConfig();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Projeção de Valorização
          </CardTitle>
          <Badge 
            variant="outline" 
            className={`text-[10px] ${confidenceConfig.color} ${confidenceConfig.border}`}
          >
            {confidenceConfig.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Estimativa de valor futuro baseada na tendência histórica de 5 anos
        </p>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* KPIs de Projeção */}
        <div className="grid grid-cols-3 gap-3">
          {/* 1 Ano */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/30 rounded-lg p-3 text-center border border-blue-200 dark:border-blue-800">
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">1 ANO</div>
            <div className="text-sm sm:text-lg font-bold text-blue-800 dark:text-blue-200 mt-1">
              {formatCurrencyCompact(getAbsoluteValue(projection.oneYear.probable))}
            </div>
            <div className={`text-[10px] ${variacao1Ano >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {variacao1Ano >= 0 ? '+' : ''}{variacao1Ano.toFixed(1)}%
            </div>
          </div>

          {/* 2 Anos */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/30 rounded-lg p-3 text-center border border-purple-200 dark:border-purple-800">
            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">2 ANOS</div>
            <div className="text-sm sm:text-lg font-bold text-purple-800 dark:text-purple-200 mt-1">
              {formatCurrencyCompact(getAbsoluteValue(projection.twoYears.probable))}
            </div>
            <div className={`text-[10px] ${variacao2Anos >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {variacao2Anos >= 0 ? '+' : ''}{variacao2Anos.toFixed(1)}%
            </div>
          </div>

          {/* 3 Anos */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/30 rounded-lg p-3 text-center border border-indigo-200 dark:border-indigo-800">
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">3 ANOS</div>
            <div className="text-sm sm:text-lg font-bold text-indigo-800 dark:text-indigo-200 mt-1">
              {formatCurrencyCompact(getAbsoluteValue(projection.threeYears.probable))}
            </div>
            <div className={`text-[10px] ${variacao3Anos >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {variacao3Anos >= 0 ? '+' : ''}{variacao3Anos.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Gráfico de Projeção */}
        <div className="h-[200px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10 }} 
                axisLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                tick={{ fontSize: 9 }} 
                axisLine={{ stroke: '#d1d5db' }}
                tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '10px' }}
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    pessimistic: 'Pessimista',
                    probable: 'Provável',
                    optimistic: 'Otimista',
                  };
                  return labels[value] || value;
                }}
              />
              <Area
                type="monotone"
                dataKey="optimistic"
                stroke="none"
                fill="#10b981"
                fillOpacity={0.1}
                legendType="none"
                name="optimisticArea"
              />
              <Area
                type="monotone"
                dataKey="pessimistic"
                stroke="none"
                fill="#ef4444"
                fillOpacity={0.1}
                legendType="none"
                name="pessimisticArea"
              />
              <Line 
                type="monotone" 
                dataKey="pessimistic" 
                stroke="#ef4444" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#ef4444', strokeWidth: 1, r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="probable" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#8b5cf6' }}
              />
              <Line 
                type="monotone" 
                dataKey="optimistic" 
                stroke="#10b981" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#10b981', strokeWidth: 1, r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Taxas utilizadas */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2">
            <div className="text-[10px] text-muted-foreground">Taxa Pessimista</div>
            <div className="text-sm font-medium text-red-600">
              {projection.pessimisticRate >= 0 ? '+' : ''}{projection.pessimisticRate.toFixed(1)}% a.a.
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-2">
            <div className="text-[10px] text-muted-foreground">Taxa Provável</div>
            <div className="text-sm font-medium text-purple-600">
              {projection.probableRate >= 0 ? '+' : ''}{projection.probableRate.toFixed(1)}% a.a.
            </div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2">
            <div className="text-[10px] text-muted-foreground">Taxa Otimista</div>
            <div className="text-sm font-medium text-emerald-600">
              {projection.optimisticRate >= 0 ? '+' : ''}{projection.optimisticRate.toFixed(1)}% a.a.
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-700 dark:text-amber-300">
              {projection.disclaimer}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
