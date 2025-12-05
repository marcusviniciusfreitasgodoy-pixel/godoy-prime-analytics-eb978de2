import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useMicrobairroEvolutionData, GranularityType } from '@/hooks/useMicrobairroEvolutionData';
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
import { TrendingUp } from 'lucide-react';

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

export const MicrobairroEvolutionChart = ({ bairro }: MicrobairroEvolutionChartProps) => {
  const [granularity, setGranularity] = useState<GranularityType>('semester');
  
  const { data: evolutionData, isLoading } = useMicrobairroEvolutionData(bairro, granularity);

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
            Evolução por Microbairro
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução por Microbairro
          </CardTitle>
          
          <ToggleGroup
            type="single"
            value={granularity}
            onValueChange={(value) => value && setGranularity(value as GranularityType)}
            className="justify-start"
          >
            <ToggleGroupItem value="semester" aria-label="Semestral" className="text-xs px-3">
              Semestral
            </ToggleGroupItem>
            <ToggleGroupItem value="annual" aria-label="Anual" className="text-xs px-3">
              Anual
            </ToggleGroupItem>
          </ToggleGroup>
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
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                width={45}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '']}
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
        
        <p className="text-xs text-muted-foreground text-center mt-2">
          Preço médio R$/m² por microbairro ao longo do tempo
        </p>
      </CardContent>
    </Card>
  );
};
