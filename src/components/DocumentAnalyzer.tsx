import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, CheckCircle, AlertTriangle, XCircle, RefreshCw, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AnalysisResult {
  tipo_documento: string;
  status: 'OK' | 'ATENCAO' | 'CRITICO';
  status_motivo: string;
  dados_extraidos: Record<string, any>;
  alertas: string[];
  validade: string | null;
  checklist_item: string | null;
  proximos_passos: string[];
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA';
  raw_response?: string;
}

interface DocumentAnalyzerProps {
  onChecklistItemSuggested?: (itemId: string) => void;
}

export function DocumentAnalyzer({ onChecklistItemSuggested }: DocumentAnalyzerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Use imagens (JPG, PNG, WebP) ou PDF.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    setFilename(file.name);
    setResult(null);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreview(base64);
      await analyzeDocument(base64, file.type, file.name);
    };
    reader.readAsDataURL(file);
  };

  const analyzeDocument = async (base64: string, mimeType: string, name: string) => {
    setIsAnalyzing(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          image: base64,
          mimeType,
          filename: name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const analysisResult: AnalysisResult = await response.json();
      setResult(analysisResult);

      // Suggest checklist item if available
      if (analysisResult.checklist_item && onChecklistItemSuggested) {
        onChecklistItemSuggested(analysisResult.checklist_item);
      }

      toast({
        title: "Análise concluída",
        description: `Documento identificado: ${analysisResult.tipo_documento}`,
      });

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Erro na análise",
        description: error instanceof Error ? error.message : "Não foi possível analisar o documento.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setFilename("");
    setResult(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'ATENCAO': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'CRITICO': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'ATENCAO': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'CRITICO': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted';
    }
  };

  const getConfiancaColor = (confianca: string) => {
    switch (confianca) {
      case 'ALTA': return 'bg-green-500/10 text-green-600';
      case 'MEDIA': return 'bg-yellow-500/10 text-yellow-600';
      case 'BAIXA': return 'bg-red-500/10 text-red-600';
      default: return 'bg-muted';
    }
  };

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Análise Inteligente de Documentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preview ? (
          // Upload Area
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
            )}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-foreground font-medium mb-1">
              Arraste um documento ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Suporta: JPG, PNG, WebP, PDF (máx. 10MB)
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="document-upload"
            />
            <label htmlFor="document-upload">
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Selecionar arquivo
                </span>
              </Button>
            </label>
          </div>
        ) : (
          // Preview and Results
          <div className="space-y-4">
            {/* Preview */}
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0 border">
                {preview.startsWith('data:image') ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{filename}</p>
                {isAnalyzing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analisando documento com IA...</span>
                  </div>
                )}
                {result && (
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusIcon(result.status)}
                    <Badge className={cn("text-xs", getStatusColor(result.status))}>
                      {result.status}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", getConfiancaColor(result.confianca))}>
                      Confiança: {result.confianca}
                    </Badge>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={reset} className="shrink-0">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Analysis Results */}
            {result && (
              <div className="space-y-4 pt-4 border-t">
                {/* Document Type */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Tipo de Documento</p>
                  <p className="font-medium">{result.tipo_documento}</p>
                  {result.status_motivo && (
                    <p className="text-sm text-muted-foreground mt-1">{result.status_motivo}</p>
                  )}
                </div>

                {/* Extracted Data */}
                {Object.keys(result.dados_extraidos).length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-2">Dados Extraídos</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(result.dados_extraidos).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground">{key}: </span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alerts */}
                {result.alertas.length > 0 && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs text-yellow-600 font-medium mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Alertas Identificados
                    </p>
                    <ul className="text-sm space-y-1">
                      {result.alertas.map((alerta, i) => (
                        <li key={i} className="text-yellow-700">• {alerta}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Validity */}
                {result.validade && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Validade</p>
                    <p className="font-medium">{result.validade}</p>
                  </div>
                )}

                {/* Next Steps */}
                {result.proximos_passos.length > 0 && (
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-xs text-accent font-medium mb-2">Próximos Passos</p>
                    <ul className="text-sm space-y-1">
                      {result.proximos_passos.map((passo, i) => (
                        <li key={i} className="text-foreground">• {passo}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Checklist Item Suggestion */}
                {result.checklist_item && onChecklistItemSuggested && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onChecklistItemSuggested(result.checklist_item!)}
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar item correspondente no checklist
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
