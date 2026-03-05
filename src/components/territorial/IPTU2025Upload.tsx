import { useState, useRef, useEffect } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";

interface ProcessResult {
  logradouros_residenciais_enriquecidos: number;
  condominios_com_area_media: number;
  condominios_com_divergencia_20pct: number;
  logradouros_comerciais_inseridos: number;
}

interface UploadStats {
  total: number;
  inserted: number;
  errors: number;
}

export function IPTU2025Upload() {
  const { toast } = useToast();
  const resFileRef = useRef<HTMLInputElement>(null);
  const comFileRef = useRef<HTMLInputElement>(null);

  const [resStats, setResStats] = useState<UploadStats | null>(null);
  const [comStats, setComStats] = useState<UploadStats | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [tableCount, setTableCount] = useState<number | null>(null);
  const [lastImport, setLastImport] = useState<string | null>(null);

  // Fetch table stats on mount
  useEffect(() => {
    fetchTableStats();
  }, []);

  async function fetchTableStats() {
    const { count } = await supabase
      .from("iptu_2025_logradouro" as any)
      .select("*", { count: "exact", head: true });
    setTableCount(count ?? 0);

    const { data } = await supabase
      .from("iptu_2025_logradouro" as any)
      .select("importado_em")
      .order("importado_em", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setLastImport(new Date((data[0] as any).importado_em).toLocaleString("pt-BR"));
    }
  }

  async function handleUpload(file: File, tributacao: "R" | "N") {
    const label = tributacao === "R" ? "Residencial" : "Não Residencial";
    setUploading(label);
    setProgress(0);

    const stats: UploadStats = { total: 0, inserted: 0, errors: 0 };

    try {
      const text = await file.text();

      // Parse CSV
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
      });

      const rows = parsed.data as Record<string, string>[];
      stats.total = rows.length;
      const CHUNK = 500;
      const chunks = Math.ceil(rows.length / CHUNK);

      for (let i = 0; i < chunks; i++) {
        const chunk = rows.slice(i * CHUNK, (i + 1) * CHUNK);

        const records = chunk
          .filter((r) => r.cl && r.nome_completo)
          .map((r) => ({
            objectid: r.objectid ? parseInt(r.objectid) : null,
            cl: r.cl?.padStart(6, "0"),
            nome_completo: r.nome_completo?.trim(),
            area_plane: r.area_plane?.trim() || null,
            cod_rp: r.cod_rp?.trim() || null,
            rp: r.rp?.trim() || null,
            codra: r.codra?.trim() || null,
            regiao_adm: r.regiao_adm?.trim() || null,
            cb_imovel: r.cb_imovel?.trim() || null,
            nome: r.nome?.trim() || null,
            tributacao,
            tipologia: r.tipologia?.trim() || null,
            tot_imoveis: r.tot_imoveis ? parseInt(r.tot_imoveis) : null,
            // Non-residential uses areaconst_com, residential uses areaconst_res
            areaconst_res: tributacao === "N"
              ? (r.areaconst_com ? parseInt(r.areaconst_com) : null)
              : (r.areaconst_res ? parseInt(r.areaconst_res) : null),
            exercicio: r.exercicio ? parseInt(r.exercicio) : 2025,
          }));

        if (records.length > 0) {
          const { error } = await supabase
            .from("iptu_2025_logradouro" as any)
            .insert(records as any);
          if (error) {
            console.error("Chunk error:", error);
            stats.errors += records.length;
          } else {
            stats.inserted += records.length;
          }
        }

        setProgress(Math.round(((i + 1) / chunks) * 100));
      }

      if (tributacao === "R") setResStats(stats);
      else setComStats(stats);

      toast({
        title: `${label} importado`,
        description: `${stats.inserted.toLocaleString("pt-BR")} registros inseridos.`,
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
      setProgress(0);
      fetchTableStats();
    }
  }

  async function handleProcess() {
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("processar_iptu_2025" as any);
      if (error) throw error;
      setProcessResult(data as unknown as ProcessResult);
      toast({ title: "Processamento concluído", description: "Dados enriquecidos com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }

  async function handleClearTable() {
    try {
      const { error } = await supabase
        .from("iptu_2025_logradouro" as any)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      setResStats(null);
      setComStats(null);
      setProcessResult(null);
      fetchTableStats();
      toast({ title: "Tabela limpa" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }

  const canProcess = (resStats?.inserted ?? 0) > 0 || (comStats?.inserted ?? 0) > 0 || (tableCount ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          IPTU 2025
        </h4>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {lastImport && <span>Última importação: {lastImport}</span>}
          {tableCount !== null && (
            <Badge variant="secondary" className="text-[10px]">
              {tableCount.toLocaleString("pt-BR")} registros
            </Badge>
          )}
        </div>
      </div>

      {/* Upload buttons */}
      <div className="flex flex-wrap gap-2">
        <input
          ref={resFileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f, "R");
            e.target.value = "";
          }}
        />
        <input
          ref={comFileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f, "N");
            e.target.value = "";
          }}
        />

        <Button
          variant="outline"
          size="sm"
          disabled={uploading !== null}
          onClick={() => resFileRef.current?.click()}
          className="gap-2"
        >
          {uploading === "Residencial" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload Residencial
          {resStats && <CheckCircle className="h-3 w-3 text-green-500" />}
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={uploading !== null}
          onClick={() => comFileRef.current?.click()}
          className="gap-2"
        >
          {uploading === "Não Residencial" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload Não Residencial
          {comStats && <CheckCircle className="h-3 w-3 text-green-500" />}
        </Button>

        <Button
          variant="default"
          size="sm"
          disabled={!canProcess || processing}
          onClick={handleProcess}
          className="gap-2"
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Processar IPTU 2025
        </Button>

        {(tableCount ?? 0) > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearTable}
            className="gap-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Importando {uploading}...</p>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* Upload stats */}
      {(resStats || comStats) && (
        <div className="flex gap-3 text-xs">
          {resStats && (
            <span className="text-muted-foreground">
              Residencial: {resStats.inserted.toLocaleString("pt-BR")} inseridos
              {resStats.errors > 0 && ` (${resStats.errors} erros)`}
            </span>
          )}
          {comStats && (
            <span className="text-muted-foreground">
              Não Residencial: {comStats.inserted.toLocaleString("pt-BR")} inseridos
              {comStats.errors > 0 && ` (${comStats.errors} erros)`}
            </span>
          )}
        </div>
      )}

      {/* Process results */}
      {processResult && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Logradouros residenciais enriquecidos", value: processResult.logradouros_residenciais_enriquecidos },
            { label: "Condomínios com área média", value: processResult.condominios_com_area_media },
            { label: "Logradouros comerciais inseridos", value: processResult.logradouros_comerciais_inseridos },
            { label: "Divergências estimativa vs oficial", value: processResult.condominios_com_divergencia_20pct },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">
                  {item.label}
                </p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {item.value.toLocaleString("pt-BR")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
