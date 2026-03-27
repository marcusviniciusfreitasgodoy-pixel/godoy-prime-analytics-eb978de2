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

    // Group monthly data into semesters per street
    const semesterMap = new Map<string, Record<string, { soma: number; peso: number }>>();

    data.forEach((street, idx) => {
      street.dados_mensais.forEach(d => {
        const year = d.mes.substring(0, 4);
        const mm = parseInt(d.mes.substring(5));
        const sem = mm <= 6 ? 'S1' : 'S2';
        const key = `${year}-${sem}`;

        if (!semesterMap.has(key)) semesterMap.set(key, {});
        const bucket = semesterMap.get(key)!;
        if (!bucket[`rua${idx}`]) bucket[`rua${idx}`] = { soma: 0, peso: 0 };
        bucket[`rua${idx}`].soma += d.media_m2 * d.transacoes;
        bucket[`rua${idx}`].peso += d.transacoes;
      });
    });

    const sortedKeys = Array.from(semesterMap.keys()).sort();

    return sortedKeys.map(key => {
      const [year, sem] = key.split('-');
      const label = `${sem === 'S1' ? '1°' : '2°'}Sem/${year.substring(2)}`;
      const entry: Record<string, string | number> = { mes: label };
      const bucket = semesterMap.get(key)!;

      data.forEach((_, idx) => {
        const b = bucket[`rua${idx}`];
        entry[`rua${idx}`] = b && b.peso > 0 ? Math.round(b.soma / b.peso) : 0;
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
