import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle2, AlertCircle, Database } from "lucide-react";
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

export const SyncITBIButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [clearExisting, setClearExisting] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => (currentYear - i).toString());

  const handleSync = async () => {
    setIsLoading(true);
    try {
      // Obter sessão do usuário para autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Você precisa estar logado para executar esta ação');
      }

      console.log(`Iniciando sincronização de TODOS os bairros: ano ${selectedYear}, limpar=${clearExisting}`);

      const { data, error } = await supabase.functions.invoke("sync-itbi-prefeitura", {
        body: {
          clearExisting: clearExisting,
          // Sem codbairro = buscar TODOS os bairros do Rio
          minYear: parseInt(selectedYear),
          maxYear: parseInt(selectedYear),
          onlyResidencial: false,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error("Erro ao sincronizar:", error);
        throw error;
      }

      console.log("Resposta da sincronização:", data);

      if (data.success) {
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
        throw new Error(data.error || "Erro desconhecido na sincronização");
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Não foi possível sincronizar os dados da Prefeitura.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
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
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Sincronizar Dados ITBI
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
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
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleSync} className="bg-primary">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Sincronizar {selectedYear}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
