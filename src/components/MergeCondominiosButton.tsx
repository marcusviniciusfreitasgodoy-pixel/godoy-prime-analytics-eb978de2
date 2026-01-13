import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Database, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface MergeResult {
  success: boolean;
  summary: {
    total_csv: number;
    existentes: number;
    duplicados: number;
    novos_inseridos: number;
    errors: string[] | null;
  };
}

export function MergeCondominiosButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<"idle" | "reading" | "uploading" | "success" | "error">("idle");
  const [result, setResult] = useState<MergeResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleMerge = async () => {
    setIsProcessing(true);
    setStatus("reading");
    setResult(null);
    setErrorMessage("");

    try {
      // Buscar o CSV do public/data
      setStatus("reading");
      const response = await fetch("/data/condominios-import.csv");
      
      if (!response.ok) {
        throw new Error("Arquivo CSV não encontrado. Verifique se existe o arquivo em public/data/condominios-import.csv");
      }

      const csvData = await response.text();
      
      if (!csvData || csvData.length < 100) {
        throw new Error("Arquivo CSV está vazio ou corrompido");
      }

      // Verificar estrutura do CSV
      const firstLine = csvData.split('\n')[0];
      if (!firstLine.includes('nome') || !firstLine.includes('logradouro')) {
        throw new Error("Formato do CSV inválido. Esperado: nome,logradouro,numero,cep,bairro,microbairro,latitude,longitude");
      }

      setStatus("uploading");

      // Chamar edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Você precisa estar logado para executar esta ação");
      }

      const { data, error } = await supabase.functions.invoke("merge-condominios", {
        body: { csvData },
      });

      if (error) {
        throw new Error(error.message || "Erro ao processar mesclagem");
      }

      if (!data.success) {
        throw new Error(data.error || "Erro desconhecido na mesclagem");
      }

      setResult(data as MergeResult);
      setStatus("success");
      
      toast.success(`${data.summary.novos_inseridos} novos condomínios adicionados!`);
    } catch (error) {
      console.error("Erro na mesclagem:", error);
      setErrorMessage(error instanceof Error ? error.message : "Erro desconhecido");
      setStatus("error");
      toast.error("Falha na mesclagem de condomínios");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDialog = () => {
    setStatus("idle");
    setResult(null);
    setErrorMessage("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Database className="h-4 w-4" />
          Mesclar Base de Condomínios
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Mesclar Base de Condomínios
          </DialogTitle>
          <DialogDescription>
            Adiciona novos condomínios à base existente, preservando os registros atuais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === "idle" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-medium text-sm mb-2">O que será feito:</h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Ler o arquivo CSV com 507 condomínios</li>
                  <li>Comparar com os {273} registros existentes</li>
                  <li>Inserir apenas os novos (sem duplicar)</li>
                  <li>Preservar dados existentes (não sobrescreve)</li>
                </ul>
              </div>
              <Button 
                onClick={handleMerge} 
                className="w-full gap-2"
                disabled={isProcessing}
              >
                <Upload className="h-4 w-4" />
                Iniciar Mesclagem
              </Button>
            </div>
          )}

          {(status === "reading" || status === "uploading") && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {status === "reading" ? "Lendo arquivo CSV..." : "Processando mesclagem..."}
              </p>
              <Progress value={status === "reading" ? 30 : 70} className="h-2" />
            </div>
          )}

          {status === "success" && result && (
            <div className="space-y-4">
              <div className="flex items-center justify-center text-green-500">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h3 className="text-center font-semibold text-lg">Mesclagem Concluída!</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border text-center">
                  <p className="text-2xl font-bold text-primary">{result.summary.total_csv}</p>
                  <p className="text-xs text-muted-foreground">No CSV</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{result.summary.duplicados}</p>
                  <p className="text-xs text-muted-foreground">Já existiam</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center col-span-2">
                  <p className="text-3xl font-bold text-green-600">{result.summary.novos_inseridos}</p>
                  <p className="text-xs text-green-700">Novos adicionados</p>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Total na base agora: {result.summary.existentes + result.summary.novos_inseridos} condomínios
              </p>

              {result.summary.errors && result.summary.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs text-yellow-700 font-medium mb-1">Avisos:</p>
                  {result.summary.errors.map((err, i) => (
                    <p key={i} className="text-xs text-yellow-600">{err}</p>
                  ))}
                </div>
              )}

              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setIsOpen(false)}
              >
                Fechar
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="flex items-center justify-center text-destructive">
                <AlertCircle className="h-12 w-12" />
              </div>
              <h3 className="text-center font-semibold text-lg text-destructive">
                Erro na Mesclagem
              </h3>
              <p className="text-center text-sm text-muted-foreground">
                {errorMessage}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setIsOpen(false)}
                >
                  Fechar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    resetDialog();
                    handleMerge();
                  }}
                >
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
