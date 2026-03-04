import { useState } from "react";
import { Loader2, Play, Database, Building2, Map, Cpu, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEtlLogs, useTerritorialKPIs } from "@/hooks/useTerritorialData";
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
];

export function TerritorialAdmin() {
  const { data: logs, isLoading } = useEtlLogs();
  const { data: kpis } = useTerritorialKPIs();
  const { toast } = useToast();
  const [running, setRunning] = useState<string | null>(null);

  const invokeAction = async (fnName: string) => {
    setRunning(fnName);
    try {
      const { error } = await supabase.functions.invoke(fnName, {
        body: fnName === "ingest-edificacoes-geo" ? { offset_inicial: 0 } : {},
      });
      if (error) throw error;
      toast({ title: "Processo iniciado", description: `${fnName} executado com sucesso.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRunning(null);
    }
  };

  const coverageCards = [
    { label: "Edificações", value: "52.761" },
    { label: "Lotes PAL", value: "1.515" },
    { label: "IPTU Logradouros", value: "485" },
    { label: "Condomínios", value: kpis?.total_condominios?.toLocaleString("pt-BR") ?? "—" },
    { label: "Com ITBI", value: kpis?.com_historico_precos?.toLocaleString("pt-BR") ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-foreground">Administração Territorial</h3>

      {/* Coverage */}
      <div className="grid grid-cols-5 gap-3">
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
