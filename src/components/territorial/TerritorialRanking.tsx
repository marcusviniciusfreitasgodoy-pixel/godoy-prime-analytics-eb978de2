import { useState, useMemo } from "react";
import { ArrowUpDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCondominiosRanking } from "@/hooks/useTerritorialData";
import { exportToCSV } from "@/utils/exportUtils";

type SortKey = "preco_medio_m2" | "total_transacoes_itbi" | "unidades_estimadas" | "numero_torres";

export function TerritorialRanking() {
  const { data: condominios, isLoading } = useCondominiosRanking();
  const [sortKey, setSortKey] = useState<SortKey>("preco_medio_m2");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    if (!condominios) return [];
    return [...condominios].sort((a, b) => {
      const va = (a as any)[sortKey] ?? 0;
      const vb = (b as any)[sortKey] ?? 0;
      return sortAsc ? va - vb : vb - va;
    });
  }, [condominios, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const handleExport = () => {
    if (sorted.length > 0) exportToCSV(sorted, "ranking_condominios");
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando ranking...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">Ranking de Condomínios por Preço</h3>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> CSV
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Logradouro / Nome</TableHead>
              <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort("numero_torres")}>
                <span className="flex items-center gap-1">Torres <ArrowUpDown className="h-3 w-3" /></span>
              </TableHead>
              <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort("unidades_estimadas")}>
                <span className="flex items-center gap-1">Unidades <ArrowUpDown className="h-3 w-3" /></span>
              </TableHead>
              <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort("preco_medio_m2")}>
                <span className="flex items-center gap-1">R$/m² <ArrowUpDown className="h-3 w-3" /></span>
              </TableHead>
              <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort("total_transacoes_itbi")}>
                <span className="flex items-center gap-1">Trans. ITBI <ArrowUpDown className="h-3 w-3" /></span>
              </TableHead>
              <TableHead className="text-xs">Última venda</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-sm">
                  <p className="font-medium truncate max-w-[300px]">{c.nome_condominio || c.logradouro_padrao}</p>
                  {c.nome_condominio && (
                    <p className="text-[10px] text-muted-foreground truncate max-w-[300px]">{c.logradouro_padrao}</p>
                  )}
                </TableCell>
                <TableCell className="text-sm">{c.numero_torres ?? "—"}</TableCell>
                <TableCell className="text-sm">{c.unidades_estimadas?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                <TableCell className="text-sm font-semibold text-accent">
                  {c.preco_medio_m2 ? `R$ ${c.preco_medio_m2.toLocaleString("pt-BR")}` : "—"}
                </TableCell>
                <TableCell className="text-sm">{c.total_transacoes_itbi ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.ultima_transacao_itbi
                    ? new Date(c.ultima_transacao_itbi).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
