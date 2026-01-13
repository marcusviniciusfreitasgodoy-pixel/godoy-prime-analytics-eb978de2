import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface EnrichmentResult {
  success: boolean;
  processed: number;
  enriched: number;
  failed: number;
  skipped: number;
  details?: Array<{ nome: string; status: string; error?: string }>;
}

interface EnrichCondominiosButtonProps {
  onComplete?: () => void;
}

export function EnrichCondominiosButton({ onComplete }: EnrichCondominiosButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [limit, setLimit] = useState<string>("50");
  const [progress, setProgress] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // Buscar quantidade pendente ao abrir
  useEffect(() => {
    const fetchPendingCount = async () => {
      const { count } = await supabase
        .from('condominios_mapeamento')
        .select('id', { count: 'exact', head: true })
        .or('latitude.is.null,google_place_id.is.null');
      setPendingCount(count || 0);
    };
    if (isOpen) {
      fetchPendingCount();
    }
  }, [isOpen]);

  const handleEnrich = async () => {
    setIsProcessing(true);
    setStatus("processing");
    setResult(null);
    setErrorMessage("");
    setProgress(10);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Você precisa estar logado para executar esta ação");
      }

      setProgress(20);

      const parsedLimit = parseInt(limit);
      const limitNum = Number.isFinite(parsedLimit) ? Math.min(parsedLimit, 50) : 50;
      
      const { data, error } = await supabase.functions.invoke("enrich-condominios", {
        body: { 
          forceRefresh,
          limit: limitNum,
          bairro: "Barra da Tijuca"
        },
      });

      setProgress(90);

      if (error) {
        throw new Error(error.message || "Erro ao processar enriquecimento");
      }

      if (!data.success) {
        throw new Error(data.error || "Erro desconhecido no enriquecimento");
      }

      setResult({
        success: true,
        processed: data.processed || 0,
        enriched: data.enriched || 0,
        failed: data.failed || 0,
        skipped: data.skipped || 0,
        details: data.details
      });
      
      setStatus("success");
      setProgress(100);
      
      toast.success(`${data.enriched} condomínios enriquecidos com sucesso!`);
      onComplete?.();
    } catch (error) {
      console.error("Erro no enriquecimento:", error);
      setErrorMessage(error instanceof Error ? error.message : "Erro desconhecido");
      setStatus("error");
      toast.error("Falha no enriquecimento de condomínios");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDialog = () => {
    setStatus("idle");
    setResult(null);
    setErrorMessage("");
    setProgress(0);
    setForceRefresh(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MapPin className="h-4 w-4" />
          Enriquecer Dados
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-1 bg-amber-500/20 text-amber-700">
              {pendingCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Enriquecer Condomínios
          </DialogTitle>
          <DialogDescription>
            Preenche coordenadas e endereços completos usando Google Places API.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === "idle" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-amber-600" />
                  <h4 className="font-medium text-sm text-amber-800">
                    {pendingCount} condomínios aguardando enriquecimento
                  </h4>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Buscar coordenadas via Google Places API</li>
                  <li>Preencher endereço completo formatado</li>
                  <li>Obter Google Place ID para cada condomínio</li>
                  <li>Identificar ruas internas próximas</li>
                </ul>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Quantidade a processar</Label>
                  <Select value={limit} onValueChange={setLimit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o limite" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50 condomínios (recomendado)</SelectItem>
                      <SelectItem value="100">100 condomínios</SelectItem>
                      <SelectItem value="150">150 condomínios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="forceRefresh" 
                    checked={forceRefresh}
                    onCheckedChange={(checked) => setForceRefresh(checked === true)}
                  />
                  <Label htmlFor="forceRefresh" className="text-sm cursor-pointer">
                    Forçar re-enriquecimento (mesmo com dados existentes)
                  </Label>
                </div>
              </div>

              <Button 
                onClick={handleEnrich} 
                className="w-full gap-2"
                disabled={isProcessing}
              >
                <MapPin className="h-4 w-4" />
                Iniciar Enriquecimento
              </Button>
            </div>
          )}

          {status === "processing" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Buscando dados no Google Places API...
              </p>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-xs text-muted-foreground">
                Isso pode levar alguns minutos para grandes quantidades
              </p>
            </div>
          )}

          {status === "success" && result && (
            <div className="space-y-4">
              <div className="flex items-center justify-center text-green-500">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h3 className="text-center font-semibold text-lg">Enriquecimento Concluído!</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border text-center">
                  <p className="text-2xl font-bold text-primary">{result.processed}</p>
                  <p className="text-xs text-muted-foreground">Processados</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                  <p className="text-2xl font-bold text-green-600">{result.enriched}</p>
                  <p className="text-xs text-green-700">Enriquecidos</p>
                </div>
                {result.skipped > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50 border text-center">
                    <p className="text-2xl font-bold text-muted-foreground">{result.skipped}</p>
                    <p className="text-xs text-muted-foreground">Já tinham dados</p>
                  </div>
                )}
                {result.failed > 0 && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{result.failed}</p>
                    <p className="text-xs text-yellow-700">Não encontrados</p>
                  </div>
                )}
              </div>

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
                Erro no Enriquecimento
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
                    handleEnrich();
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
