import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useMicrobairroEvolutionData, GranularityType, MetricType } from '@/hooks/useMicrobairroEvolutionData';
import { useState } from 'react';
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

interface MicrobairroEvolutionChartProps {
  bairro: string;
}

const MICROBAIRRO_COLORS: Record<string, string> = {
  'Orla': '#D4AF37',
  'Península': '#0C2340',
  'Centro Metropolitano': '#22C55E',
  'Ayrton Senna': '#3B82F6',
  'Jardim Oceânico': '#8B5CF6',
  'ABM': '#F97316',
  'Parque das Rosas': '#EC4899',
  'Eixo Américas': '#14B8A6',
};

const formatCurrency = (value: number) => {
  return `R$ ${value.toLocaleString('pt-BR')}`;
};

const formatTransactions = (value: number) => {
  return `${value.toLocaleString('pt-BR')} trans.`;
};

export const MicrobairroEvolutionChart = ({ bairro }: MicrobairroEvolutionChartProps) => {
  const [granularity, setGranularity] = useState<GranularityType>('semester');
  const [metric, setMetric] = useState<MetricType>('valorization');
  
  const { data: evolutionData, isLoading } = useMicrobairroEvolutionData(bairro, granularity, metric);

  const title = metric === 'valorization' 
    ? 'Evolução de Valorização' 
    : 'Evolução de Liquidez';

  const subtitle = metric === 'valorization'
    ? 'Preço médio R$/m² por microbairro ao longo do tempo'
    : 'Transações acumuladas desde 2020 por microbairro';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!evolutionData || evolutionData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Dados insuficientes para exibir evolução por microbairro
          </p>
        </CardContent>
      </Card>
    );
  }

  const { data, microbairros } = evolutionData;

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
                formatter={(value: number) => [
                  metric === 'valorization' ? formatCurrency(value) : formatTransactions(value),
                  ''
                ]}
                labelFormatter={(label) => `Período: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="line"
              />
              
              {microbairros.map((microbairro) => (
                <Line
                  key={microbairro}
                  type="monotone"
                  dataKey={microbairro}
                  name={microbairro}
                  stroke={MICROBAIRRO_COLORS[microbairro] || '#888888'}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: MICROBAIRRO_COLORS[microbairro] || '#888888' }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
