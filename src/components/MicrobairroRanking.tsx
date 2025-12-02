import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMicrobairroRanking } from "@/hooks/useITBITransactions";
import { Skeleton } from "./ui/skeleton";

export function MicrobairroRanking() {
  const { data: ranking, isLoading } = useMicrobairroRanking();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ranking por Microbairro</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking por Microbairro</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={ranking || []} 
            layout="vertical"
            margin={{ left: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <YAxis 
              type="category"
              dataKey="microbairro" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/m²`, 'Preço Médio']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar 
              dataKey="preco_medio_m2" 
              fill="hsl(var(--accent))" 
              radius={[0, 8, 8, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
