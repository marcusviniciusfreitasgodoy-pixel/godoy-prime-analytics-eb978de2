import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StreetComparisonData } from '@/hooks/useStreetComparison';
import { StandardChartTooltip, formatCurrencyBR } from '@/components/ui/chart-tooltip';

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

    const MONTH_LABELS: Record<string, string> = {
      '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
      '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
    };

    // Build chart data
    return sortedMonths.map(mes => {
      const mm = mes.substring(5);
      const year = mes.substring(2, 4);
      const entry: Record<string, string | number> = { mes: `${MONTH_LABELS[mm] || mm}/${year}` };
      
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
            content={
              <StandardChartTooltip 
                labelMap={Object.fromEntries(
                  data.map((street, idx) => [`rua${idx}`, street.logradouro?.substring(0, 25) || `Rua ${idx + 1}`])
                )}
                valueFormatter={(v) => `${formatCurrencyBR(v)}/m²`}
              />
            }
          />
          <Legend 
            formatter={(value) => {
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
