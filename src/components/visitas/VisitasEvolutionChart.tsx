import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Loader2 } from "lucide-react";
import { StandardChartTooltip, createLegendFormatter } from "@/components/ui/chart-tooltip";

const VISITAS_LABELS: Record<string, string> = {
  realizadas: "Realizadas",
  agendadas: "Agendadas",
  canceladas: "Canceladas",
};

interface EvolucaoMensal {
  mes: string;
  agendadas: number;
  realizadas: number;
  canceladas: number;
}

interface VisitasEvolutionChartProps {
  data: EvolucaoMensal[] | undefined;
  isLoading: boolean;
}

export function VisitasEvolutionChart({ data, isLoading }: VisitasEvolutionChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução Mensal</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução Mensal</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Sem dados para exibir
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Evolução Mensal de Visitas</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="mes" 
              className="text-xs fill-muted-foreground"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs fill-muted-foreground"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              content={
                <StandardChartTooltip 
                  labelMap={VISITAS_LABELS}
                />
              }
            />
            <Legend formatter={createLegendFormatter(VISITAS_LABELS)} />
            <Bar 
              dataKey="realizadas" 
              name="Realizadas" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              dataKey="agendadas" 
              name="Agendadas" 
              fill="hsl(var(--accent))" 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              dataKey="canceladas" 
              name="Canceladas" 
              fill="hsl(var(--destructive))" 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
