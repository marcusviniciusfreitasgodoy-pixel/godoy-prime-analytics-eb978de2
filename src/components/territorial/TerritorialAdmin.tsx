import { useState, useEffect } from "react";
import { Loader2, Play, Database, Building2, Map, Cpu, MapPin, Route, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useEtlLogs } from "@/hooks/useTerritorialData";
import { useCoverageStats } from "@/hooks/useTerritorialData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IPTU2025Upload } from "./IPTU2025Upload";

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
  const [reverseProgress, setReverseProgress] = useState<{ resolvidos: number; total: number } | null>(null);
  const [isReversing, setIsReversing] = useState(false);
  const [pendingSemEndereco, setPendingSemEndereco] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportCondominiosCSV = async () => {
    setIsExporting(true);
    try {
      const allData: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("condominios_mapeamento")
          .select("nome_condominio, logradouro_padrao, microbairro, padrao_construtivo, latitude, longitude, unidades_estimadas, numero_torres, preco_medio_m2, total_transacoes_itbi, ultima_transacao_itbi, fonte_identificacao, google_place_id, endereco_completo")
          .eq("ativo", true)
          .order("nome_condominio")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        hasMore = (data?.length ?? 0) === pageSize;
        from += pageSize;
      }

      const headers = ["nome_condominio","logradouro_padrao","microbairro","padrao_construtivo","latitude","longitude","unidades_estimadas","numero_torres","preco_medio_m2","total_transacoes_itbi","ultima_transacao_itbi","fonte_identificacao","google_place_id","endereco_completo"];
      const csvRows = [headers.join(";")];
      for (const row of allData) {
        csvRows.push(headers.map(h => {
          const val = row[h];
          if (val == null) return "";
          const str = String(val);
          return str.includes(";") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(";"));
      }

      const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `condominios_mapeamento_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Exportado", description: `${allData.length} condomínios exportados com sucesso.` });
    } catch (err: any) {
      toast({ title: "Erro na exportação", description: err.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // Count condominios without address on mount
  useEffect(() => {
    const countPending = async () => {
      const { count: countNaoCadastrado } = await supabase
        .from("condominios_mapeamento")
        .select("id", { count: "exact", head: true })
        .like("logradouro_padrao", "%não cadastrado%")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      const { count: countNaoLocalizado } = await supabase
        .from("condominios_mapeamento")
        .select("id", { count: "exact", head: true })
        .eq("logradouro_padrao", "Endereço não localizado via coordenadas")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      setPendingSemEndereco((countNaoCadastrado ?? 0) + (countNaoLocalizado ?? 0));
    };
    countPending();
  }, [isReversing]);

  const runReverseGeocode = async () => {
    setIsReversing(true);
    let totalResolvidos = 0;
    let continuar = true;

    try {
      while (continuar) {
        const { data, error } = await supabase.functions.invoke("reverse-geocode-condominios", {});
        if (error) throw error;

        totalResolvidos += data.resolvidos;
        setReverseProgress({
          resolvidos: totalResolvidos,
          total: totalResolvidos + data.pendentes,
        });

        continuar = data.proxima_chamada_necessaria;

        if (continuar) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      toast({
        title: "Endereços resolvidos",
        description: `${totalResolvidos} endereços identificados via geocodificação reversa.`,
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsReversing(false);
      setReverseProgress(null);
    }
  };

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
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          onClick={exportCondominiosCSV}
          className="gap-2"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Exportar CSV
        </Button>
      </div>

      {/* IPTU 2025 */}
      <div className="border border-border rounded-lg p-4">
        <IPTU2025Upload />
      </div>

      {/* Reverse Geocoding */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Search className="h-4 w-4" />
          Resolver Endereços Pendentes
        </h4>
        <p className="text-xs text-muted-foreground">
          {pendingSemEndereco != null
            ? `${pendingSemEndereco} condomínios sem endereço (com coordenadas)`
            : "Verificando..."}
        </p>
        {reverseProgress && (
          <div className="space-y-1">
            <Progress
              value={reverseProgress.total > 0
                ? (reverseProgress.resolvidos / reverseProgress.total) * 100
                : 0}
            />
            <p className="text-xs text-muted-foreground">
              Resolvendo {reverseProgress.resolvidos}/{reverseProgress.total}...
            </p>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={isReversing || (pendingSemEndereco ?? 0) === 0}
          onClick={runReverseGeocode}
          className="gap-2"
        >
          {isReversing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {isReversing ? "Processando..." : "Resolver Endereços Pendentes"}
        </Button>
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
