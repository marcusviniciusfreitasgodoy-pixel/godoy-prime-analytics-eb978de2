import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { useWhatsAppLogs, WhatsAppLog } from "@/hooks/useWhatsAppLogs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, CheckCircle, XCircle, Clock, RefreshCw, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tipoLabels: Record<string, string> = {
  confirmacao: "Confirmação",
  lembrete: "Lembrete",
  cancelamento: "Cancelamento",
  reagendamento: "Reagendamento",
  pos_visita: "Pós-Visita",
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: { label: "Enviado", icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
  failed: { label: "Falhou", icon: <XCircle className="h-3 w-3" />, variant: "destructive" },
  pending: { label: "Pendente", icon: <Clock className="h-3 w-3" />, variant: "secondary" },
};

export default function WhatsAppLogs() {
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<WhatsAppLog | null>(null);

  const { data: logs, isLoading, refetch } = useWhatsAppLogs({
    tipo: filtroTipo || undefined,
    status: filtroStatus || undefined,
  });

  const totalEnviados = logs?.filter(l => l.status_envio === "sent").length || 0;
  const totalFalhas = logs?.filter(l => l.status_envio === "failed").length || 0;

  return (
    <>
      <Helmet>
        <title>Histórico WhatsApp | Godoy Prime Analytics</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Histórico de Mensagens WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Log de todas as mensagens enviadas pelo sistema</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold mt-1">{logs?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Enviados</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totalEnviados}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Falhas</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totalFalhas}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Taxa sucesso</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {logs?.length ? `${Math.round((totalEnviados / logs.length) * 100)}%` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de mensagem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="confirmacao">Confirmação</SelectItem>
              <SelectItem value="lembrete">Lembrete</SelectItem>
              <SelectItem value="cancelamento">Cancelamento</SelectItem>
              <SelectItem value="reagendamento">Reagendamento</SelectItem>
              <SelectItem value="pos_visita">Pós-Visita</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sent">Enviados</SelectItem>
              <SelectItem value="failed">Falhas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !logs?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma mensagem encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Destinatário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contexto</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const sc = statusConfig[log.status_envio] || statusConfig.pending;
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.telefone_destino}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {tipoLabels[log.tipo_mensagem] || log.tipo_mensagem}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={sc.variant} className="gap-1">
                              {sc.icon}
                              {sc.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {log.dados_contexto?.nome_visitante || "—"}
                            {log.dados_contexto?.endereco_imovel ? ` • ${log.dados_contexto.endereco_imovel}` : ""}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Mensagem</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Destinatário</p>
                    <p className="font-mono">{selectedLog.telefone_destino}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tipo</p>
                    <p>{tipoLabels[selectedLog.tipo_mensagem] || selectedLog.tipo_mensagem}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant={statusConfig[selectedLog.status_envio]?.variant || "secondary"}>
                      {statusConfig[selectedLog.status_envio]?.label || selectedLog.status_envio}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data</p>
                    <p>{format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
                  </div>
                </div>

                {selectedLog.erro_mensagem && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Erro</p>
                    <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{selectedLog.erro_mensagem}</p>
                  </div>
                )}

                {selectedLog.message_id_externo && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Message ID</p>
                    <p className="text-xs font-mono bg-muted p-2 rounded break-all">{selectedLog.message_id_externo}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Mensagem</p>
                  <pre className="text-xs bg-muted p-3 rounded whitespace-pre-wrap break-words max-h-48 overflow-auto">
                    {selectedLog.mensagem_texto || "—"}
                  </pre>
                </div>

                {selectedLog.dados_contexto && Object.keys(selectedLog.dados_contexto).length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Dados de Contexto</p>
                    <pre className="text-xs bg-muted p-3 rounded whitespace-pre-wrap break-words max-h-32 overflow-auto">
                      {JSON.stringify(selectedLog.dados_contexto, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
