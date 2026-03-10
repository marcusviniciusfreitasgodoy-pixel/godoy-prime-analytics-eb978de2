import { useState, useCallback, useMemo } from "react";
import { MapPin, Copy, Check, Loader2, RefreshCw, AlertCircle, Play, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Normalização para matching ────────────────────────────────────────────────
function normalize(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const tokensA = na.split(" ").filter(Boolean);
  const tokensB = nb.split(" ").filter(Boolean);
  const common = tokensA.filter(t => tokensB.includes(t));
  const score = (2 * common.length) / (tokensA.length + tokensB.length);
  return score;
}

type MatchRow = {
  id: string;
  nome_banco: string;
  logradouro_atual: string;
  logradouro_sugerido: string;
  bairro_sugerido: string;
  score: number;
  selected: boolean;
};

function generateSQL(rows: MatchRow[]): string {
  const stmts = rows.map(
    r =>
      `UPDATE condominios_mapeamento SET logradouro_padrao = '${r.logradouro_sugerido.replace(/'/g, "''")}', updated_at = now() WHERE id = '${r.id}';`
  );
  return `-- Atualização de logradouros · ${new Date().toLocaleDateString("pt-BR")}
-- ${rows.length} registros selecionados
-- ⚠️ Revise antes de executar

${stmts.join("\n")}`;
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export function AtualizarLogradouros() {
  const [condominios, setCondominios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [step, setStep] = useState<"input" | "preview" | "done">("input");
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);

  const loadCondominios = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const { data, error } = await supabase
      .from("condominios_mapeamento")
      .select("id, nome_condominio, logradouro_padrao, microbairro")
      .eq("ativo", true)
      .order("nome_condominio");
    setLoading(false);
    if (error) {
      setLoadError(error.message);
      return;
    }
    setCondominios(data || []);
  }, []);

  // Load on first render
  useState(() => {
    loadCondominios();
  });

  function cruzarDados() {
    if (!pastedText.trim()) {
      toast.error("Cole a lista de condomínios na área de texto.");
      return;
    }
    if (condominios.length === 0) {
      toast.error("Nenhum condomínio carregado do banco.");
      return;
    }

    const lines = pastedText
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    const parsed = lines.map(line => {
      const parts = line.split("|").map(p => p.trim());
      return {
        nome: parts[0] || "",
        logradouro: parts[1] || "",
        bairro: parts[2] || "",
      };
    }).filter(p => p.nome && p.logradouro);

    const result: MatchRow[] = [];
    const THRESHOLD = 0.5;

    for (const entry of parsed) {
      let bestMatch: any = null;
      let bestScore = 0;

      for (const condo of condominios) {
        const score = similarity(entry.nome, condo.nome_condominio);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = condo;
        }
      }

      if (bestMatch && bestScore >= THRESHOLD) {
        // Only include if logradouro is actually different
        const currentNorm = normalize(bestMatch.logradouro_padrao);
        const suggestedNorm = normalize(entry.logradouro);
        if (currentNorm !== suggestedNorm) {
          result.push({
            id: bestMatch.id,
            nome_banco: bestMatch.nome_condominio,
            logradouro_atual: bestMatch.logradouro_padrao,
            logradouro_sugerido: entry.logradouro,
            bairro_sugerido: entry.bairro,
            score: bestScore,
            selected: bestScore >= 0.8,
          });
        }
      }
    }

    result.sort((a, b) => b.score - a.score);
    setMatches(result);
    setStep("preview");

    if (result.length === 0) {
      toast.info("Nenhuma diferença de logradouro encontrada nos matches.");
    }
  }

  function toggleRow(id: string) {
    setMatches(prev =>
      prev.map(r => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  }

  function toggleAll(checked: boolean) {
    setMatches(prev => prev.map(r => ({ ...r, selected: checked })));
  }

  const selectedRows = useMemo(() => matches.filter(r => r.selected), [matches]);

  function copySQL() {
    if (selectedRows.length === 0) {
      toast.error("Selecione ao menos um registro.");
      return;
    }
    navigator.clipboard.writeText(generateSQL(selectedRows));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast.success(`${selectedRows.length} statements copiados!`);
  }

  async function aplicarDireto() {
    if (selectedRows.length === 0) {
      toast.error("Selecione ao menos um registro.");
      return;
    }

    setApplying(true);
    let ok = 0;
    let fail = 0;

    for (const row of selectedRows) {
      const { error } = await supabase
        .from("condominios_mapeamento")
        .update({ logradouro_padrao: row.logradouro_sugerido, updated_at: new Date().toISOString() })
        .eq("id", row.id);

      if (error) {
        fail++;
        console.error(`Falha ao atualizar ${row.nome_banco}:`, error.message);
      } else {
        ok++;
      }
    }

    setApplying(false);

    if (fail === 0) {
      toast.success(`${ok} logradouros atualizados com sucesso!`);
    } else {
      toast.warning(`${ok} atualizados, ${fail} com erro.`);
    }
    setStep("done");
  }

  function reset() {
    setPastedText("");
    setMatches([]);
    setStep("input");
    loadCondominios();
  }

  const allSelected = matches.length > 0 && matches.every(r => r.selected);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Atualizar Logradouros</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Cole uma lista no formato <code className="text-xs bg-muted px-1 rounded">Nome | Logradouro | Bairro</code> para cruzar e atualizar logradouros dos condomínios.
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando condomínios…</span>
        </div>
      )}

      {loadError && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{loadError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadCondominios}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Tentar novamente
          </Button>
        </div>
      )}

      {/* INPUT step */}
      {!loading && !loadError && step === "input" && (
        <div className="space-y-4">
          <Badge variant="secondary">{condominios.length} condomínios ativos carregados</Badge>

          <Textarea
            placeholder={`Exemplo:\nAlphaville Barra da Tijuca | Avenida das Américas | BARRA DA TIJUCA\nCondomínio Del Lago | Estrada do Pontal | RECREIO DOS BANDEIRANTES`}
            className="min-h-[200px] font-mono text-xs"
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
          />

          <Button onClick={cruzarDados} className="w-full" size="lg" disabled={!pastedText.trim()}>
            <Play className="h-4 w-4 mr-2" />
            Cruzar Dados
          </Button>
        </div>
      )}

      {/* PREVIEW step */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{matches.length} matches encontrados</Badge>
              <Badge variant="outline">{selectedRows.length} selecionados</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recomeçar
            </Button>
          </div>

          {matches.length > 0 && (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={(c) => toggleAll(!!c)}
                          />
                        </TableHead>
                        <TableHead className="text-xs">Nome no banco</TableHead>
                        <TableHead className="text-xs">Logradouro atual</TableHead>
                        <TableHead className="text-xs">Logradouro sugerido</TableHead>
                        <TableHead className="text-xs w-16 text-center">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matches.map(row => (
                        <TableRow key={row.id} className={row.selected ? "bg-primary/5" : ""}>
                          <TableCell className="py-2">
                            <Checkbox
                              checked={row.selected}
                              onCheckedChange={() => toggleRow(row.id)}
                            />
                          </TableCell>
                          <TableCell className="text-xs font-medium py-2">{row.nome_banco}</TableCell>
                          <TableCell className="text-xs text-muted-foreground py-2">{row.logradouro_atual}</TableCell>
                          <TableCell className="text-xs text-primary font-medium py-2">{row.logradouro_sugerido}</TableCell>
                          <TableCell className="text-xs text-center py-2">
                            <Badge variant={row.score >= 0.8 ? "default" : row.score >= 0.6 ? "secondary" : "outline"} className="text-[10px]">
                              {Math.round(row.score * 100)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={copySQL} disabled={selectedRows.length === 0} className="flex-1">
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? "Copiado!" : `Copiar SQL (${selectedRows.length})`}
                </Button>
                <Button onClick={aplicarDireto} disabled={selectedRows.length === 0 || applying} className="flex-1">
                  {applying ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Database className="h-3.5 w-3.5 mr-1" />
                  )}
                  {applying ? "Aplicando…" : `Aplicar direto (${selectedRows.length})`}
                </Button>
              </div>
            </>
          )}

          {matches.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhuma diferença de logradouro encontrada entre a lista e o banco.
            </div>
          )}
        </div>
      )}

      {/* DONE step */}
      {step === "done" && (
        <div className="space-y-4 text-center py-8">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Check className="h-6 w-6" />
            <span className="text-lg font-semibold">Logradouros atualizados!</span>
          </div>
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" /> Processar outra lista
          </Button>
        </div>
      )}
    </div>
  );
}
