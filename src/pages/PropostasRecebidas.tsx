import { Helmet } from "react-helmet-async";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { usePropostas } from "@/hooks/usePropostas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Download, ExternalLink, FileText } from "lucide-react";
import { exportPropostaPdf } from "@/utils/propostaPdfExport";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  aceita: { label: "Aceita", variant: "default" },
  recusada: { label: "Recusada", variant: "destructive" },
  expirada: { label: "Expirada", variant: "outline" },
};

function formatCurrency(v: number | null | undefined) {
  if (!v) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return s;
  }
}

export default function PropostasRecebidas() {
  const { propostas, isLoading } = usePropostas();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!propostas) return [];
    const term = search.trim().toLowerCase();
    return propostas.filter((p) => {
      if (statusFilter !== "todos" && p.status !== statusFilter) return false;
      if (!term) return true;
      return (
        p.nome_completo?.toLowerCase().includes(term) ||
        p.codigo?.toLowerCase().includes(term) ||
        p.endereco_resumido?.toLowerCase().includes(term) ||
        p.cpf_cnpj?.toLowerCase().includes(term)
      );
    });
  }, [propostas, search, statusFilter]);

  const handleDownload = async (p: any) => {
    setDownloadingId(p.id);
    try {
      await exportPropostaPdf(p);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Propostas Recebidas | Godoy Prime Analytics</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Propostas Recebidas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Todas as propostas de compra registradas na sua organização.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <CardTitle className="text-base">
                {isLoading ? "Carregando..." : `${filtered.length} proposta(s)`}
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, código, endereço…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 w-full sm:w-72"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aceita">Aceita</SelectItem>
                    <SelectItem value="recusada">Recusada</SelectItem>
                    <SelectItem value="expirada">Expirada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhuma proposta encontrada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((p: any) => {
                  const status = STATUS_LABELS[p.status] ?? { label: p.status, variant: "outline" as const };
                  return (
                    <div
                      key={p.id}
                      className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{p.nome_completo}</span>
                            <Badge variant={status.variant}>{status.label}</Badge>
                            <span className="text-xs text-muted-foreground font-mono">{p.codigo}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {p.endereco_resumido}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                            <span>CPF/CNPJ: {p.cpf_cnpj}</span>
                            <span>Tel: {p.telefone}</span>
                            <span>Recebida: {formatDate(p.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(p.valor_ofertado)}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(p)}
                              disabled={downloadingId === p.id}
                            >
                              {downloadingId === p.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                              <span className="ml-1.5">PDF</span>
                            </Button>
                            {p.ficha_visita_id && (
                              <Button size="sm" variant="ghost" asChild>
                                <Link to={`/visitas/ficha/${p.ficha_visita_id}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span className="ml-1.5">Ficha</span>
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}