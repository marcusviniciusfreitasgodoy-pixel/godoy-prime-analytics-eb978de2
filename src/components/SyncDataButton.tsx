import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export const SyncDataButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsLoading(true);
    try {
      console.log("Iniciando sincronização de dados...");

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase.functions.invoke("sync-tables", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Erro ao sincronizar:", error);
        throw error;
      }

      console.log("Resposta da sincronização:", data);

      if (data.success) {
        toast({
          title: "Sincronização concluída!",
          description: `${data.condominios_synced} condomínios e ${data.weights_synced} pesos importados com sucesso.`,
          variant: "default",
        });
      } else {
        throw new Error(data.error || "Erro desconhecido na sincronização");
      }
    } catch (error) {
      console.error("Erro na sincronização:", error);
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Não foi possível sincronizar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
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
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sincronizar Cadastros
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs">
              <strong>Sincroniza tabelas de apoio:</strong> Importa mapeamento de condomínios e pesos de avaliação do projeto fonte. Não afeta transações ITBI.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Confirmar Sincronização
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>Esta ação irá:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Remover todos os dados atuais das tabelas de condomínios e pesos de avaliação</li>
              <li>Importar dados do projeto fonte configurado no servidor</li>
              <li>Substituir completamente os dados existentes</li>
            </ul>
            <p className="font-semibold mt-4">Tem certeza que deseja continuar?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleSync} className="bg-primary">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Confirmar Sincronização
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
