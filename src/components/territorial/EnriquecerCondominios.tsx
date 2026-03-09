import { useState, useRef, useCallback } from "react";
import { Upload, Sparkles, Download, Copy, Check, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(text: string) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1)
    .map(line => {
      const vals = line.split(sep).map(v => v.replace(/^"|"$/g, "").trim());
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] || ""]));
    })
    .filter((r: any) => r.nome_condominio);
}

// ── SQL generator ─────────────────────────────────────────────────────────────
function generateSQL(results: any[]) {
  const stmts = results
    .filter(r => r.padrao_construtivo)
    .map(r => `UPDATE condominios_mapeamento SET
  padrao_construtivo   = '${r.padrao_construtivo.replace(/'/g, "''")}',
  unidades_estimadas   = ${r.unidades_estimadas || 0},
  numero_torres        = ${r.numero_torres || 0},
  tipologia_predominante = '${(r.tipologia_predominante || "").replace(/'/g, "''")}',
  updated_at           = now()
WHERE id = '${r.id}';`);

  return `-- Enriquecimento gerado em ${new Date().toLocaleDateString("pt-BR")}
-- ${results.length} condomínios · via Claude AI
-- ⚠️ Revise antes de executar no Supabase

${stmts.join("\n\n")}

-- Verificação final
SELECT padrao_construtivo, COUNT(*) as total
FROM condominios_mapeamento
WHERE ativo = true
GROUP BY padrao_construtivo
ORDER BY total DESC;`;
}

const PADRAO_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  "Ultra Luxo": "default",
  "Alto Padrão": "secondary",
  "Médio-Alto Padrão": "outline",
  "Médio Padrão": "outline",
};

const CONF_LABEL: Record<string, string> = {
  alta: "●●●",
  media: "●●○",
  baixa: "●○○",
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const BATCH_SIZE = 6;

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export function EnriquecerCondominios() {
  const [step, setStep] = useState<"upload" | "ready" | "processing" | "done">("upload");
  const [condominios, setCondominios] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentMsg, setCurrentMsg] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [sql, setSql] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const abortRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const rows = parseCSV(e.target?.result as string);
      setCondominios(rows);
      setStep("ready");
    };
    reader.readAsText(file, "utf-8");
  }, []);

  async function start() {
    setStep("processing");
    setResults([]);
    setErrors([]);
    setProgress(0);
    abortRef.current = false;

    const batches: any[][] = [];
    for (let i = 0; i < condominios.length; i += BATCH_SIZE)
      batches.push(condominios.slice(i, i + BATCH_SIZE));

    const all: any[] = [];

    for (let i = 0; i < batches.length; i++) {
      if (abortRef.current) break;

      const batch = batches[i];
      setCurrentMsg(
        `Lote ${i + 1}/${batches.length} — ${batch.map((c: any) => c.nome_condominio).join(", ").slice(0, 70)}…`
      );

      try {
        const { data, error } = await supabase.functions.invoke("enrich-condominios-ai", {
          body: { batch },
        });

        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);

        all.push(...(data.results || []));
        setResults([...all]);
      } catch (e: any) {
        setErrors(prev => [...prev, `Lote ${i + 1}: ${e.message}`]);
      }

      setProgress(Math.round(((i + 1) / batches.length) * 100));
      if (i < batches.length - 1) await sleep(1000);
    }

    setSql(generateSQL(all));
    setStep("done");
  }

  function copySQL() {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function downloadSQL() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([sql], { type: "text/sql" }));
    a.download = `enriquecimento_${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
  }

  const padraoDist = results.reduce((acc: any, r) => {
    if (r.padrao_construtivo) acc[r.padrao_construtivo] = (acc[r.padrao_construtivo] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Enriquecimento IA</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Preenche <code className="text-xs bg-muted px-1 rounded">padrao_construtivo</code>,{" "}
          <code className="text-xs bg-muted px-1 rounded">unidades_estimadas</code> e{" "}
          <code className="text-xs bg-muted px-1 rounded">tipologia_predominante</code> via Claude AI
        </p>
      </div>

      {/* Instruções */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-2">
        <p className="font-semibold text-foreground">Como usar:</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>
            Execute no Supabase SQL Editor:{" "}
            <code className="text-xs bg-muted px-1 rounded break-all">
              SELECT id, nome_condominio, microbairro, logradouro_padrao, endereco_completo
              FROM condominios_mapeamento WHERE ativo = true ORDER BY microbairro
            </code>
          </li>
          <li>Exporte como CSV e importe abaixo</li>
          <li>Clique em Enriquecer — o SQL gerado será aplicado no Supabase</li>
        </ol>
      </div>

      {/* UPLOAD / READY */}
      {(step === "upload" || step === "ready") && (
        <div className="space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
              ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            {step === "ready" ? (
              <>
                <p className="font-medium text-foreground">✅ {condominios.length} condomínios carregados</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.ceil(condominios.length / BATCH_SIZE)} lotes · clique para trocar o arquivo
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">Arraste o CSV ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-1">Exportado do Supabase SQL Editor</p>
              </>
            )}
          </div>

          {step === "ready" && (
            <>
              {/* Preview */}
              <div className="flex flex-wrap gap-1.5">
                {condominios.slice(0, 15).map((c: any, i: number) => (
                  <div key={i} className="text-xs bg-muted rounded px-2 py-1">
                    <span className="font-medium text-foreground">{c.nome_condominio}</span>
                    <span className="text-muted-foreground ml-1">{c.microbairro}</span>
                  </div>
                ))}
                {condominios.length > 15 && (
                  <div className="text-xs bg-muted rounded px-2 py-1 text-muted-foreground">
                    + {condominios.length - 15} outros
                  </div>
                )}
              </div>

              <Button onClick={start} className="w-full" size="lg">
                <Sparkles className="h-4 w-4 mr-2" />
                Enriquecer {condominios.length} condomínios com IA
              </Button>
            </>
          )}
        </div>
      )}

      {/* PROCESSING */}
      {step === "processing" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-foreground">
              <span>{progress}% concluído</span>
              <span>{results.length} / {condominios.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground truncate">{currentMsg}</p>
          </div>

          <Button variant="outline" size="sm" onClick={() => abortRef.current = true}>
            <StopCircle className="h-3.5 w-3.5 mr-1" /> Parar
          </Button>

          {results.length > 0 && (
            <div className="space-y-1">
              {results.slice(-12).reverse().map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border">
                  <span className="font-medium text-foreground truncate flex-1">{r.nome_condominio}</span>
                  <Badge variant={PADRAO_VARIANT[r.padrao_construtivo] || "outline"} className="text-[10px]">
                    {r.padrao_construtivo}
                  </Badge>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {r.unidades_estimadas || "—"} un.
                  </span>
                  <span className="text-muted-foreground">{CONF_LABEL[r.confianca] || "●○○"}</span>
                </div>
              ))}
            </div>
          )}

          {errors.length > 0 && (
            <div className="rounded border border-destructive/30 bg-destructive/5 p-3 space-y-1">
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-destructive">{e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DONE */}
      {step === "done" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Processados", val: results.length },
              { label: "Confiança Alta", val: results.filter(r => r.confianca === "alta").length },
              { label: "Erros", val: errors.length },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-2xl font-bold text-foreground">{s.val}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Distribuição */}
          {Object.keys(padraoDist).length > 0 && (
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-foreground mb-3">
                Distribuição por Padrão
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(padraoDist)
                  .sort((a: any, b: any) => b[1] - a[1])
                  .map(([p, n]: any) => (
                    <div key={p} className="text-center">
                      <p className="text-xl font-bold text-foreground">{n}</p>
                      <p className="text-xs text-muted-foreground">{p}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* SQL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">SQL UPDATE — {results.length} statements</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copySQL}>
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
                <Button variant="outline" size="sm" onClick={downloadSQL}>
                  <Download className="h-3.5 w-3.5 mr-1" /> .sql
                </Button>
              </div>
            </div>
            <pre className="text-[11px] bg-muted/50 border border-border rounded-lg p-4 overflow-auto max-h-80 text-foreground whitespace-pre-wrap">
              {sql.slice(0, 2500)}
              {sql.length > 2500 ? "\n…[baixe o .sql para o arquivo completo]" : ""}
            </pre>
          </div>

          {/* Tabela de resultados */}
          <div className="space-y-1">
            {results.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b border-border">
                <span className="font-medium text-foreground truncate flex-1">{r.nome_condominio}</span>
                <Badge variant={PADRAO_VARIANT[r.padrao_construtivo] || "outline"} className="text-[10px]">
                  {r.padrao_construtivo}
                </Badge>
                <span className="text-muted-foreground whitespace-nowrap">
                  {r.unidades_estimadas ? `${r.unidades_estimadas} un.` : "—"}
                </span>
                <span className="text-muted-foreground">{CONF_LABEL[r.confianca] || "●○○"}</span>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => { setStep("upload"); setCondominios([]); setResults([]); setSql(""); }}
          >
            Processar novo arquivo
          </Button>
        </div>
      )}
    </div>
  );
}
