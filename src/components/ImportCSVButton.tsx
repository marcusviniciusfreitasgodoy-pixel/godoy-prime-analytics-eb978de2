import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImportStats {
  linhas_csv: number;
  linhas_processadas: number;
  linhas_filtradas: number;
  registros_validos: number;
  registros_inseridos: number;
  total_transacoes_agregadas: number;
  erros_parsing: number;
  erros_insercao: number;
}

export function ImportCSVButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "reading" | "uploading" | "success" | "error">("idle");
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setStatus("reading");
    setProgress(10);
    setErrorMessage(null);
    setStats(null);

    try {
      // Ler arquivo
      const text = await file.text();
      setProgress(30);
      setStatus("uploading");

      // Enviar para Edge Function
      const { data, error } = await supabase.functions.invoke('import-csv-itbi', {
        body: {
          csv_content: text,
          clear_existing: true,
          codbairro_filter: '128', // Barra da Tijuca
          min_year: 2020,
        },
      });

      setProgress(100);

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setStatus("success");
        setStats(data.estatisticas);
        toast({
          title: "Importação concluída",
          description: `${data.estatisticas.registros_inseridos} registros importados com sucesso.`,
        });
      } else {
        throw new Error(data?.error || "Erro desconhecido na importação");
      }
    } catch (err) {
      setStatus("error");
      const message = err instanceof Error ? err.message : "Erro na importação";
      setErrorMessage(message);
      toast({
        title: "Erro na importação",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const resetDialog = () => {
    setStatus("idle");
    setProgress(0);
    setStats(null);
    setErrorMessage(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2 border-accent/30 text-primary-foreground hover:bg-accent/10"
        >
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Dados ITBI
          </DialogTitle>
          <DialogDescription>
            Selecione o arquivo CSV da Prefeitura do Rio de Janeiro para importar as transações ITBI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === "idle" && (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Arraste o arquivo CSV ou clique para selecionar
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                Selecionar Arquivo
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Formato esperado: CSV com separador <code>;</code> e dados da Prefeitura RJ
              </p>
            </div>
          )}

          {(status === "reading" || status === "uploading") && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span className="text-sm">
                  {status === "reading" ? "Lendo arquivo..." : "Importando dados..."}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {status === "uploading" && "Processando e inserindo registros no banco de dados..."}
              </p>
            </div>
          )}

          {status === "success" && stats && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Importação concluída com sucesso!</span>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Linhas no CSV:</span>
                  <span className="font-medium">{stats.linhas_csv.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Linhas processadas:</span>
                  <span className="font-medium">{stats.linhas_processadas.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registros inseridos:</span>
                  <span className="font-medium text-green-600">{stats.registros_inseridos.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-muted-foreground">Total transações agregadas:</span>
                  <span className="font-bold text-primary">{stats.total_transacoes_agregadas.toLocaleString('pt-BR')}</span>
                </div>
                {stats.erros_parsing > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Erros de parsing:</span>
                    <span>{stats.erros_parsing}</span>
                  </div>
                )}
              </div>

              <Button 
                className="w-full" 
                onClick={() => {
                  setIsOpen(false);
                  window.location.reload();
                }}
              >
                Fechar e Atualizar Dashboard
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Erro na importação</span>
              </div>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <Button variant="outline" onClick={resetDialog}>
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
