import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useMicrobairroEvolutionData, GranularityType, MetricType } from '@/hooks/useMicrobairroEvolutionData';
import { useState, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';
import { StandardChartTooltip, formatCurrencyBR } from '@/components/ui/chart-tooltip';

interface MicrobairroEvolutionChartProps {
  bairro: string;
}

// Cores predefinidas para microbairros da Barra
const BARRA_MICROBAIRRO_COLORS: Record<string, string> = {
  'Orla': '#D4AF37',
  'Península': '#0C2340',
  'Centro Metropolitano': '#22C55E',
  'Ayrton Senna': '#3B82F6',
  'Jardim Oceânico': '#8B5CF6',
  'ABM': '#F97316',
  'Parque das Rosas': '#EC4899',
  'Eixo Américas': '#14B8A6',
};

// Cores dinâmicas para outros bairros
const DYNAMIC_COLORS = [
  '#D4AF37', '#0C2340', '#22C55E', '#3B82F6', 
  '#8B5CF6', '#F97316', '#EC4899', '#14B8A6',
  '#EF4444', '#06B6D4', '#84CC16', '#F59E0B',
];

const getRegionColor = (region: string, index: number): string => {
  // Se for uma região conhecida da Barra, usar cor predefinida
  if (BARRA_MICROBAIRRO_COLORS[region]) {
    return BARRA_MICROBAIRRO_COLORS[region];
  }
  // Caso contrário, usar cor dinâmica baseada no índice
  return DYNAMIC_COLORS[index % DYNAMIC_COLORS.length];
};

export const MicrobairroEvolutionChart = ({ bairro }: MicrobairroEvolutionChartProps) => {
  const [granularity, setGranularity] = useState<GranularityType>('semester');
  const [metric, setMetric] = useState<MetricType>('valorization');
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());
  
  const { data: evolutionData, isLoading } = useMicrobairroEvolutionData(bairro, granularity, metric);

  const handleLegendClick = useCallback((dataKey: string) => {
    setHiddenLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey);
      } else {
        newSet.add(dataKey);
      }
      return newSet;
    });
  }, []);

  const title = metric === 'valorization' 
    ? 'Evolução de Valorização' 
    : 'Evolução de Liquidez';

  const subtitle = metric === 'valorization'
    ? 'Preço médio R$/m² por microbairro ao longo do tempo'
    : 'Transações acumuladas desde 2020 por microbairro';

  const data = evolutionData?.data ?? [];
  const microbairros = evolutionData?.microbairros ?? [];

  const summary = useMemo(() => {
    if (data.length < 2 || microbairros.length === 0) return null;
    const visible = microbairros.filter(m => !hiddenLines.has(m));
    if (visible.length === 0) return null;

    const lastRow = data[data.length - 1];
    const firstRow = data[0];

    if (metric === 'valorization') {
      const lastValues = visible
        .map(m => ({ name: m, val: Number(lastRow[m]) || 0 }))
        .filter(v => v.val > 0)
        .sort((a, b) => b.val - a.val);
      if (lastValues.length < 2) return null;
      const highest = lastValues[0];
      const lowest = lastValues[lastValues.length - 1];
      const spread = ((highest.val - lowest.val) / lowest.val * 100).toFixed(0);

      let bestGrowthName = '';
      let bestGrowthPct = -Infinity;
      visible.forEach(m => {
        const first = Number(firstRow[m]) || 0;
        const last = Number(lastRow[m]) || 0;
        if (first > 0) {
          const pct = ((last - first) / first) * 100;
          if (pct > bestGrowthPct) { bestGrowthPct = pct; bestGrowthName = m; }
        }
      });

      return {
        text1: `${highest.name} (${formatCurrencyBR(highest.val)}/m²) lidera com ${spread}% acima de ${lowest.name} (${formatCurrencyBR(lowest.val)}/m²).`,
        text2: bestGrowthName ? `Maior valorização no período: ${bestGrowthName} (${bestGrowthPct > 0 ? '+' : ''}${bestGrowthPct.toFixed(1)}%).` : null,
        colorClass: Number(spread) > 0 ? 'text-emerald-600' : 'text-destructive',
      };
    } else {
      const lastValues = visible
        .map(m => ({ name: m, val: Number(lastRow[m]) || 0 }))
        .sort((a, b) => b.val - a.val);
      if (lastValues.length === 0) return null;
      const leader = lastValues[0];

      let bestRecentName = '';
      let bestRecentPct = -Infinity;
      if (data.length >= 2) {
        const prevRow = data[data.length - 2];
        visible.forEach(m => {
          const prev = Number(prevRow[m]) || 0;
          const curr = Number(lastRow[m]) || 0;
          if (prev > 0) {
            const pct = ((curr - prev) / prev) * 100;
            if (pct > bestRecentPct) { bestRecentPct = pct; bestRecentName = m; }
          }
        });
      }

      return {
        text1: `${leader.name} lidera com ${leader.val.toLocaleString('pt-BR')} transações acumuladas.`,
        text2: bestRecentName && bestRecentPct > 0 ? `${bestRecentName} teve o maior crescimento recente (+${bestRecentPct.toFixed(1)}%).` : null,
        colorClass: 'text-emerald-600',
      };
    }
  }, [data, microbairros, hiddenLines, metric]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              {metric === 'valorization' ? (
                <TrendingUp className="h-5 w-5 text-primary" />
              ) : (
                <Activity className="h-5 w-5 text-primary" />
              )}
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            
            <ToggleGroup
              type="single"
              value={metric}
              onValueChange={(value) => value && setMetric(value as MetricType)}
              className="justify-start sm:justify-end"
            >
              <ToggleGroupItem value="valorization" aria-label="Valorização" className="text-xs px-2 py-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                R$/m²
              </ToggleGroupItem>
              <ToggleGroupItem value="liquidity" aria-label="Liquidez" className="text-xs px-2 py-1">
                <Activity className="h-3 w-3 mr-1" />
                Trans.
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardDescription className="text-xs">{subtitle}</CardDescription>
            
            <ToggleGroup
              type="single"
              value={granularity}
              onValueChange={(value) => value && setGranularity(value as GranularityType)}
              className="justify-start sm:justify-end"
            >
              <ToggleGroupItem value="semester" aria-label="Semestral" className="text-xs px-2 py-1">
                Semestral
              </ToggleGroupItem>
              <ToggleGroupItem value="annual" aria-label="Anual" className="text-xs px-2 py-1">
                Anual
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-[300px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <XAxis 
                dataKey="periodo" 
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={50}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => 
                  metric === 'valorization' 
                    ? `${(value / 1000).toFixed(0)}k` 
                    : value.toLocaleString('pt-BR')
                }
                width={50}
              />
              <Tooltip
                content={
                  <StandardChartTooltip 
                    valueFormatter={(v) => 
                      metric === 'valorization' 
                        ? formatCurrencyBR(v) 
                        : `${v.toLocaleString('pt-BR')} trans.`
                    }
                  />
                }
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px', cursor: 'pointer' }}
                iconType="line"
                onClick={(e: any) => {
                  if (e?.dataKey) {
                    handleLegendClick(e.dataKey);
                  }
                }}
                formatter={(value: string) => (
                  <span style={{ 
                    textDecoration: hiddenLines.has(value) ? 'line-through' : 'none',
                    opacity: hiddenLines.has(value) ? 0.5 : 1
                  }}>
                    {value}
                  </span>
                )}
              />
              
              {microbairros.map((microbairro, index) => {
                const color = getRegionColor(microbairro, index);
                const isHidden = hiddenLines.has(microbairro);
                return (
                  <Line
                    key={microbairro}
                    type="monotone"
                    dataKey={microbairro}
                    name={microbairro}
                    stroke={color}
                    strokeWidth={isHidden ? 0 : 2.5}
                    dot={isHidden ? false : { r: 3, fill: color }}
                    activeDot={isHidden ? false : { r: 5 }}
                    connectNulls
                    hide={isHidden}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
