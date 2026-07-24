import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle2, AlertCircle, Database, Loader2, Calendar, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SyncStage = 'idle' | 'checking' | 'connecting' | 'fetching' | 'processing' | 'inserting' | 'complete' | 'error';

const STAGE_LABELS: Record<SyncStage, string> = {
  idle: '',
  checking: 'Verificando dados existentes...',
  connecting: 'Conectando à API da Prefeitura...',
  fetching: 'Buscando dados de todos os bairros...',
  processing: 'Processando e validando registros...',
  inserting: 'Inserindo no banco de dados...',
  complete: 'Sincronização concluída!',
  error: 'Erro na sincronização',
};

const STAGE_PROGRESS: Record<SyncStage, number> = {
  idle: 0,
  checking: 5,
  connecting: 10,
  fetching: 30,
  processing: 60,
  inserting: 85,
  complete: 100,
  error: 0,
};

const MONTHS = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

interface MonthStatus {
  month: number;
  count: number;
  transactions: number;
}

export const SyncITBIButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [clearExisting, setClearExisting] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [minMonth, setMinMonth] = useState('1');
  const [maxMonth, setMaxMonth] = useState('12');
  const [stage, setStage] = useState<SyncStage>('idle');
  const [existingMonths, setExistingMonths] = useState<MonthStatus[]>([]);
  const [isCheckingMonths, setIsCheckingMonths] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    registros_inseridos?: number;
    total_transacoes_reais?: number;
  } | null>(null);
  const [mode, setMode] = useState<'ano' | 'backfill' | 'ultimo'>('ano');
  const [latestInfo, setLatestInfo] = useState<{
    api: { year: number | null; month: number | null };
    db: { year: number | null; month: number | null };
    isOutdated: boolean;
  } | null>(null);
  const [isDetectingLatest, setIsDetectingLatest] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    currentYear: number;
    totalYears: number;
    yearLabel: string;
    accumInseridos: number;
    accumTransacoes: number;
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => (currentYear - i).toString());

  // Detecta o último mês publicado na API da Prefeitura ao abrir o diálogo
  const detectLatest = async () => {
    setIsDetectingLatest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const { data, error } = await supabase.functions.invoke('detect-latest-itbi-month', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.success) {
        setLatestInfo({ api: data.api, db: data.db, isOutdated: data.isOutdated });
      }
    } catch (e) {
      console.error('[detect-latest-itbi-month]', e);
    } finally {
      setIsDetectingLatest(false);
    }
  };

  // Verificar meses existentes quando ano mudar
  useEffect(() => {
    const checkExistingMonths = async () => {
      setIsCheckingMonths(true);
      try {
        const { data, error } = await supabase
          .from('itbi_transactions')
          .select('data_transacao, total_transacoes')
          .gte('data_transacao', `${selectedYear}-01-01`)
          .lte('data_transacao', `${selectedYear}-12-31`)
          .limit(5000);

        if (error) throw error;

        // Agrupar por mês
        const monthMap = new Map<number, { count: number; transactions: number }>();
        data?.forEach(t => {
          const month = new Date(t.data_transacao).getMonth() + 1;
          const existing = monthMap.get(month) || { count: 0, transactions: 0 };
          monthMap.set(month, {
            count: existing.count + 1,
            transactions: existing.transactions + (t.total_transacoes || 1)
          });
        });

        const months: MonthStatus[] = [];
        for (let m = 1; m <= 12; m++) {
          const data = monthMap.get(m);
          months.push({
            month: m,
            count: data?.count || 0,
            transactions: data?.transactions || 0
          });
        }
        setExistingMonths(months);
      } catch (error) {
        console.error('Erro ao verificar meses:', error);
      } finally {
        setIsCheckingMonths(false);
      }
    };

    if (stage === 'idle') {
      checkExistingMonths();
    }
  }, [selectedYear, stage]);

  const getMissingMonths = () => {
    return existingMonths.filter(m => m.count === 0).map(m => m.month);
  };

  const getTotalExisting = () => {
    return existingMonths.reduce((sum, m) => sum + m.count, 0);
  };

  const getTotalTransactions = () => {
    return existingMonths.reduce((sum, m) => sum + m.transactions, 0);
  };

  const handleSync = async () => {
    setIsLoading(true);
    setStage('connecting');
    setSyncResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Você precisa estar logado para executar esta ação');
      }

      setStage('fetching');

      // Simular progresso enquanto aguarda resposta
      const progressInterval = setInterval(() => {
        setStage(prev => {
          if (prev === 'fetching') return 'processing';
          if (prev === 'processing') return 'inserting';
          return prev;
        });
      }, 8000);

      console.log(`Sincronização: ano ${selectedYear}, meses ${minMonth}-${maxMonth}, limpar=${clearExisting}`);

      const { data, error } = await supabase.functions.invoke("sync-itbi-prefeitura", {
        body: {
          clearExisting: clearExisting,
          minYear: parseInt(selectedYear),
          maxYear: parseInt(selectedYear),
          minMonth: parseInt(minMonth),
          maxMonth: parseInt(maxMonth),
          onlyResidencial: false,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      clearInterval(progressInterval);

      if (error) {
        console.error("Erro ao sincronizar:", error);
        setStage('error');
        throw error;
      }

      console.log("Resposta da sincronização:", data);

      if (data.success) {
        setStage('complete');
        setSyncResult({
          registros_inseridos: data.registros_inseridos,
          total_transacoes_reais: data.total_transacoes_reais,
        });

        // Invalidar TODAS as queries relacionadas a dados ITBI para forçar refetch
        console.log('[SyncITBI] Invalidando todas as queries de dados...');
        
        // Usar invalidação parcial para capturar todas as versões de queryKeys
        await queryClient.invalidateQueries({ predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('itbi') || 
                 key?.includes('kpi') || 
                 key?.includes('microbairro') || 
                 key?.includes('evolution') ||
                 key?.includes('transaction') ||
                 key?.includes('ranking');
        }});
        
        // Forçar refetch das queries principais
        await queryClient.refetchQueries({ queryKey: ['kpi-stats-detailed-v5'] });
        
        console.log('[SyncITBI] Queries invalidadas com sucesso');
        toast({
          title: "Sincronização concluída!",
          description: `${data.registros_inseridos} registros (${data.total_transacoes_reais} transações) importados para ${selectedYear}.`,
          variant: "default",
        });
      } else {
        setStage('error');
        throw new Error(data.error || "Erro desconhecido na sincronização");
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
      setStage('error');
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Não foi possível sincronizar os dados da Prefeitura.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0] as string;
      return key?.includes('itbi') ||
             key?.includes('kpi') ||
             key?.includes('microbairro') ||
             key?.includes('evolution') ||
             key?.includes('transaction') ||
             key?.includes('ranking');
    }});
    await queryClient.refetchQueries({ queryKey: ['kpi-stats-detailed-v5'] });
  };

  const syncSingleYear = async (
    year: number,
    minM: number,
    maxM: number,
    clear: boolean,
    accessToken: string,
  ) => {
    const { data, error } = await supabase.functions.invoke("sync-itbi-prefeitura", {
      body: {
        clearExisting: clear,
        minYear: year,
        maxYear: year,
        minMonth: minM,
        maxMonth: maxM,
        onlyResidencial: false,
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || `Falha em ${year}`);
    return {
      inseridos: Number(data.registros_inseridos || 0),
      transacoes: Number(data.total_transacoes_reais || 0),
    };
  };

  const handleBackfill = async () => {
    setIsLoading(true);
    setStage('fetching');
    setSyncResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Você precisa estar logado');

      const startYear = 2020;
      const endYear = currentYear;
      const totalYears = endYear - startYear + 1;
      let accumInseridos = 0;
      let accumTransacoes = 0;

      for (let i = 0; i < totalYears; i++) {
        const year = startYear + i;
        setBatchProgress({
          currentYear: i + 1,
          totalYears,
          yearLabel: String(year),
          accumInseridos,
          accumTransacoes,
        });
        console.log(`[Backfill] Sincronizando ${year} (${i + 1}/${totalYears})...`);
        const result = await syncSingleYear(year, 1, 12, clearExisting, session.access_token);
        accumInseridos += result.inseridos;
        accumTransacoes += result.transacoes;
      }

      setStage('complete');
      setSyncResult({
        registros_inseridos: accumInseridos,
        total_transacoes_reais: accumTransacoes,
      });
      setBatchProgress(null);
      await invalidateAll();

      toast({
        title: 'Backfill concluído',
        description: `${accumInseridos.toLocaleString('pt-BR')} registros (${accumTransacoes.toLocaleString('pt-BR')} transações) importados de ${startYear} a ${endYear}.`,
      });
    } catch (error) {
      console.error('Erro no backfill:', error);
      setStage('error');
      toast({
        title: 'Erro no backfill',
        description: error instanceof Error ? error.message : 'Falha ao sincronizar múltiplos anos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUltimoMes = async () => {
    setIsLoading(true);
    setStage('fetching');
    setSyncResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Você precisa estar logado');

      // Sincroniza o mês corrente E o mês anterior (para pegar dados
      // publicados com atraso pela Prefeitura). Sempre com clearExisting=true
      // no período para garantir dados atualizados.
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      let accumInseridos = 0;
      let accumTransacoes = 0;

      // Se mês anterior está em outro ano, faz duas chamadas separadas
      if (prevYear !== currentYear) {
        const r1 = await syncSingleYear(prevYear, prevMonth, 12, true, session.access_token);
        const r2 = await syncSingleYear(currentYear, 1, currentMonth, true, session.access_token);
        accumInseridos = r1.inseridos + r2.inseridos;
        accumTransacoes = r1.transacoes + r2.transacoes;
      } else {
        const r = await syncSingleYear(currentYear, prevMonth, currentMonth, true, session.access_token);
        accumInseridos = r.inseridos;
        accumTransacoes = r.transacoes;
      }

      setStage('complete');
      setSyncResult({
        registros_inseridos: accumInseridos,
        total_transacoes_reais: accumTransacoes,
      });
      await invalidateAll();

      toast({
        title: 'Último mês atualizado',
        description: `${accumInseridos.toLocaleString('pt-BR')} registros (${accumTransacoes.toLocaleString('pt-BR')} transações) do período recente.`,
      });
    } catch (error) {
      console.error('Erro ao atualizar último mês:', error);
      setStage('error');
      toast({
        title: 'Erro na atualização',
        description: error instanceof Error ? error.message : 'Falha ao atualizar o mês corrente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setStage('idle');
    setSyncResult(null);
    setBatchProgress(null);
  };

  const missingMonths = getMissingMonths();
  const monthRangeLabel = minMonth === '1' && maxMonth === '12' 
    ? 'Ano completo' 
    : `${MONTHS[parseInt(minMonth) - 1]?.label} a ${MONTHS[parseInt(maxMonth) - 1]?.label}`;

  return (
    <AlertDialog onOpenChange={(open) => {
      if (!open) resetState();
      else detectLatest();
    }}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Sincronizar Dados Oficiais
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs">
              <strong>Importa transações oficiais:</strong> Busca dados diretamente da API da Prefeitura do RJ. Atualiza valores de mercado, KPIs e rankings.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {stage === 'complete' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : stage === 'error' ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Calendar className="h-5 w-5 text-accent" />
            )}
            {stage === 'complete' ? 'Sincronização Concluída' : 
             stage === 'error' ? 'Erro na Sincronização' : 
             'Sincronizar Transações Oficiais'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Progress UI durante sincronização */}
              {isLoading && (
                <div className="space-y-3 py-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {batchProgress
                        ? `Sincronizando ${batchProgress.yearLabel} (${batchProgress.currentYear}/${batchProgress.totalYears})...`
                        : STAGE_LABELS[stage]}
                    </span>
                  </div>
                  <Progress
                    value={
                      batchProgress
                        ? Math.round(((batchProgress.currentYear - 1) / batchProgress.totalYears) * 100)
                        : STAGE_PROGRESS[stage]
                    }
                    className="h-2"
                  />
                  {batchProgress && (
                    <p className="text-xs text-muted-foreground">
                      Acumulado: {batchProgress.accumInseridos.toLocaleString('pt-BR')} registros •{' '}
                      {batchProgress.accumTransacoes.toLocaleString('pt-BR')} transações
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {batchProgress
                      ? 'O backfill roda ano a ano. Não feche esta janela.'
                      : 'Isso pode levar alguns minutos dependendo do volume de dados...'}
                  </p>
                </div>
              )}

              {/* Resultado final */}
              {stage === 'complete' && syncResult && (
                <div className="py-4 space-y-3">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Registros importados:</span>
                      <span className="font-semibold text-foreground">{syncResult.registros_inseridos?.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Transações reais:</span>
                      <span className="font-semibold text-foreground">{syncResult.total_transacoes_reais?.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Período:</span>
                      <span className="font-semibold text-foreground">{monthRangeLabel} {selectedYear}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Os KPIs e gráficos foram atualizados automaticamente.
                  </p>
                </div>
              )}

              {/* Formulário inicial */}
              {stage === 'idle' && (
                <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="ano" className="text-xs">Ano específico</TabsTrigger>
                    <TabsTrigger value="backfill" className="text-xs">Backfill completo</TabsTrigger>
                    <TabsTrigger value="ultimo" className="text-xs">Último mês</TabsTrigger>
                  </TabsList>

                  <TabsContent value="ano" className="space-y-4 mt-4">
                  {/* Status do ano selecionado */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Status {selectedYear}:</span>
                      {isCheckingMonths ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {getTotalExisting().toLocaleString('pt-BR')} registros ({getTotalTransactions().toLocaleString('pt-BR')} transações)
                        </span>
                      )}
                    </div>
                    
                    {!isCheckingMonths && (
                      <div className="flex flex-wrap gap-1">
                        {existingMonths.map(m => (
                          <Badge 
                            key={m.month} 
                            variant={m.count > 0 ? "default" : "outline"}
                            className={`text-[10px] px-1.5 py-0 ${m.count > 0 ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'text-muted-foreground'}`}
                          >
                            {MONTHS[m.month - 1]?.label.slice(0, 3)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {missingMonths.length > 0 && !isCheckingMonths && (
                      <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/10 rounded p-2 mt-2">
                        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>
                          Meses sem dados: {missingMonths.map(m => MONTHS[m - 1]?.label.slice(0, 3)).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Seleção de ano */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Ano</Label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o ano" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Seleção de intervalo de meses */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Mês inicial</Label>
                        <Select value={minMonth} onValueChange={setMinMonth}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((month) => (
                              <SelectItem key={month.value} value={month.value}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Mês final</Label>
                        <Select value={maxMonth} onValueChange={setMaxMonth}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.filter(m => parseInt(m.value) >= parseInt(minMonth)).map((month) => (
                              <SelectItem key={month.value} value={month.value}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                      <Checkbox
                        id="clearExisting"
                        checked={clearExisting}
                        onCheckedChange={(checked) => setClearExisting(!!checked)}
                      />
                      <Label htmlFor="clearExisting" className="text-sm text-foreground cursor-pointer">
                        Limpar dados do período antes de importar
                      </Label>
                    </div>
                  </div>

                  <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                    <li>Filtro: percentual transferido ≥ 90%</li>
                    <li>Classifica: Residencial/Comercial, Apto/Casa</li>
                    <li>Calcula: valor/m² automático</li>
                  </ul>

                  <p className="text-xs text-muted-foreground">
                    Fonte: pgeo3.rio.rj.gov.br/arcgis - API Oficial Prefeitura RJ
                  </p>
                  </TabsContent>

                  <TabsContent value="backfill" className="space-y-4 mt-4">
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Database className="h-4 w-4 text-accent" />
                        Backfill completo: 2020 até {currentYear}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Sincroniza {currentYear - 2019} anos sequencialmente, um por vez, evitando estourar o limite de 50 mil registros por execução. Use esta opção apenas na primeira carga ou quando precisar refazer todo o histórico.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                      <Checkbox
                        id="clearExistingBackfill"
                        checked={clearExisting}
                        onCheckedChange={(checked) => setClearExisting(!!checked)}
                      />
                      <Label htmlFor="clearExistingBackfill" className="text-sm text-foreground cursor-pointer">
                        Limpar dados existentes de cada ano antes de importar
                      </Label>
                    </div>

                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                      <li>Duração estimada: 5 a 15 minutos</li>
                      <li>Não feche esta janela durante a execução</li>
                      <li>Ao final, KPIs e rankings são atualizados automaticamente</li>
                    </ul>
                  </TabsContent>

                  <TabsContent value="ultimo" className="space-y-4 mt-4">
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Calendar className="h-4 w-4 text-accent" />
                        Atualização incremental
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Sincroniza apenas o mês corrente ({MONTHS[currentMonth - 1]?.label} {currentYear}) e o mês anterior, para capturar registros publicados com atraso pela Prefeitura. Ideal para rodar todo mês após o backfill inicial.
                      </p>
                    </div>

                    <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                      <li>Duração estimada: 30 a 90 segundos</li>
                      <li>Sobrescreve o período recente com os dados mais atuais</li>
                      <li>Não afeta anos anteriores</li>
                    </ul>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {stage === 'complete' ? (
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          ) : stage === 'error' ? (
            <>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { resetState(); }} className="bg-primary">
                Tentar Novamente
              </AlertDialogAction>
            </>
          ) : !isLoading ? (
            <>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              {mode === 'ano' && (
                <AlertDialogAction onClick={handleSync} className="bg-primary">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Sincronizar {monthRangeLabel} {selectedYear}
                </AlertDialogAction>
              )}
              {mode === 'backfill' && (
                <AlertDialogAction onClick={handleBackfill} className="bg-primary">
                  <Database className="mr-2 h-4 w-4" />
                  Rodar backfill 2020 – {currentYear}
                </AlertDialogAction>
              )}
              {mode === 'ultimo' && (
                <AlertDialogAction onClick={handleUltimoMes} className="bg-primary">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar último mês
                </AlertDialogAction>
              )}
            </>
          ) : (
            <AlertDialogCancel disabled>Aguarde...</AlertDialogCancel>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
