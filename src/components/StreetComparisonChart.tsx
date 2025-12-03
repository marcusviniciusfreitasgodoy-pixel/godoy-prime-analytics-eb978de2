import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StreetComparisonData } from '@/hooks/useStreetComparison';

interface StreetComparisonChartProps {
  data: StreetComparisonData[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981'];

export function StreetComparisonChart({ data }: StreetComparisonChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Collect all months
    const allMonths = new Set<string>();
    data.forEach(street => {
      street.dados_mensais.forEach(d => allMonths.add(d.mes));
    });

    // Sort months
    const sortedMonths = Array.from(allMonths).sort();

    // Build chart data
    return sortedMonths.map(mes => {
      const entry: Record<string, string | number> = { mes: mes.substring(5) }; // MM format
      
      data.forEach((street, idx) => {
        const monthData = street.dados_mensais.find(d => d.mes === mes);
        entry[`rua${idx}`] = monthData?.media_m2 || 0;
      });

      return entry;
    });
  }, [data]);

  if (data.length === 0) return null;

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="mes" 
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
          />
          <YAxis 
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
            width={40}
          />
          <Tooltip 
            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}/m²`, '']}
            contentStyle={{ 
              backgroundColor: 'hsl(var(--popover))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Legend 
            formatter={(value, entry) => {
              const idx = parseInt(value.replace('rua', ''));
              return data[idx]?.logradouro?.substring(0, 20) || value;
            }}
          />
          {data.map((street, idx) => (
            <Line
              key={idx}
              type="monotone"
              dataKey={`rua${idx}`}
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={`rua${idx}`}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
