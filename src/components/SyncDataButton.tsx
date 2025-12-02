import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckCircle2, AlertCircle, Settings } from "lucide-react";
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

const STORAGE_KEY_URL = "sync_source_url";
const STORAGE_KEY_KEY = "sync_source_key";

export const SyncDataButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceKey, setSourceKey] = useState("");
  const { toast } = useToast();

  // Load saved credentials from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem(STORAGE_KEY_URL);
    const savedKey = localStorage.getItem(STORAGE_KEY_KEY);
    if (savedUrl) setSourceUrl(savedUrl);
    if (savedKey) setSourceKey(savedKey);
  }, []);

  const saveCredentials = () => {
    localStorage.setItem(STORAGE_KEY_URL, sourceUrl);
    localStorage.setItem(STORAGE_KEY_KEY, sourceKey);
  };

  const handleSync = async () => {
    if (!sourceUrl || !sourceKey) {
      setShowConfig(true);
      toast({
        title: "Configuração necessária",
        description: "Por favor, configure as credenciais do projeto fonte.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("Iniciando sincronização de dados...");
      
      // Save credentials for future use
      saveCredentials();

      const { data, error } = await supabase.functions.invoke("sync-tables", {
        body: {
          sourceUrl: sourceUrl,
          sourceKey: sourceKey,
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

  const hasCredentials = sourceUrl && sourceKey;

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
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Dados
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {showConfig ? (
              <>
                <Settings className="h-5 w-5 text-primary" />
                Configurar Fonte de Dados
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Confirmar Sincronização
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            {showConfig || !hasCredentials ? (
              <div className="space-y-4 pt-2">
                <p className="text-sm">Configure as credenciais do projeto Supabase fonte:</p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sourceUrl" className="text-foreground">URL do Projeto Fonte</Label>
                    <Input
                      id="sourceUrl"
                      placeholder="https://xxx.supabase.co"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sourceKey" className="text-foreground">Anon Key do Projeto Fonte</Label>
                    <Input
                      id="sourceKey"
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIs..."
                      value={sourceKey}
                      onChange={(e) => setSourceKey(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  As credenciais serão salvas localmente para uso futuro.
                </p>
              </div>
            ) : (
              <>
                <p>Esta ação irá:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Remover todos os dados atuais das tabelas de condomínios e pesos de avaliação</li>
                  <li>Importar dados do projeto fonte</li>
                  <li>Substituir completamente os dados existentes</li>
                </ul>
                <p className="font-semibold mt-4">Tem certeza que deseja continuar?</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfig(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <Settings className="mr-1 h-3 w-3" />
                  Alterar credenciais
                </Button>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowConfig(false)}>Cancelar</AlertDialogCancel>
          {showConfig || !hasCredentials ? (
            <Button 
              onClick={() => {
                if (sourceUrl && sourceKey) {
                  saveCredentials();
                  setShowConfig(false);
                  toast({
                    title: "Credenciais salvas",
                    description: "Clique em Sincronizar Dados novamente para iniciar.",
                  });
                }
              }}
              disabled={!sourceUrl || !sourceKey}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Salvar Configuração
            </Button>
          ) : (
            <AlertDialogAction onClick={handleSync} className="bg-primary">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirmar Sincronização
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
