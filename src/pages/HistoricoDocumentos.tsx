import { useState } from "react";
import { useDocumentAnalyses, useDeleteDocumentAnalysis, getDocumentFileUrl, type DocumentAnalysisRecord } from "@/hooks/useDocumentAnalyses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle, XCircle, Search, Trash2, Eye, FileText, Loader2, Download, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/exportUtils";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";

const statusConfig: Record<string, { label: string; icon: any; cls: string }> = {
  OK: { label: "OK", icon: CheckCircle, cls: "bg-green-500/10 text-green-600 border-green-500/20" },
  ATENCAO: { label: "Atenção", icon: AlertTriangle, cls: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  CRITICO: { label: "Crítico", icon: XCircle, cls: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export default function HistoricoDocumentos() {
  const { data: analyses = [], isLoading } = useDocumentAnalyses();
  const deleteMutation = useDeleteDocumentAnalysis();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<DocumentAnalysisRecord | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const filtered = analyses.filter((a) => {
    const matchSearch = !search || 
      a.file_name.toLowerCase().includes(search.toLowerCase()) ||
      (a.tipo_documento || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleView = async (record: DocumentAnalysisRecord) => {
    setSelected(record);
    setFileUrl(null);
    if (record.file_path) {
      const url = await getDocumentFileUrl(record.file_path);
      setFileUrl(url);
    }
  };

  const stats = {
    total: analyses.length,
    ok: analyses.filter((a) => a.status === "OK").length,
    atencao: analyses.filter((a) => a.status === "ATENCAO").length,
    critico: analyses.filter((a) => a.status === "CRITICO").length,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-accent" />
          Histórico de Análises de Documentos
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Todos os documentos analisados pela IA, organizados por data.
        </p>
      </div>

      {/* Aviso Legal */}
      <LegalDisclaimer variant="full" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">OK</p><p className="text-2xl font-bold text-green-600">{stats.ok}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Atenção</p><p className="text-2xl font-bold text-yellow-600">{stats.atencao}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Crítico</p><p className="text-2xl font-bold text-red-600">{stats.critico}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou tipo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="OK">OK</SelectItem>
              <SelectItem value="ATENCAO">Atenção</SelectItem>
              <SelectItem value="CRITICO">Crítico</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{analyses.length === 0 ? "Nenhuma análise realizada ainda. Volte para a Documentação e analise documentos." : "Nenhum resultado para os filtros."}</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const cfg = statusConfig[a.status || ""] || { label: a.status || "—", icon: FileText, cls: "bg-muted" };
            const Icon = cfg.icon;
            return (
              <Card key={a.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleView(a)}>
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{a.file_name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn("text-xs", cfg.cls)}>
                        <Icon className="h-3 w-3 mr-1" />{cfg.label}
                      </Badge>
                      {a.tipo_documento && <span className="text-xs text-muted-foreground">{a.tipo_documento}</span>}
                      <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleView(a); }}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm("Remover esta análise?")) deleteMutation.mutate(a); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" /> {selected?.file_name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {selected.status && (() => {
                  const cfg = statusConfig[selected.status] || { label: selected.status, icon: FileText, cls: "bg-muted" };
                  const Icon = cfg.icon;
                  return <Badge variant="outline" className={cn("text-xs", cfg.cls)}><Icon className="h-3 w-3 mr-1" />{cfg.label}</Badge>;
                })()}
                {selected.tipo_documento && <Badge variant="outline">{selected.tipo_documento}</Badge>}
                {selected.confianca && <Badge variant="outline">Confiança: {selected.confianca}</Badge>}
                <span className="text-xs text-muted-foreground">{formatDate(selected.created_at)}</span>
              </div>

              {selected.status_motivo && (
                <div><p className="text-xs text-muted-foreground mb-1">Motivo do status</p><p className="text-sm">{selected.status_motivo}</p></div>
              )}

              {selected.dados_extraidos && Object.keys(selected.dados_extraidos).length > 0 && (
                <div className="p-3 rounded bg-muted/50">
                  <p className="text-xs font-medium mb-2">Dados extraídos</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {Object.entries(selected.dados_extraidos).map(([k, v]) => (
                      <div key={k} className="truncate"><span className="text-muted-foreground">{k}: </span><span className="font-medium">{String(v)}</span></div>
                    ))}
                  </div>
                </div>
              )}

              {selected.alertas?.length > 0 && (
                <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs font-medium text-yellow-700 mb-1">Alertas</p>
                  <ul className="text-xs space-y-0.5 text-yellow-700">{selected.alertas.map((a, i) => <li key={i}>• {a}</li>)}</ul>
                </div>
              )}

              {selected.proximos_passos?.length > 0 && (
                <div className="p-3 rounded bg-accent/10">
                  <p className="text-xs font-medium text-accent mb-1">Próximos passos</p>
                  <ul className="text-xs space-y-0.5">{selected.proximos_passos.map((p, i) => <li key={i}>• {p}</li>)}</ul>
                </div>
              )}

              {fileUrl && (
                <div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" /> Abrir documento original
                    </a>
                  </Button>
                </div>
              )}

              <LegalDisclaimer variant="compact" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
