import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  Legend,
  ComposedChart,
  Area
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { HistoricalAnalysis } from "@/hooks/useHistoricalTransactionAnalysis";

interface Props {
  analysis: HistoricalAnalysis;
}

export function HistoricalAnalysisChart({ analysis }: Props) {
  const { 
    yearlyData, 
    transactionTrend, 
    priceTrend, 
    liquidityScore,
    liquidityLevel,
    transactionGrowth,
    priceGrowth,
    diagnostico,
    alertas
  } = analysis;

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR')}`;
  };

  const TransactionTrendIcon = transactionTrend === 'crescente' ? TrendingUp :
    transactionTrend === 'decrescente' ? TrendingDown : Minus;

  const PriceTrendIcon = priceTrend === 'alta' ? TrendingUp :
    priceTrend === 'baixa' ? TrendingDown : Minus;

  const getLiquidityColor = () => {
    if (liquidityLevel === 'alta') return 'text-emerald-600';
    if (liquidityLevel === 'media') return 'text-amber-600';
    return 'text-red-600';
  };

  const getLiquidityBg = () => {
    if (liquidityLevel === 'alta') return 'bg-emerald-500';
    if (liquidityLevel === 'media') return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Preparar dados para o gráfico combinado
  const chartData = yearlyData.map(y => ({
    ano: y.ano.toString(),
    transacoes: y.transacoes,
    valorM2: y.valorMedioM2,
    valorMin: y.valorMinM2,
    valorMax: y.valorMaxM2,
  }));

  return (
    <div className="space-y-4">
      {/* Header com diagnóstico */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Análise Histórica (5 anos)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPIs em linha */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Liquidez */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
              <div className="text-xs text-muted-foreground mb-1">Liquidez</div>
              <div className={`text-lg font-bold ${getLiquidityColor()}`}>
                {liquidityScore}/100
              </div>
              <Progress 
                value={liquidityScore} 
                className={`h-1.5 mt-1 ${getLiquidityBg()}`} 
              />
              <Badge 
                variant="outline" 
                className={`text-[10px] mt-1.5 ${getLiquidityColor()}`}
              >
                {liquidityLevel === 'alta' ? 'Alta' : 
                 liquidityLevel === 'media' ? 'Média' : 'Baixa'}
              </Badge>
            </div>

            {/* Tendência Transações */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
              <div className="text-xs text-muted-foreground mb-1">Vol. Transações</div>
              <div className="flex items-center gap-1">
                <TransactionTrendIcon className={`h-4 w-4 ${
                  transactionTrend === 'crescente' ? 'text-emerald-600' :
                  transactionTrend === 'decrescente' ? 'text-red-600' : 'text-muted-foreground'
                }`} />
                <span className={`text-lg font-bold ${
                  transactionTrend === 'crescente' ? 'text-emerald-600' :
                  transactionTrend === 'decrescente' ? 'text-red-600' : ''
                }`}>
                  {transactionGrowth > 0 ? '+' : ''}{transactionGrowth}%
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">a.a.</div>
            </div>

            {/* Tendência Preços */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
              <div className="text-xs text-muted-foreground mb-1">Evolução Preço</div>
              <div className="flex items-center gap-1">
                <PriceTrendIcon className={`h-4 w-4 ${
                  priceTrend === 'alta' ? 'text-emerald-600' :
                  priceTrend === 'baixa' ? 'text-red-600' : 'text-muted-foreground'
                }`} />
                <span className={`text-lg font-bold ${
                  priceTrend === 'alta' ? 'text-emerald-600' :
                  priceTrend === 'baixa' ? 'text-red-600' : ''
                }`}>
                  {priceGrowth > 0 ? '+' : ''}{priceGrowth}%
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">a.a.</div>
            </div>

            {/* Total 5 anos */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
              <div className="text-xs text-muted-foreground mb-1">Total 5 Anos</div>
              <div className="text-lg font-bold text-primary">
                {yearlyData.reduce((sum, y) => sum + y.transacoes, 0)}
              </div>
              <div className="text-[10px] text-muted-foreground">transações</div>
            </div>
          </div>

          {/* Diagnóstico */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800 dark:text-blue-200">
                {diagnostico}
              </p>
            </div>
          </div>

          {/* Alertas */}
          {alertas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {alertas.map((alerta, i) => (
                <Badge 
                  key={i} 
                  variant="outline" 
                  className={`text-[10px] sm:text-xs ${
                    alerta.includes('✅') ? 'border-emerald-500 text-emerald-700' :
                    alerta.includes('⚠️') || alerta.includes('📉') ? 'border-amber-500 text-amber-700' :
                    'border-blue-500 text-blue-700'
                  }`}
                >
                  {alerta}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico Combinado */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📊 Evolução Anual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="ano" 
                  tick={{ fontSize: 11 }} 
                  axisLine={{ stroke: '#d1d5db' }}
                />
                <YAxis 
                  yAxisId="left" 
                  tick={{ fontSize: 10 }} 
                  axisLine={{ stroke: '#d1d5db' }}
                  tickFormatter={(v) => v}
                  label={{ value: 'Transações', angle: -90, position: 'insideLeft', fontSize: 10 }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tick={{ fontSize: 10 }} 
                  axisLine={{ stroke: '#d1d5db' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  label={{ value: 'R$/m²', angle: 90, position: 'insideRight', fontSize: 10 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'transacoes') return [value, 'Transações'];
                    return [formatCurrency(value), 'Valor/m²'];
                  }}
                  contentStyle={{ 
                    fontSize: '12px', 
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(value) => {
                    if (value === 'transacoes') return 'Transações';
                    if (value === 'valorM2') return 'Preço Médio/m²';
                    return value;
                  }}
                />
                <Bar 
                  yAxisId="left" 
                  dataKey="transacoes" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="valorM2" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#10b981' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela detalhada */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📋 Dados por Ano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-1 font-medium">Ano</th>
                  <th className="text-right py-2 px-1 font-medium">Trans.</th>
                  <th className="text-right py-2 px-1 font-medium">Mín/m²</th>
                  <th className="text-right py-2 px-1 font-medium">Méd/m²</th>
                  <th className="text-right py-2 px-1 font-medium">Máx/m²</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((y, i) => {
                  const prevYear = yearlyData[i - 1];
                  const priceChange = prevYear && prevYear.valorMedioM2 > 0
                    ? ((y.valorMedioM2 - prevYear.valorMedioM2) / prevYear.valorMedioM2) * 100
                    : null;
                  
                  return (
                    <tr key={y.ano} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 px-1 font-medium">{y.ano}</td>
                      <td className="py-2 px-1 text-right">
                        <Badge variant="secondary" className="text-[10px]">
                          {y.transacoes}
                        </Badge>
                      </td>
                      <td className="py-2 px-1 text-right text-muted-foreground">
                        {y.valorMinM2 > 0 ? formatCurrency(y.valorMinM2) : '-'}
                      </td>
                      <td className="py-2 px-1 text-right font-medium">
                        <div className="flex items-center justify-end gap-1">
                          {y.valorMedioM2 > 0 ? formatCurrency(y.valorMedioM2) : '-'}
                          {priceChange !== null && y.valorMedioM2 > 0 && (
                            <span className={`text-[10px] ${
                              priceChange > 0 ? 'text-emerald-600' : 
                              priceChange < 0 ? 'text-red-600' : 'text-muted-foreground'
                            }`}>
                              ({priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-1 text-right text-muted-foreground">
                        {y.valorMaxM2 > 0 ? formatCurrency(y.valorMaxM2) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
