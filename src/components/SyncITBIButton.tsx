import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle2, AlertCircle, Database, Loader2 } from "lucide-react";
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

type SyncStage = 'idle' | 'connecting' | 'fetching' | 'processing' | 'inserting' | 'complete' | 'error';

const STAGE_LABELS: Record<SyncStage, string> = {
  idle: '',
  connecting: 'Conectando à API da Prefeitura...',
  fetching: 'Buscando dados de todos os bairros...',
  processing: 'Processando e validando registros...',
  inserting: 'Inserindo no banco de dados...',
  complete: 'Sincronização concluída!',
  error: 'Erro na sincronização',
};

const STAGE_PROGRESS: Record<SyncStage, number> = {
  idle: 0,
  connecting: 10,
  fetching: 30,
  processing: 60,
  inserting: 85,
  complete: 100,
  error: 0,
};

export const SyncITBIButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [clearExisting, setClearExisting] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [stage, setStage] = useState<SyncStage>('idle');
  const [syncResult, setSyncResult] = useState<{
    registros_inseridos?: number;
    total_transacoes_reais?: number;
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => (currentYear - i).toString());

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

      console.log(`Iniciando sincronização de TODOS os bairros: ano ${selectedYear}, limpar=${clearExisting}`);

      const { data, error } = await supabase.functions.invoke("sync-itbi-prefeitura", {
        body: {
          clearExisting: clearExisting,
          minYear: parseInt(selectedYear),
          maxYear: parseInt(selectedYear),
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

        // Invalidar queries para atualizar dados na tela
        await queryClient.invalidateQueries({ queryKey: ['itbi-transactions'] });
        await queryClient.invalidateQueries({ queryKey: ['kpi-stats'] });
        await queryClient.invalidateQueries({ queryKey: ['kpi-stats-detailed'] });
        await queryClient.invalidateQueries({ queryKey: ['microbairro-ranking'] });
        await queryClient.invalidateQueries({ queryKey: ['microbairro-detalhado'] });
        await queryClient.invalidateQueries({ queryKey: ['evolution-data'] });

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

  const resetState = () => {
    setStage('idle');
    setSyncResult(null);
  };

  return (
    <AlertDialog onOpenChange={(open) => !open && resetState()}>
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
              Atualizar ITBI
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {stage === 'complete' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : stage === 'error' ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            {stage === 'complete' ? 'Sincronização Concluída' : 
             stage === 'error' ? 'Erro na Sincronização' : 
             'Sincronizar Dados ITBI'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Progress UI durante sincronização */}
              {isLoading && (
                <div className="space-y-3 py-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {STAGE_LABELS[stage]}
                    </span>
                  </div>
                  <Progress value={STAGE_PROGRESS[stage]} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Isso pode levar alguns minutos dependendo do volume de dados...
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
                      <span className="text-sm text-muted-foreground">Ano:</span>
                      <span className="font-semibold text-foreground">{selectedYear}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Os KPIs e gráficos foram atualizados automaticamente.
                  </p>
                </div>
              )}

              {/* Formulário inicial */}
              {stage === 'idle' && (
                <>
                  <p>Buscar transações de ITBI da API da Prefeitura do Rio de Janeiro para <strong>todos os bairros</strong>:</p>
                  
                  <div className="space-y-3">
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
                    
                    <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                      <Checkbox
                        id="clearExisting"
                        checked={clearExisting}
                        onCheckedChange={(checked) => setClearExisting(!!checked)}
                      />
                      <Label htmlFor="clearExisting" className="text-sm text-foreground cursor-pointer">
                        Limpar dados do ano antes de importar
                      </Label>
                    </div>
                  </div>

                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Filtro: percentual transferido ≥ 90%</li>
                    <li>Classifica: Residencial/Comercial, Apto/Casa</li>
                    <li>Calcula: valor/m² automático</li>
                  </ul>

                  <p className="text-xs text-muted-foreground">
                    Fonte: pgeo3.rio.rj.gov.br/arcgis - API ITBI Prefeitura RJ
                  </p>
                </>
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
              <AlertDialogAction onClick={handleSync} className="bg-primary">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Sincronizar {selectedYear}
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogCancel disabled>Aguarde...</AlertDialogCancel>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
