import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTerritorialLogradouros } from "@/hooks/useTerritorialData";
import { cn } from "@/lib/utils";

export function TerritorialLogradouros() {
  const { data: logradouros, isLoading } = useTerritorialLogradouros();

  const top20 = useMemo(() => {
    if (!logradouros) return [];
    return logradouros.slice(0, 20).map((l) => ({
      name: l.logradouro.length > 30 ? l.logradouro.slice(0, 28) + "…" : l.logradouro,
      fullName: l.logradouro,
      imoveis: l.total_imoveis ?? 0,
    }));
  }, [logradouros]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando logradouros...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-foreground">Top 20 Logradouros por Volume de Imóveis</h3>

      {/* Bar chart */}
      <div className="h-[400px] border border-border rounded-lg p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top20} layout="vertical" margin={{ left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              width={115}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [value.toLocaleString("pt-BR"), "Imóveis"]}
              labelFormatter={(label) => {
                const item = top20.find((t) => t.name === label);
                return item?.fullName || label;
              }}
            />
            <Bar dataKey="imoveis" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Full table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Logradouro</TableHead>
              <TableHead className="text-xs text-right">Imóveis IPTU</TableHead>
              <TableHead className="text-xs text-right">Preço real m²</TableHead>
              <TableHead className="text-xs text-right">Venal m²</TableHead>
              <TableHead className="text-xs text-right">Desconto %</TableHead>
              <TableHead className="text-xs text-right">Trans. ITBI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logradouros?.map((l) => {
              const desc = l.desconto_venal_percentual;
              return (
                <TableRow key={l.id}>
                  <TableCell className="text-sm font-medium truncate max-w-[280px]">{l.logradouro}</TableCell>
                  <TableCell className="text-sm text-right">{l.total_imoveis?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                  <TableCell className="text-sm text-right font-semibold text-accent">
                    {l.preco_real_medio_itbi ? `R$ ${l.preco_real_medio_itbi.toLocaleString("pt-BR")}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-right">
                    {l.valor_venal_medio ? `R$ ${l.valor_venal_medio.toLocaleString("pt-BR")}` : "—"}
                  </TableCell>
                  <TableCell className={cn("text-sm text-right font-medium",
                    desc != null && desc > 0 ? "text-green-600" : desc != null && desc < 0 ? "text-red-500" : ""
                  )}>
                    {desc != null ? `${desc > 0 ? "+" : ""}${desc.toFixed(1)}%` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-right">{l.total_transacoes_itbi ?? "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
