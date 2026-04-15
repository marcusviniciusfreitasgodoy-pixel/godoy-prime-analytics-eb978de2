import { useState, useMemo } from "react";
import { ArrowUpDown, Download, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCondominiosRanking } from "@/hooks/useTerritorialData";
import { exportToCSV } from "@/utils/exportUtils";

type SortKey = "nome_condominio" | "preco_medio_m2" | "total_transacoes_itbi" | "unidades_estimadas" | "numero_torres";

const PAGE_SIZE = 50;

export function TerritorialRanking() {
  const [showAll, setShowAll] = useState(false);
  const { data: condominios, isLoading } = useCondominiosRanking(showAll);
  const [sortKey, setSortKey] = useState<SortKey>("nome_condominio");
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [filterPadrao, setFilterPadrao] = useState<string>("todos");

  const filtered = useMemo(() => {
    if (!condominios) return [];
    let list = [...condominios];

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.nome_condominio || "").toLowerCase().includes(term) ||
          (c.logradouro_padrao || "").toLowerCase().includes(term)
      );
    }

    if (filterPadrao !== "todos") {
      list = list.filter((c) => c.padrao_construtivo === filterPadrao);
    }

    list.sort((a: any, b: any) => {
      if (sortKey === "nome_condominio") {
        const va = (a.nome_condominio || a.logradouro_padrao || "").toLowerCase();
        const vb = (b.nome_condominio || b.logradouro_padrao || "").toLowerCase();
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      return sortAsc ? va - vb : vb - va;
    });

    return list;
  }, [condominios, search, sortKey, sortAsc, filterPadrao]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const padroes = useMemo(() => {
    if (!condominios) return [];
    const set = new Set(condominios.map((c: any) => c.padrao_construtivo).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [condominios]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "nome_condominio"); }
    setPage(0);
  };

  const handleExport = () => {
    if (filtered.length > 0) exportToCSV(filtered, "ranking_condominios");
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando condomínios...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-foreground">Condomínios Mapeados</h3>
          <p className="text-xs text-muted-foreground">
            {filtered.length.toLocaleString("pt-BR")} condomínios
            {search && ` encontrados`}
            {condominios && filtered.length !== condominios.length && ` de ${condominios.length.toLocaleString("pt-BR")}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={showAll ? "default" : "outline"}
            size="sm"
            onClick={() => { setShowAll(!showAll); setPage(0); }}
            className="text-xs"
          >
            {showAll ? "Todos" : "Com preço"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou logradouro..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-8 h-9 text-sm"
          />
        </div>
        {padroes.length > 0 && (
          <Select value={filterPadrao} onValueChange={(v) => { setFilterPadrao(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Padrão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os padrões</SelectItem>
              {padroes.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs w-[40px]">#</TableHead>
                <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort("nome_condominio")}>
                  <span className="flex items-center gap-1">Nome / Logradouro <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort("numero_torres")}>
                  <span className="flex items-center gap-1">Torres <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort("unidades_estimadas")}>
                  <span className="flex items-center gap-1">Unid. <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort("preco_medio_m2")}>
                  <span className="flex items-center gap-1">R$/m² <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort("total_transacoes_itbi")}>
                  <span className="flex items-center gap-1">Trans. <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="text-xs hidden md:table-cell">Padrão</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Última venda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((c: any, i: number) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs text-muted-foreground">{page * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="text-sm">
                    <p className="font-medium truncate max-w-[250px] md:max-w-[350px]">{c.nome_condominio || c.logradouro_padrao}</p>
                    {c.nome_condominio && (
                      <p className="text-[10px] text-muted-foreground truncate max-w-[250px] md:max-w-[350px]">{c.logradouro_padrao}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{c.numero_torres ?? "—"}</TableCell>
                  <TableCell className="text-sm">{c.unidades_estimadas?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                  <TableCell className="text-sm font-semibold text-accent">
                    {c.preco_medio_m2 ? `R$ ${c.preco_medio_m2.toLocaleString("pt-BR")}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{c.total_transacoes_itbi ?? "—"}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell">
                    {c.padrao_construtivo ? (
                      <Badge variant="secondary" className="text-[10px]">{c.padrao_construtivo}</Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(0)} className="text-xs h-8">
              Início
            </Button>
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs h-8">
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-xs h-8">
              Próxima
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} className="text-xs h-8">
              Fim
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
