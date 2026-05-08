import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAutorizacoes, useAutorizacao, useAutorizacaoEventos, useEnviarAutorizacao } from "@/hooks/useAutorizacoes";
import { STATUS_LABEL, STATUS_BADGE_CLASS, type AutorizacaoStatus } from "@/types/autorizacao";
import { Loader2, Send, FileSignature, Eye, Search } from "lucide-react";

const formatBRL = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

const formatDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export default function AutorizacoesCaptacao() {
  const { data: list = [], isLoading } = useAutorizacoes();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return list.filter((a) => {
      if (statusFilter !== "todos" && a.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          a.codigo.toLowerCase().includes(s) ||
          a.proprietario_nome.toLowerCase().includes(s) ||
          a.endereco.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [list, search, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { rascunho: 0, enviada: 0, visualizada: 0, assinada: 0, recusada: 0 };
    list.forEach((a) => { c[a.status] = (c[a.status] || 0) + 1; });
    return c;
  }, [list]);

  return (
    <>
      <Helmet>
        <title>Autorizações de Captação | Godoy Prime</title>
        <meta name="description" content="Gerencie autorizações de captação de imóveis com assinatura digital." />
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FileSignature className="h-8 w-8 text-primary" />
            Autorizações de Captação
          </h1>
          <p className="text-muted-foreground mt-1">
            Documentos contratuais gerados a partir das avaliações imobiliárias.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(["rascunho","enviada","visualizada","assinada","recusada"] as AutorizacaoStatus[]).map((s) => (
            <Card key={s}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{STATUS_LABEL[s]}</p>
                <p className="text-2xl font-bold mt-1">{counts[s] || 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <CardTitle>Documentos ({filtered.length})</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar código, proprietário ou endereço..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-72"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {(["rascunho","enviada","visualizada","assinada","recusada"] as AutorizacaoStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma autorização encontrada.</p>
                <p className="text-sm mt-1">Gere uma autorização ao final de uma <Link to="/avaliacao-imobiliaria" className="text-primary underline">avaliação imobiliária</Link>.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Proprietário</TableHead>
                      <TableHead>Imóvel</TableHead>
                      <TableHead>Valor Venda</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Atualizado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.codigo}</TableCell>
                        <TableCell className="font-medium">{a.proprietario_nome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {a.endereco}{a.numero ? `, ${a.numero}` : ""} — {a.bairro}
                        </TableCell>
                        <TableCell className="font-semibold">{formatBRL(a.valor_venda)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_BADGE_CLASS[a.status]}>
                            {STATUS_LABEL[a.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(a.updated_at)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedId(a.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedId && <DetalheAutorizacao id={selectedId} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function DetalheAutorizacao({ id }: { id: string }) {
  const { data: aut, isLoading } = useAutorizacao(id);
  const { data: eventos = [] } = useAutorizacaoEventos(id);
  const enviar = useEnviarAutorizacao();

  if (isLoading || !aut) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const podeEnviar = aut.status === "rascunho" || aut.status === "enviada" || aut.status === "visualizada";

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          {aut.codigo}
          <Badge variant="outline" className={STATUS_BADGE_CLASS[aut.status]}>{STATUS_LABEL[aut.status]}</Badge>
        </SheetTitle>
        <SheetDescription>{aut.endereco}{aut.numero ? `, ${aut.numero}` : ""} — {aut.bairro}</SheetDescription>
      </SheetHeader>

      <div className="space-y-4 mt-6">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Proprietário:</span><p className="font-medium">{aut.proprietario_nome}</p></div>
          <div><span className="text-muted-foreground">Email:</span><p className="font-medium truncate">{aut.proprietario_email}</p></div>
          <div><span className="text-muted-foreground">Valor Avaliação:</span><p className="font-medium">{formatBRL(aut.valor_avaliacao)}</p></div>
          <div><span className="text-muted-foreground">Valor Venda:</span><p className="font-bold text-primary">{formatBRL(aut.valor_venda)}</p></div>
          <div><span className="text-muted-foreground">Gestão:</span><p className="font-medium">{aut.tipo_gestao === "com_exclusiva" ? "Com Exclusividade" : "Sem Exclusividade"}</p></div>
          <div><span className="text-muted-foreground">Honorários:</span><p className="font-medium">{aut.percentual_honorarios}%</p></div>
          <div><span className="text-muted-foreground">Prazo:</span><p className="font-medium">{aut.prazo_dias} dias</p></div>
          <div><span className="text-muted-foreground">Vencimento:</span><p className="font-medium">{formatDate(aut.data_vencimento)}</p></div>
        </div>

        {aut.status === "recusada" && aut.motivo_recusa && (
          <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-3 text-sm">
              <p className="font-medium text-red-800 dark:text-red-300">Motivo da recusa:</p>
              <p className="text-red-700 dark:text-red-300">{aut.motivo_recusa}</p>
            </CardContent>
          </Card>
        )}

        {podeEnviar && (
          <Button
            onClick={() => enviar.mutate(aut.id)}
            disabled={enviar.isPending}
            className="w-full"
          >
            {enviar.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {aut.status === "rascunho" ? "Enviar para assinatura" : "Reenviar para assinatura"}
          </Button>
        )}

        <div>
          <h3 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Linha do tempo</h3>
          <div className="space-y-2">
            {eventos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>}
            {eventos.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 text-sm border-l-2 border-primary/30 pl-3 py-1">
                <div className="flex-1">
                  <p className="font-medium capitalize">{ev.tipo.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(ev.created_at)}{ev.ip ? ` • IP ${ev.ip}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}