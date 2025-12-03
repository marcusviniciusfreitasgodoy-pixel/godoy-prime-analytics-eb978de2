import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useEvolutionData } from "@/hooks/useEvolutionData";
import { Skeleton } from "./ui/skeleton";

export function EvolutionChart() {
  const { data: evolutionData, isLoading } = useEvolutionData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução Histórica (60 meses)</CardTitle>
          <CardDescription>Tendência de Mercado</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = evolutionData || [];
  const monthCount = chartData.length;

  // Custom tooltip style
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    padding: '12px',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Evolução Histórica ({monthCount} meses)</CardTitle>
            <CardDescription>Tendência de Mercado</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="tipologia">Por Tipologia</TabsTrigger>
            <TabsTrigger value="variacao">Variação (%)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="geral" className="mt-2">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="mes" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={11}
                  tickFormatter={(value) => value.includes('Jan') ? value : ''}
                />
                <YAxis 
                  yAxisId="price"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)} mil`}
                />
                <YAxis 
                  yAxisId="volume"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  hide
                />
                <Tooltip 
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => {
                    if (name === 'geral') return [`R$ ${value.toLocaleString('pt-BR')}`, 'Preço Médio'];
                    return [value, name];
                  }}
                />
                <Bar 
                  yAxisId="price"
                  dataKey="geral" 
                  fill="hsl(42 74% 52% / 0.6)" 
                  radius={[2, 2, 0, 0]}
                  name="geral"
                />
                <Line 
                  yAxisId="price"
                  type="monotone" 
                  dataKey="geral" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  name="Tendência"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="tipologia" className="mt-2">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="mes" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={11}
                  tickFormatter={(value) => value.includes('Jan') ? value : ''}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)} mil`}
                />
                <Tooltip 
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="apartamento" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  dot={false}
                  name="Apartamento"
                />
                <Line 
                  type="monotone" 
                  dataKey="casa" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  dot={false}
                  name="Casa"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="variacao" className="mt-2">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="mes" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={11}
                  tickFormatter={(value) => value.includes('Jan') ? value : ''}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                />
                <Tooltip 
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Variação']}
                />
                <Bar 
                  dataKey="variacao" 
                  fill="hsl(var(--accent))"
                  radius={[2, 2, 0, 0]}
                />
                <Line 
                  type="monotone" 
                  dataKey="variacao" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
