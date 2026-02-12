import { usePipelineMetrics } from '@/hooks/usePipelineMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KPICard } from '@/components/KPICard';
import { StandardChartTooltip } from '@/components/ui/chart-tooltip';
import { formatCurrencyShort } from '@/types/crm';
import { TrendingUp, Clock, Users, DollarSign, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';

const FUNNEL_COLORS = [
  'hsl(217 91% 60%)',  // blue
  'hsl(192 91% 50%)',  // cyan
  'hsl(262 83% 58%)',  // violet
  'hsl(42 93% 55%)',   // amber
  'hsl(25 95% 55%)',   // orange
  'hsl(330 81% 60%)',  // pink
  'hsl(152 76% 36%)',  // emerald
];

const LOSS_COLOR = 'hsl(0 84% 60%)';

export function PipelineMetricsDashboard() {
  const { data: metrics, isLoading } = usePipelineMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Dados insuficientes para exibir métricas.
      </div>
    );
  }

  const { funnel, avgTime, lossRate, kpis } = metrics;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Taxa de Conversão"
          value={`${kpis.conversionRate}%`}
          subtitle="Novo → Ganho"
          icon={TrendingUp}
        />
        <KPICard
          title="Ciclo Médio"
          value={kpis.avgCycleDays > 0 ? `${kpis.avgCycleDays} dias` : 'N/A'}
          subtitle="Novo → Ganho"
          icon={Clock}
        />
        <KPICard
          title="Leads Ativos"
          value={String(kpis.activeLeads)}
          subtitle="Em pipeline"
          icon={Users}
        />
        <KPICard
          title="Valor Pipeline"
          value={kpis.pipelineValue > 0 ? formatCurrencyShort(kpis.pipelineValue) : 'N/A'}
          subtitle="Total em negociação"
          icon={DollarSign}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnel} layout="vertical" margin={{ left: 10, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12 }} />
                <Tooltip content={<StandardChartTooltip
                  valueFormatter={(v, key) => key === 'percent' ? `${v}%` : String(v)}
                  labelMap={{ count: 'Leads', percent: '% vs anterior' }}
                />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnel.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                  <LabelList
                    dataKey="percent"
                    position="right"
                    formatter={(v: number) => `${v}%`}
                    className="text-xs fill-muted-foreground"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Avg time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tempo Médio por Estágio</CardTitle>
          </CardHeader>
          <CardContent>
            {avgTime.every(e => e.days === 0) ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                Dados insuficientes
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={avgTime} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                  <YAxis unit=" d" tick={{ fontSize: 12 }} />
                  <Tooltip content={<StandardChartTooltip
                    valueFormatter={(v) => `${v} dias`}
                    labelMap={{ days: 'Média' }}
                  />} />
                  <Bar dataKey="days" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="days" position="top" formatter={(v: number) => v > 0 ? `${v}d` : ''} className="text-xs fill-muted-foreground" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loss rate */}
      {lossRate.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Taxa de Perda por Estágio</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={lossRate} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12 }} />
                <Tooltip content={<StandardChartTooltip
                  valueFormatter={(v) => `${v} leads perdidos`}
                  labelMap={{ count: 'Perdidos' }}
                />} />
                <Bar dataKey="count" fill={LOSS_COLOR} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="count" position="right" className="text-xs fill-muted-foreground" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
