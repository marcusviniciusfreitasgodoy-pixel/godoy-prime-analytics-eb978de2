import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Download, Copy, Check, StopCircle, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

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
-- ${results.length} condomínios · via Lovable AI
-- ⚠️ Revise antes de executar

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
  const [step, setStep] = useState<"loading" | "ready" | "processing" | "done">("loading");
  const [condominios, setCondominios] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentMsg, setCurrentMsg] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [sql, setSql] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState("");
  const abortRef = useRef(false);

  const loadCondominios = useCallback(async () => {
    setStep("loading");
    setLoadError("");
    setCondominios([]);
    setResults([]);
    setSql("");

    const { data, error } = await supabase
      .from("condominios_mapeamento")
      .select("id, nome_condominio, microbairro, logradouro_padrao, endereco_completo")
      .eq("ativo", true)
      .order("microbairro");

    if (error) {
      setLoadError(error.message);
      return;
    }

    setCondominios(data || []);
    setStep("ready");
  }, []);

  useEffect(() => { loadCondominios(); }, [loadCondominios]);

  const microbairros = [...new Set(condominios.map(c => c.microbairro).filter(Boolean))];

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

      {/* LOADING */}
      {step === "loading" && !loadError && (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando condomínios ativos…</span>
        </div>
      )}

      {/* LOAD ERROR */}
      {loadError && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{loadError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadCondominios}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Tentar novamente
          </Button>
        </div>
      )}

      {/* READY */}
      {step === "ready" && (
        <div className="space-y-4">
          {/* Badges de resumo */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{condominios.length} condomínios</Badge>
            <Badge variant="outline">{microbairros.length} microbairros</Badge>
            <Badge variant="outline">{Math.ceil(condominios.length / BATCH_SIZE)} lotes</Badge>
          </div>

          {/* Tabela preview */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Condomínio</TableHead>
                    <TableHead className="text-xs">Microbairro</TableHead>
                    <TableHead className="text-xs">Logradouro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {condominios.slice(0, 50).map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-medium py-2">{c.nome_condominio}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-2">{c.microbairro || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground py-2">{c.logradouro_padrao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {condominios.length > 50 && (
              <div className="text-xs text-muted-foreground text-center py-2 border-t border-border bg-muted/30">
                Mostrando 50 de {condominios.length} condomínios
              </div>
            )}
          </div>

          <Button onClick={start} className="w-full" size="lg">
            <Sparkles className="h-4 w-4 mr-2" />
            Enriquecer {condominios.length} condomínios com IA
          </Button>
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
              <p className="text-sm font-semibold text-foreground mb-3">Distribuição por Padrão</p>
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

          <Button variant="outline" className="w-full" onClick={loadCondominios}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Processar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
