import { useState } from "react";
import { Loader2, Play, Database, Building2, Map, Cpu, MapPin, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEtlLogs } from "@/hooks/useTerritorialData";
import { useCoverageStats } from "@/hooks/useTerritorialData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-500",
  running: "bg-blue-500",
  error: "bg-red-500",
  partial: "bg-yellow-500",
};

const ACTIONS = [
  { label: "Ingestão IPTU", fn: "ingest-iptu-prefeitura", icon: Database },
  { label: "Ingestão Lotes", fn: "ingest-lotes-pal", icon: Map },
  { label: "Ingestão Edificações", fn: "ingest-edificacoes-geo", icon: Building2 },
  { label: "Rodar Algoritmo", fn: "process-condominios-algorithm", icon: Cpu },
  { label: "Geocodificar ITBI", fn: "geocodificar-itbi-transactions", icon: MapPin },
  { label: "Enriquecer Logradouros", fn: "enrich-logradouros-geo", icon: Route },
];

export function TerritorialAdmin() {
  const { data: logs, isLoading } = useEtlLogs();
  const { data: coverage } = useCoverageStats();
  const { toast } = useToast();
  const [running, setRunning] = useState<string | null>(null);

  const invokeAction = async (fnName: string) => {
    setRunning(fnName);
    try {
      const body = fnName === "ingest-edificacoes-geo"
        ? { offset_inicial: 0 }
        : fnName === "enrich-logradouros-geo"
        ? { limite: 100 }
        : {};
      const { error } = await supabase.functions.invoke(fnName, { body });
      if (error) throw error;
      toast({ title: "Processo iniciado", description: `${fnName} executado com sucesso.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRunning(null);
    }
  };

  const fmt = (n: number | undefined | null) =>
    n != null ? n.toLocaleString("pt-BR") : "—";

  const coverageCards = [
    { label: "Edificações", value: fmt(coverage?.edificacoes_total) },
    { label: "Lotes PAL", value: fmt(coverage?.lotes_total) },
    { label: "IPTU Logradouros", value: fmt(coverage?.iptu_logradouros) },
    { label: "Condomínios", value: fmt(coverage?.condominios_total) },
    { label: "Com ITBI", value: fmt(coverage?.condominios_com_itbi) },
    { label: "Com Logradouro", value: fmt(coverage?.condominios_com_logradouro) },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-foreground">Administração Territorial</h3>

      {/* Coverage */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {coverageCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.label}</p>
              <p className="text-xl font-bold text-foreground mt-1">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <Button
            key={action.fn}
            variant="outline"
            size="sm"
            disabled={running !== null}
            onClick={() => invokeAction(action.fn)}
            className="gap-2"
          >
            {running === action.fn ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <action.icon className="h-4 w-4" />
            )}
            {action.label}
          </Button>
        ))}
      </div>

      {/* ETL Logs */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Fonte</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Registros</TableHead>
              <TableHead className="text-xs">Início</TableHead>
              <TableHead className="text-xs">Duração</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : (
              logs?.map((log) => {
                const duration = log.iniciado_em && log.finalizado_em
                  ? `${Math.round((new Date(log.finalizado_em).getTime() - new Date(log.iniciado_em).getTime()) / 1000)}s`
                  : log.status === "running" ? "em execução..." : "—";

                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm font-medium">{log.fonte}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] text-white ${STATUS_COLORS[log.status] ?? "bg-muted-foreground"}`}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {(log.registros_importados ?? 0) + (log.registros_atualizados ?? 0)}
                      {(log.registros_com_erro ?? 0) > 0 && (
                        <span className="text-red-500 ml-1">(+{log.registros_com_erro} erros)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.iniciado_em ? new Date(log.iniciado_em).toLocaleString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{duration}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
