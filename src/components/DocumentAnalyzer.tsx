import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Loader2, CheckCircle, AlertTriangle, XCircle, RefreshCw, Sparkles, Trash2, ChevronDown, ChevronUp, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import * as pdfjsLib from "pdfjs-dist";

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { AgentSelector, AGENTS, DEFAULT_AGENT, getAgentById, type AgentId } from "@/components/AgentSelector";

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
  modelo_usado?: string;
}

interface DocumentFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  result?: AnalysisResult;
  error?: string;
}

interface DocumentAnalyzerProps {
  onChecklistItemSuggested?: (itemId: string) => void;
}

export function DocumentAnalyzer({ onChecklistItemSuggested }: DocumentAnalyzerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isAnalyzingBatch, setIsAnalyzingBatch] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentId>(() => {
    if (typeof window === "undefined") return DEFAULT_AGENT;
    const saved = localStorage.getItem("documentAnalyzer.agent") as AgentId | null;
    return AGENTS.some((a) => a.id === saved) ? (saved as AgentId) : DEFAULT_AGENT;
  });
  useEffect(() => {
    try { localStorage.setItem("documentAnalyzer.agent", selectedAgent); } catch {}
  }, [selectedAgent]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const persistAnalysis = async (doc: DocumentFile, result: AnalysisResult) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();
      const orgId = (profile as any)?.organization_id;
      if (!orgId) return;

      const ext = doc.file.name.split(".").pop() || "bin";
      const filePath = `${orgId}/${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("document-analyses")
        .upload(filePath, doc.file, { contentType: doc.file.type, upsert: false });

      const { error: insertErr } = await supabase.from("document_analyses" as any).insert({
        organization_id: orgId,
        user_id: user.id,
        file_name: doc.file.name,
        file_path: uploadErr ? null : filePath,
        file_mime_type: doc.file.type,
        file_size_bytes: doc.file.size,
        tipo_documento: result.tipo_documento,
        status: result.status,
        status_motivo: result.status_motivo,
        dados_extraidos: result.dados_extraidos || {},
        alertas: result.alertas || [],
        validade: result.validade,
        checklist_item: result.checklist_item,
        proximos_passos: result.proximos_passos || [],
        confianca: result.confianca,
        raw_response: result.raw_response,
        modelo_usado: result.modelo_usado || null,
      });
      if (insertErr) console.error("Persist analysis error:", insertErr);
      else queryClient.invalidateQueries({ queryKey: ["document-analyses"] });
    } catch (e) {
      console.error("persistAnalysis failed:", e);
    }
  };

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
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    processFiles(files);
    // Reset input to allow selecting same files again
    e.target.value = '';
  };

  const processFiles = async (files: File[]) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const validFiles = files.filter(file => {
      if (!validTypes.includes(file.type)) {
        toast({
          title: `Arquivo ignorado: ${file.name}`,
          description: "Tipo não suportado. Use JPG, PNG, WebP ou PDF.",
          variant: "destructive",
        });
        return false;
      }
      if (file.size > maxSize) {
        toast({
          title: `Arquivo ignorado: ${file.name}`,
          description: "Arquivo muito grande (máx. 10MB).",
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Convert files to DocumentFile objects
    const newDocs: DocumentFile[] = await Promise.all(
      validFiles.map(async (file) => {
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        return {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview,
          status: 'pending' as const,
        };
      })
    );

    setDocuments(prev => [...prev, ...newDocs]);

    toast({
      title: `${newDocs.length} documento(s) adicionado(s)`,
      description: "Clique em 'Analisar Todos' para iniciar a análise.",
    });
  };

  const convertPdfToImages = async (file: File): Promise<string[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const maxPages = Math.min(pdf.numPages, 5); // Max 5 pages
    const images: string[] = [];

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const scale = 2; // Higher resolution for better OCR
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      images.push(canvas.toDataURL('image/jpeg', 0.9));
      canvas.remove();
    }

    return images;
  };

  const analyzeDocument = async (doc: DocumentFile): Promise<AnalysisResult> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Você precisa estar autenticado para analisar documentos.');
    }

    // For PDFs, convert pages to images first
    let images: string[];
    let mimeType = doc.file.type;

    if (doc.file.type === 'application/pdf') {
      images = await convertPdfToImages(doc.file);
      mimeType = 'image/jpeg';
    } else {
      images = [doc.preview];
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        images,
        mimeType,
        filename: doc.file.name,
        model: selectedAgent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro ${response.status}`);
    }

    return await response.json();
  };

  const analyzeAllDocuments = async () => {
    const pendingDocs = documents.filter(d => d.status === 'pending' || d.status === 'error');
    if (pendingDocs.length === 0) {
      toast({
        title: "Nenhum documento pendente",
        description: "Adicione documentos ou resete os já analisados.",
      });
      return;
    }

    setIsAnalyzingBatch(true);

    for (const doc of pendingDocs) {
      // Update status to analyzing
      setDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, status: 'analyzing' as const } : d
      ));

      try {
        const result = await analyzeDocument(doc);
        
        // Update with result
        setDocuments(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'done' as const, result } : d
        ));

        // Auto-expand the first analyzed document to show results immediately
        setExpandedDoc(doc.id);

        // Persist to backend (storage + DB) for history
        persistAnalysis(doc, result);

        // Suggest checklist item if available
        if (result.checklist_item && onChecklistItemSuggested) {
          onChecklistItemSuggested(result.checklist_item);
        }

      } catch (error) {
        setDocuments(prev => prev.map(d => 
          d.id === doc.id ? { 
            ...d, 
            status: 'error' as const, 
            error: error instanceof Error ? error.message : 'Erro desconhecido' 
          } : d
        ));
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsAnalyzingBatch(false);

    const successCount = documents.filter(d => d.status === 'done').length;
    toast({
      title: "Análise em lote concluída",
      description: `${successCount} de ${documents.length} documentos analisados com sucesso.`,
    });
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (expandedDoc === id) setExpandedDoc(null);
  };

  const resetAll = () => {
    setDocuments([]);
    setExpandedDoc(null);
  };

  const getProgress = () => {
    if (documents.length === 0) return 0;
    const completed = documents.filter(d => d.status === 'done' || d.status === 'error').length;
    return Math.round((completed / documents.length) * 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ATENCAO': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'CRITICO': return <XCircle className="h-4 w-4 text-red-500" />;
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

  const getDocStatusBadge = (doc: DocumentFile) => {
    switch (doc.status) {
      case 'pending':
        return <Badge variant="outline" className="text-xs">Pendente</Badge>;
      case 'analyzing':
        return <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
          Analisando
        </Badge>;
      case 'done':
        return <Badge className={cn("text-xs", getStatusColor(doc.result?.status || ''))}>
          {doc.result?.status || 'Concluído'}
        </Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Erro</Badge>;
      default:
        return null;
    }
  };

  const summaryStats = {
    total: documents.length,
    ok: documents.filter(d => d.result?.status === 'OK').length,
    atencao: documents.filter(d => d.result?.status === 'ATENCAO').length,
    critico: documents.filter(d => d.result?.status === 'CRITICO').length,
    pending: documents.filter(d => d.status === 'pending').length,
    error: documents.filter(d => d.status === 'error').length,
  };

  return (
    <Card className="border-accent/20 overflow-hidden rounded-none sm:rounded-lg border-x-0 sm:border-x">
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0" />
            <span className="truncate">Análise Inteligente de Documentos</span>
          </CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/historico-documentos">
                <History className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Histórico</span>
              </Link>
            </Button>
            {documents.length > 0 && (
              <Button variant="ghost" size="sm" onClick={resetAll} className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Limpar</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        {/* Aviso Legal */}
        <LegalDisclaimer variant="full" />

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors",
            isDragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
          )}
        >
          <Upload className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs sm:text-sm text-foreground font-medium mb-1">
            Arraste documentos ou clique para selecionar
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">
            JPG, PNG, WebP, PDF (máx. 10MB)
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="document-upload"
            multiple
          />
          <label htmlFor="document-upload">
            <Button variant="outline" size="sm" asChild>
              <span className="cursor-pointer text-xs sm:text-sm">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Selecionar arquivos
              </span>
            </Button>
          </label>
        </div>

        {/* Documents List */}
        {documents.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {/* Progress and Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
              <div className="flex-1 w-full sm:w-auto">
                <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
                  <span className="text-muted-foreground">Progresso da Análise</span>
                  <span className="font-medium">{getProgress()}%</span>
                </div>
                <Progress value={getProgress()} className="h-2" />
              </div>
              <Button 
                onClick={analyzeAllDocuments} 
                disabled={isAnalyzingBatch || summaryStats.pending === 0}
                size="sm"
                className="gap-1 sm:gap-1.5 text-xs sm:text-sm w-full sm:w-auto"
              >
                {isAnalyzingBatch ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                    <span className="hidden sm:inline">Analisando...</span>
                    <span className="sm:hidden">Analisando</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Analisar Todos ({summaryStats.pending + summaryStats.error})</span>
                    <span className="sm:hidden">Analisar ({summaryStats.pending + summaryStats.error})</span>
                  </>
                )}
              </Button>
            </div>

            {/* Summary Stats */}
            {summaryStats.total > 0 && (summaryStats.ok + summaryStats.atencao + summaryStats.critico) > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-muted-foreground">Resumo:</span>
                {summaryStats.ok > 0 && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {summaryStats.ok} OK
                  </Badge>
                )}
                {summaryStats.atencao > 0 && (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {summaryStats.atencao} Atenção
                  </Badge>
                )}
                {summaryStats.critico > 0 && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                    <XCircle className="h-3 w-3 mr-1" />
                    {summaryStats.critico} Crítico
                  </Badge>
                )}
              </div>
            )}

            {/* Document Cards */}
            <div className="space-y-2 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
              {documents.map((doc) => (
                <Collapsible 
                  key={doc.id} 
                  open={expandedDoc === doc.id}
                  onOpenChange={(open) => setExpandedDoc(open ? doc.id : null)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    {/* Document Header - Clickable to expand when analysis is done */}
                    <div 
                      className={cn(
                        "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-background",
                        doc.status === 'done' && doc.result && "cursor-pointer hover:bg-muted/50 transition-colors"
                      )}
                      onClick={() => {
                        if (doc.status === 'done' && doc.result) {
                          setExpandedDoc(expandedDoc === doc.id ? null : doc.id);
                        }
                      }}
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded overflow-hidden bg-muted shrink-0 border">
                        {doc.preview.startsWith('data:image') ? (
                          <img src={doc.preview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-none">{doc.file.name}</p>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                          {getDocStatusBadge(doc)}
                          {doc.result && (
                            <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[80px] sm:max-w-none">
                              {doc.result.tipo_documento}
                            </span>
                          )}
                        </div>
                        {doc.status === 'done' && doc.result && expandedDoc !== doc.id && (
                          <p className="text-[10px] text-accent mt-1">Clique para ver detalhes da análise</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                        {doc.status === 'done' && doc.result && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                              {expandedDoc === doc.id ? (
                                <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeDocument(doc.id)}
                          disabled={doc.status === 'analyzing'}
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <CollapsibleContent>
                      {doc.result && (
                        <div className="p-2 sm:p-3 border-t bg-muted/30 space-y-2 sm:space-y-3">
                          {/* Status Motivo */}
                          {doc.result.status_motivo && (
                            <p className="text-xs sm:text-sm text-muted-foreground">{doc.result.status_motivo}</p>
                          )}

                          {/* Extracted Data */}
                          {Object.keys(doc.result.dados_extraidos).length > 0 && (
                            <div className="p-2 rounded bg-background">
                              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-medium">Dados Extraídos</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 sm:gap-y-1 text-[10px] sm:text-xs">
                                {Object.entries(doc.result.dados_extraidos).map(([key, value]) => (
                                  <div key={key} className="truncate">
                                    <span className="text-muted-foreground">{key}: </span>
                                    <span className="font-medium">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Alerts */}
                          {doc.result.alertas.length > 0 && (
                            <div className="p-1.5 sm:p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                              <p className="text-[10px] sm:text-xs text-yellow-600 font-medium mb-0.5 sm:mb-1">Alertas</p>
                              <ul className="text-[10px] sm:text-xs space-y-0.5">
                                {doc.result.alertas.map((alerta, i) => (
                                  <li key={i} className="text-yellow-700">• {alerta}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Next Steps */}
                          {doc.result.proximos_passos.length > 0 && (
                            <div className="p-1.5 sm:p-2 rounded bg-accent/10">
                              <p className="text-[10px] sm:text-xs text-accent font-medium mb-0.5 sm:mb-1">Próximos Passos</p>
                              <ul className="text-[10px] sm:text-xs space-y-0.5">
                                {doc.result.proximos_passos.map((passo, i) => (
                                  <li key={i}>• {passo}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Checklist Action */}
                          {doc.result.checklist_item && onChecklistItemSuggested && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onChecklistItemSuggested(doc.result!.checklist_item!)}
                              className="w-full text-[10px] sm:text-xs"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Marcar item no checklist
                            </Button>
                          )}

                          {/* Aviso compacto no rodapé do card */}
                          <LegalDisclaimer variant="compact" />
                        </div>
                      )}

                      {doc.status === 'error' && doc.error && (
                        <div className="p-2 sm:p-3 border-t bg-red-500/5">
                          <p className="text-[10px] sm:text-xs text-red-600">{doc.error}</p>
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
