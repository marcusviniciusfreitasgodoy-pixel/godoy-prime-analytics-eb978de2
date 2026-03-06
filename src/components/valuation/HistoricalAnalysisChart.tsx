import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Bar,
  ComposedChart,
  Line
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Activity, Info } from "lucide-react";
import type { HistoricalAnalysis } from "@/hooks/useHistoricalTransactionAnalysis";
import { 
  StandardChartTooltip, 
  StandardChartLegend,
  type LegendItem 
} from "@/components/ui/chart-tooltip";

interface Props {
  analysis: HistoricalAnalysis;
}

const HISTORICAL_LABELS: Record<string, string> = {
  transacoes: "Transações",
  valorM2: "Preço Médio/m²",
};

const HISTORICAL_LEGEND_ITEMS: LegendItem[] = [
  { dataKey: "transacoes", iconType: "bar", color: "#3b82f6" },
  { dataKey: "valorM2", iconType: "line", color: "#10b981" },
];

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
    alertas,
    dataSource,
    logradouroUsado,
    bairroUsado,
    hasCurrentYearData,
    currentYearCount,
    currentYearAvgM2
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
    varTransacoes: y.variacaoTransacoes,
    varPreco: y.variacaoPrecoM2,
  }));

  return (
    <div className="space-y-4">
      {/* Header com diagnóstico */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Análise Histórica (5 anos)
            </CardTitle>
            {/* Indicador da fonte dos dados */}
            <Badge 
              variant="outline" 
              className={`text-[10px] ${
                dataSource === 'logradouro' 
                  ? 'border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/30' 
                  : 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30'
              }`}
            >
              {dataSource === 'logradouro' ? (
                <>📍 Dados do logradouro: {logradouroUsado}</>
              ) : (
                <>🏘️ Dados do bairro: {bairroUsado} (logradouro com {'<'}20 transações)</>
              )}
            </Badge>
          </div>
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
                  content={
                    <StandardChartTooltip 
                      labelMap={HISTORICAL_LABELS}
                      valueFormatter={(v, key) => 
                        key === 'transacoes' ? String(v) : formatCurrency(v)
                      }
                    />
                  }
                />
                <StandardChartLegend 
                  items={HISTORICAL_LEGEND_ITEMS}
                  labelMap={HISTORICAL_LABELS}
                  className="mt-2"
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

      {/* Tabela detalhada com variações ano a ano */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📋 Evolução Ano a Ano</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Análise de liquidez (transações) e valorização (preço/m²) por período
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-2 font-medium">Ano</th>
                  <th className="text-center py-2 px-2 font-medium">
                    <div className="flex flex-col items-center">
                      <span>Transações</span>
                      <span className="text-[10px] text-muted-foreground font-normal">(liquidez)</span>
                    </div>
                  </th>
                  <th className="text-center py-2 px-2 font-medium">
                    <div className="flex flex-col items-center">
                      <span>Var. Trans.</span>
                      <span className="text-[10px] text-muted-foreground font-normal">vs ano ant.</span>
                    </div>
                  </th>
                  <th className="text-right py-2 px-2 font-medium">
                    <div className="flex flex-col items-end">
                      <span>Preço/m²</span>
                      <span className="text-[10px] text-muted-foreground font-normal">(médio)</span>
                    </div>
                  </th>
                  <th className="text-center py-2 px-2 font-medium">
                    <div className="flex flex-col items-center">
                      <span>Var. Preço</span>
                      <span className="text-[10px] text-muted-foreground font-normal">vs ano ant.</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((y) => (
                  <tr key={y.ano} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2.5 px-2 font-medium">{y.ano}</td>
                    <td className="py-2.5 px-2 text-center">
                      <Badge 
                        variant={y.transacoes >= 10 ? "default" : y.transacoes >= 5 ? "secondary" : "outline"}
                        className="text-[10px] min-w-[40px]"
                      >
                        {y.transacoes}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {y.variacaoTransacoes !== null ? (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
                          y.variacaoTransacoes > 10 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                          y.variacaoTransacoes < -10 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {y.variacaoTransacoes > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : y.variacaoTransacoes < 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          {y.variacaoTransacoes > 0 ? '+' : ''}{y.variacaoTransacoes}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium">
                      {y.valorMedioM2 > 0 ? formatCurrency(y.valorMedioM2) : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {y.variacaoPrecoM2 !== null ? (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
                          y.variacaoPrecoM2 > 3 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                          y.variacaoPrecoM2 < -3 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {y.variacaoPrecoM2 > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : y.variacaoPrecoM2 < 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          {y.variacaoPrecoM2 > 0 ? '+' : ''}{y.variacaoPrecoM2}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Resumo no footer */}
              <tfoot>
                <tr className="bg-muted/50 border-t-2">
                  <td className="py-2.5 px-2 font-bold text-xs">RESUMO 5 ANOS</td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="font-bold text-primary">
                      {yearlyData.reduce((sum, y) => sum + y.transacoes, 0)} total
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`font-medium text-xs ${
                      transactionGrowth > 0 ? 'text-emerald-600' : 
                      transactionGrowth < 0 ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {transactionGrowth > 0 ? '+' : ''}{transactionGrowth}% a.a.
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <span className="font-medium text-xs text-muted-foreground">
                      Média período
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`font-medium text-xs ${
                      priceGrowth > 0 ? 'text-emerald-600' : 
                      priceGrowth < 0 ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {priceGrowth > 0 ? '+' : ''}{priceGrowth}% a.a.
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* Legenda explicativa */}
          <div className="mt-3 pt-3 border-t flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Crescimento ({'>'}10% trans. / {'>'}3% preço)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Queda ({'<'}-10% trans. / {'<'}-3% preço)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span>Estável</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
