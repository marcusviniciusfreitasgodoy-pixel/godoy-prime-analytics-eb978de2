import { useState, useEffect } from "react";
import { Loader2, Play, Database, Building2, Map, Cpu, MapPin, Route, Search, Download, ChevronDown, Upload, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEtlLogs, useCoverageStats } from "@/hooks/useTerritorialData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { IPTU2025Upload } from "./IPTU2025Upload";
import { ImportarCondominios } from "./ImportarCondominios";
import { EnriquecerCondominios } from "./EnriquecerCondominios";
import { AtualizarLogradouros } from "./AtualizarLogradouros";
import { MergeCondominiosButton } from "@/components/MergeCondominiosButton";
import { RetroGeocodingPanel } from "./RetroGeocodingPanel";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-500",
  running: "bg-blue-500",
  error: "bg-red-500",
  partial: "bg-yellow-500",
};

type ActionItem = {
  step: number;
  label: string;
  fn: string;
  icon: React.ElementType;
  tooltip: string;
};

const INGESTAO_ACTIONS: ActionItem[] = [
  { step: 2, label: "Ingestão IPTU (ArcGIS)", fn: "ingest-iptu-prefeitura", icon: Database, tooltip: "Puxa resumos de logradouros (tipologia, total imóveis, área) da camada IPTU da Prefeitura RJ." },
  { step: 3, label: "Ingestão Lotes (ArcGIS)", fn: "ingest-lotes-pal", icon: Map, tooltip: "Baixa polígonos de lotes (terrenos) da Barra da Tijuca via GeoPAL." },
  { step: 4, label: "Ingestão Edificações (ArcGIS)", fn: "ingest-edificacoes-geo", icon: Building2, tooltip: "Importa contornos de edificações com altura, andares e tipo (ArcGIS 2019)." },
];

const PROCESSAMENTO_ACTIONS: ActionItem[] = [
  { step: 7, label: "Rodar Algoritmo (PAL)", fn: "process-condominios-algorithm", icon: Cpu, tooltip: "Cruza ITBI + IPTU + edificações para identificar condomínios e calcular preço médio/m², torres e unidades." },
  { step: 8, label: "Geocodificar ITBI (Google)", fn: "geocodificar-itbi-transactions", icon: MapPin, tooltip: "Adiciona lat/lng às transações ITBI sem coordenadas via Google Geocoding API." },
  { step: 9, label: "Enriquecer Condomínios (Google Places)", fn: "enrich-condominios", icon: Search, tooltip: "Busca place_id, coordenadas e endereço formatado via Google Places API (New)." },
  { step: 11, label: "Enriquecer Logradouros (Google Geocoding)", fn: "enrich-logradouros-geo", icon: Route, tooltip: "Geocodifica nomes de ruas sem coordenadas em logradouros_geo via Google Geocoding API." },
];

const QUALIDADE_ACTIONS: ActionItem[] = [
  { step: 13, label: "Enriquecer Detalhes (Places Details)", fn: "enrich-places-details", icon: Building2, tooltip: "Busca tipos, rating, fotos e resumo editorial via Places API (New) para condomínios com place_id." },
];

function SectionHeader({ title, description, open, icon: Icon }: { title: string; description: string; open: boolean; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 w-full py-2">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0", open && "rotate-180")} />
    </div>
  );
}

function ActionButton({ action, running, onClick }: { action: ActionItem; running: string | null; onClick: (fn: string) => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={running !== null}
          onClick={() => onClick(action.fn)}
          className="gap-2 justify-start"
        >
          {running === action.fn ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <action.icon className="h-4 w-4" />
          )}
          <span className="text-xs text-muted-foreground font-mono mr-1">⑥</span>
          {action.label}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{action.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function StepButton({ action, running, onClick }: { action: ActionItem; running: string | null; onClick: (fn: string) => void }) {
  const circled = ["⓪","①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩","⑪","⑫","⑬","⑭","⑮"];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={running !== null}
          onClick={() => onClick(action.fn)}
          className="gap-2 justify-start h-auto py-2"
        >
          {running === action.fn ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <action.icon className="h-4 w-4 shrink-0" />
          )}
          <span className="text-xs text-muted-foreground font-mono shrink-0">{circled[action.step] || action.step}</span>
          <span className="text-left">{action.label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{action.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function TerritorialAdmin() {
  const { data: logs, isLoading } = useEtlLogs();
  const { data: coverage } = useCoverageStats();
  const { toast } = useToast();
  const [running, setRunning] = useState<string | null>(null);
  const [reverseProgress, setReverseProgress] = useState<{ resolvidos: number; total: number } | null>(null);
  const [isReversing, setIsReversing] = useState(false);
  const [pendingSemEndereco, setPendingSemEndereco] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [openIngestao, setOpenIngestao] = useState(false);
  const [openProcessamento, setOpenProcessamento] = useState(false);
  const [openQualidade, setOpenQualidade] = useState(false);

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

  useEffect(() => {
    const countPending = async () => {
      const { count: countNaoCadastrado } = await supabase
        .from("condominios_mapeamento")
        .select("id", { count: "exact", head: true })
        .eq("ativo", true)
        .like("logradouro_padrao", "%não cadastrado%")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      const { count: countNaoLocalizado } = await supabase
        .from("condominios_mapeamento")
        .select("id", { count: "exact", head: true })
        .eq("ativo", true)
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
    let iteracoes = 0;
    const MAX_ITERACOES = 20;

    try {
      while (continuar && iteracoes < MAX_ITERACOES) {
        iteracoes++;
        const { data, error } = await supabase.functions.invoke("reverse-geocode-condominios", {});
        if (error) throw error;

        totalResolvidos += data.resolvidos;
        setReverseProgress({
          resolvidos: totalResolvidos,
          total: totalResolvidos + data.pendentes,
        });

        continuar = data.proxima_chamada_necessaria;
        if (continuar) await new Promise((r) => setTimeout(r, 2000));
      }

      const msg = iteracoes >= MAX_ITERACOES && continuar
        ? `${totalResolvidos} endereços resolvidos. Limite de iterações atingido — execute novamente para continuar.`
        : `${totalResolvidos} endereços identificados via geocodificação reversa.`;

      toast({ title: "Endereços resolvidos", description: msg });
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
        : fnName === "geocodificar-itbi-transactions"
        ? { bairro: "BARRA DA TIJUCA", limite: 500 }
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
    <div className="space-y-6 p-4">
      <h3 className="text-lg font-bold text-foreground">Administração Territorial</h3>

      {/* Coverage Cards */}
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

      <TooltipProvider delayDuration={300}>
        {/* ═══════ SEÇÃO 1 — INGESTÃO ═══════ */}
        <Collapsible open={openIngestao} onOpenChange={setOpenIngestao}>
          <div className="border border-border rounded-lg overflow-hidden">
            <CollapsibleTrigger className="w-full px-4 hover:bg-muted/50 transition-colors">
              <SectionHeader
                title="Seção 1 — Ingestão"
                description="Fontes externas → banco de dados (IPTU, ArcGIS, CSV, Merge)"
                open={openIngestao}
                icon={Database}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                {/* ① Upload IPTU 2025 */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">① Upload IPTU 2025</p>
                  <IPTU2025Upload />
                </div>

                {/* ②③④ ArcGIS Actions */}
                <div className="flex flex-wrap gap-2">
                  {INGESTAO_ACTIONS.map((action) => (
                    <StepButton key={action.fn} action={action} running={running} onClick={invokeAction} />
                  ))}
                </div>

                {/* ⑤ Importar Condomínios (CSV/texto) */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">⑤ Importar Condomínios (CSV/texto)</p>
                  <ImportarCondominios />
                </div>

                {/* ⑥ Merge CSV Condomínios */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">⑥ Merge CSV Condomínios</p>
                    <p className="text-[11px] text-muted-foreground">Mesclar novos condomínios preservando os existentes</p>
                  </div>
                  <MergeCondominiosButton />
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* ═══════ SEÇÃO 2 — PROCESSAMENTO ═══════ */}
        <Collapsible open={openProcessamento} onOpenChange={setOpenProcessamento}>
          <div className="border border-border rounded-lg overflow-hidden">
            <CollapsibleTrigger className="w-full px-4 hover:bg-muted/50 transition-colors">
              <SectionHeader
                title="Seção 2 — Processamento"
                description="Cruzamentos, geocodificação e enriquecimento de coordenadas"
                open={openProcessamento}
                icon={Cpu}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                {/* ⑦⑧⑨⑪ Processing buttons */}
                <div className="flex flex-wrap gap-2">
                  {PROCESSAMENTO_ACTIONS.map((action) => (
                    <StepButton key={action.fn} action={action} running={running} onClick={invokeAction} />
                  ))}
                </div>

                {/* Enriquecer Registros Manuais */}
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                    <Database className="h-3.5 w-3.5" />
                    Enriquecer Registros Manuais (ITBI)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Executa apenas o join espacial ITBI nos condomínios que ainda não possuem preço/m² — sem limpar registros existentes.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={running !== null}
                    onClick={async () => {
                      setRunning("enrich-only");
                      try {
                        const { data, error } = await supabase.functions.invoke("process-condominios-algorithm", {
                          body: { enrich_only: true },
                        });
                        if (error) throw error;
                        toast({
                          title: "Enriquecimento concluído",
                          description: `${data?.condominios_com_itbi ?? 0} condomínios atualizados com dados ITBI.`,
                        });
                      } catch (err: any) {
                        toast({ title: "Erro", description: err.message, variant: "destructive" });
                      } finally {
                        setRunning(null);
                      }
                    }}
                    className="gap-2"
                  >
                    {running === "enrich-only" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                    {running === "enrich-only" ? "Enriquecendo..." : "Enriquecer Registros Manuais"}
                  </Button>
                </div>

                {/* ⑩ Reverse Geocode */}
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                    <Search className="h-3.5 w-3.5" />
                    ⑩ Resolver Endereços Pendentes (reverse geocode)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
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
                    {isReversing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {isReversing ? "Processando..." : "Resolver Endereços Pendentes"}
                  </Button>
                </div>

                {/* Geocodificação Retroativa ITBI (lote por bairro) */}
                <div className="border border-border rounded-lg p-4">
                  <RetroGeocodingPanel />
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* ═══════ SEÇÃO 3 — QUALIDADE ═══════ */}
        <Collapsible open={openQualidade} onOpenChange={setOpenQualidade}>
          <div className="border border-border rounded-lg overflow-hidden">
            <CollapsibleTrigger className="w-full px-4 hover:bg-muted/50 transition-colors">
              <SectionHeader
                title="Seção 3 — Qualidade"
                description="Refinamento com IA, detalhes Google, correções de logradouros"
                open={openQualidade}
                icon={Sparkles}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                {/* ⑫ Classificação IA (Gemini) */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">⑫ Classificação IA (Gemini)</p>
                  <EnriquecerCondominios />
                </div>

                {/* ⑬ Enriquecer Detalhes */}
                <div className="flex flex-wrap gap-2">
                  {QUALIDADE_ACTIONS.map((action) => (
                    <StepButton key={action.fn} action={action} running={running} onClick={invokeAction} />
                  ))}
                </div>

                {/* ⑭ Atualizar Logradouros (fuzzy match) */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">⑭ Atualizar Logradouros (fuzzy match)</p>
                  <AtualizarLogradouros />
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </TooltipProvider>

      {/* Export CSV */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          onClick={exportCondominiosCSV}
          className="gap-2"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar CSV
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
