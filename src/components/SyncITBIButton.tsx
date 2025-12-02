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
import { useQueryClient } from "@tanstack/react-query";

export const SyncITBIButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [clearExisting, setClearExisting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setIsLoading(true);
    try {
      console.log("Iniciando sincronização com API da Prefeitura...");

      const { data, error } = await supabase.functions.invoke("sync-itbi-prefeitura", {
        body: {
          clearExisting: clearExisting,
          bairro: "BARRA DA TIJUCA",
        },
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
        await queryClient.invalidateQueries({ queryKey: ['microbairro-ranking'] });
        await queryClient.invalidateQueries({ queryKey: ['microbairro-detalhado'] });
        await queryClient.invalidateQueries({ queryKey: ['evolution-data'] });

        toast({
          title: "Sincronização concluída!",
          description: `${data.transacoes_inseridas} transações importadas da API da Prefeitura.`,
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
          <AlertDialogDescription className="space-y-4">
            <p>Esta ação irá buscar transações de ITBI diretamente da API da Prefeitura do Rio de Janeiro:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Filtrar por Barra da Tijuca</li>
              <li>Importar novas transações</li>
              <li>Classificar tipologia (Apartamento/Casa)</li>
              <li>Calcular valor por m²</li>
            </ul>
            
            <div className="flex items-center space-x-2 mt-4 p-3 bg-muted rounded-md">
              <Checkbox
                id="clearExisting"
                checked={clearExisting}
                onCheckedChange={(checked) => setClearExisting(!!checked)}
              />
              <Label htmlFor="clearExisting" className="text-sm text-foreground cursor-pointer">
                Limpar dados existentes antes de importar
              </Label>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Fonte: pgeo3.rio.rj.gov.br - API ArcGIS ITBI
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleSync} className="bg-primary">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Iniciar Sincronização
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
