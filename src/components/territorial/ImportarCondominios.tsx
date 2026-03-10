import { useState, useCallback, useMemo } from "react";
import { Upload, Check, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalize(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const BAIRROS_PERMITIDOS = ["barra da tijuca", "recreio dos bandeirantes"];
const BAIRROS_IGNORADOS = [
  "jacarepagua", "leblon", "costa verde", "itaipava",
  "barra olimpica", "gavea", "itanhanga", "copacabana",
  "ipanema", "tijuca", "botafogo", "centro",
];

function inferirMicrobairro(logradouro: string, bairro: string): string {
  const log = normalize(logradouro);
  const bairroNorm = normalize(bairro);

  if (log.includes("lucio costa") || log.includes("sernambetiba")) return "Eixo Lúcio Costa";
  if (log.includes("flamboyants") || log.includes("acacias") || log.includes("jacarandas")) return "Península";
  if (log.includes("rachel de queiroz") || log.includes("rosauro estelita") || log.includes("celia ribeiro")) return "Alambique";
  if (log.includes("das americas") || log.includes("americas")) {
    if (bairroNorm.includes("recreio")) return "Recreio";
    return "Eixo Américas";
  }
  if (log.includes("abelardo bueno") || log.includes("embaixador")) return "Centro Metropolitano";
  if (log.includes("ayrton senna")) return "Ayrton Senna";
  if (log.includes("olegario maciel") || log.includes("erico verissimo")) return "Jardim Oceânico";
  if (log.includes("dulcidio cardoso")) return "ABM";
  if (log.includes("mario covas") || log.includes("cesar lattes") || log.includes("henrique cordeiro")) return "Parque das Rosas";
  if (bairroNorm.includes("recreio")) return "Recreio";
  return "Barra Central";
}

type ParsedEntry = {
  nome: string;
  logradouro: string;
  bairro: string;
};

type AnalysisRow = {
  key: string;
  nome: string;
  logradouro: string;
  bairro: string;
  microbairro: string;
  exists: boolean;
  selected: boolean;
};

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export function ImportarCondominios() {
  const [pastedText, setPastedText] = useState("");
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [step, setStep] = useState<"input" | "preview" | "done">("input");
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [filteredOutCount, setFilteredOutCount] = useState(0);

  async function analisar() {
    if (!pastedText.trim()) {
      toast.error("Cole a lista de condomínios na área de texto.");
      return;
    }

    setAnalyzing(true);

    // Parse lines — detect CSV (comma-separated) vs pipe-separated
    const rawLines = pastedText.split("\n").map(l => l.trim()).filter(Boolean);

    // Skip CSV header if present
    const hasHeader = rawLines.length > 0 && normalize(rawLines[0]).includes("nome_condominio");
    const lines = hasHeader ? rawLines.slice(1) : rawLines;

    // Detect format: CSV uses commas without pipes
    const isCSV = lines.length > 0 && !lines[0].includes("|") && lines[0].split(",").length >= 3;

    const parsed: ParsedEntry[] = lines
      .map(line => {
        let parts: string[];
        if (isCSV) {
          parts = line.split(",").map(p => p.trim());
          // CSV format: nome_condominio, logradouro_padrao, microbairro, ativo
          // or: nome_condominio, logradouro_padrao, bairro
          return { nome: parts[0] || "", logradouro: parts[1] || "", bairro: parts[2] || "" };
        } else {
          parts = line.split("|").map(p => p.trim());
          return { nome: parts[0] || "", logradouro: parts[1] || "", bairro: parts[2] || "" };
        }
      })
      .filter(p => p.nome && p.logradouro);

    // Filter by allowed bairros
    let filtered = 0;
    const allowed = parsed.filter(p => {
      const bNorm = normalize(p.bairro);
      const isAllowed = BAIRROS_PERMITIDOS.some(b => bNorm.includes(b));
      const isIgnored = BAIRROS_IGNORADOS.some(b => bNorm.includes(b));
      if (!isAllowed || isIgnored) {
        filtered++;
        return false;
      }
      return true;
    });
    setFilteredOutCount(filtered);

    // Load existing condominios
    const { data: existing, error } = await supabase
      .from("condominios_mapeamento")
      .select("id, nome_condominio")
      .eq("ativo", true);

    setAnalyzing(false);

    if (error) {
      toast.error("Erro ao carregar condomínios: " + error.message);
      return;
    }

    const existingNorms = new Set((existing || []).map(c => normalize(c.nome_condominio)));

    const analysisRows: AnalysisRow[] = allowed.map((entry, i) => {
      const nameNorm = normalize(entry.nome);
      const exists = existingNorms.has(nameNorm);
      return {
        key: `${i}-${nameNorm}`,
        nome: entry.nome,
        logradouro: entry.logradouro,
        bairro: entry.bairro,
        microbairro: inferirMicrobairro(entry.logradouro, entry.bairro),
        exists,
        selected: !exists,
      };
    });

    // Sort: new first, then existing
    analysisRows.sort((a, b) => {
      if (a.exists !== b.exists) return a.exists ? 1 : -1;
      return a.nome.localeCompare(b.nome);
    });

    setRows(analysisRows);
    setStep("preview");

    const newCount = analysisRows.filter(r => !r.exists).length;
    const existCount = analysisRows.filter(r => r.exists).length;
    toast.info(`${newCount} novos, ${existCount} já existentes${filtered > 0 ? `, ${filtered} filtrados (bairro fora do escopo)` : ""}`);
  }

  function toggleRow(key: string) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, selected: !r.selected } : r));
  }

  function toggleAllNew(checked: boolean) {
    setRows(prev => prev.map(r => r.exists ? r : { ...r, selected: checked }));
  }

  function updateMicrobairro(key: string, value: string) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, microbairro: value } : r));
  }

  const newRows = useMemo(() => rows.filter(r => !r.exists), [rows]);
  const existingRows = useMemo(() => rows.filter(r => r.exists), [rows]);
  const selectedRows = useMemo(() => newRows.filter(r => r.selected), [newRows]);
  const allNewSelected = newRows.length > 0 && newRows.every(r => r.selected);

  async function importarSelecionados() {
    if (selectedRows.length === 0) {
      toast.error("Selecione ao menos um condomínio para importar.");
      return;
    }

    setImporting(true);
    let ok = 0;
    let fail = 0;

    // Insert in batches of 20
    for (let i = 0; i < selectedRows.length; i += 20) {
      const batch = selectedRows.slice(i, i + 20).map(r => ({
        nome_condominio: r.nome,
        logradouro_padrao: r.logradouro,
        microbairro: r.microbairro,
        ativo: true,
      }));

      const { error } = await supabase
        .from("condominios_mapeamento")
        .insert(batch);

      if (error) {
        fail += batch.length;
        console.error("Insert error:", error.message);
      } else {
        ok += batch.length;
      }
    }

    setImporting(false);
    setImportedCount(ok);

    if (fail === 0) {
      toast.success(`${ok} condomínios adicionados com sucesso!`);
    } else {
      toast.warning(`${ok} adicionados, ${fail} com erro.`);
    }
    setStep("done");
  }

  function reset() {
    setPastedText("");
    setRows([]);
    setStep("input");
    setImportedCount(0);
    setFilteredOutCount(0);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Upload className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Importar Condomínios</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Cole uma lista no formato <code className="text-xs bg-muted px-1 rounded">Nome | Logradouro | Bairro</code> ou CSV <code className="text-xs bg-muted px-1 rounded">nome,logradouro,bairro</code>.
          Apenas Barra da Tijuca e Recreio dos Bandeirantes serão importados.
        </p>
          Apenas Barra da Tijuca e Recreio dos Bandeirantes serão importados.
        </p>
      </div>

      {/* INPUT step */}
      {step === "input" && (
        <div className="space-y-4">
          <Textarea
            placeholder={`Exemplo:\nAlphaville Barra | Avenida das Américas | BARRA DA TIJUCA\nCondomínio Reserva | Estrada do Pontal | RECREIO DOS BANDEIRANTES`}
            className="min-h-[200px] font-mono text-xs"
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
          />

          <Button onClick={analisar} className="w-full" size="lg" disabled={!pastedText.trim() || analyzing}>
            {analyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {analyzing ? "Analisando…" : "Analisar"}
          </Button>
        </div>
      )}

      {/* PREVIEW step */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                {newRows.length} novos
              </Badge>
              <Badge variant="secondary">{existingRows.length} já existem</Badge>
              {filteredOutCount > 0 && (
                <Badge variant="outline">{filteredOutCount} filtrados (bairro)</Badge>
              )}
              <Badge variant="outline">{selectedRows.length} selecionados</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              Recomeçar
            </Button>
          </div>

          {/* New condominios */}
          {newRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Novos para importar</p>
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 overflow-hidden">
                <div className="max-h-[350px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-emerald-50/50 dark:bg-emerald-900/10">
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allNewSelected}
                            onCheckedChange={c => toggleAllNew(!!c)}
                          />
                        </TableHead>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Logradouro</TableHead>
                        <TableHead className="text-xs">Bairro</TableHead>
                        <TableHead className="text-xs w-[180px]">Microbairro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newRows.map(row => (
                        <TableRow key={row.key} className={row.selected ? "bg-emerald-50/30 dark:bg-emerald-900/5" : ""}>
                          <TableCell className="py-1.5">
                            <Checkbox checked={row.selected} onCheckedChange={() => toggleRow(row.key)} />
                          </TableCell>
                          <TableCell className="text-xs font-medium py-1.5">{row.nome}</TableCell>
                          <TableCell className="text-xs text-muted-foreground py-1.5">{row.logradouro}</TableCell>
                          <TableCell className="text-xs text-muted-foreground py-1.5">{row.bairro}</TableCell>
                          <TableCell className="py-1.5">
                            <Input
                              className="h-7 text-xs"
                              value={row.microbairro}
                              onChange={e => updateMicrobairro(row.key, e.target.value)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* Existing condominios */}
          {existingRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Já existem no banco</p>
              <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
                <div className="max-h-[200px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Logradouro</TableHead>
                        <TableHead className="text-xs">Bairro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {existingRows.map(row => (
                        <TableRow key={row.key} className="opacity-60">
                          <TableCell className="text-xs py-1.5">{row.nome}</TableCell>
                          <TableCell className="text-xs text-muted-foreground py-1.5">{row.logradouro}</TableCell>
                          <TableCell className="text-xs text-muted-foreground py-1.5">{row.bairro}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* Import button */}
          <Button
            onClick={importarSelecionados}
            className="w-full"
            size="lg"
            disabled={selectedRows.length === 0 || importing}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {importing ? "Importando…" : `Importar ${selectedRows.length} selecionados`}
          </Button>
        </div>
      )}

      {/* DONE step */}
      {step === "done" && (
        <div className="space-y-4 text-center py-8">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Check className="h-6 w-6" />
            <span className="text-lg font-semibold">{importedCount} condomínios adicionados!</span>
          </div>
          <div className="flex items-start gap-2 justify-center text-sm text-muted-foreground max-w-md mx-auto">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>Lembre-se de rodar o <strong>Enriquecimento IA → Classificação IA</strong> para preencher padrão construtivo, tipologia e unidades estimadas.</span>
          </div>
          <Button variant="outline" onClick={reset} className="mt-4">
            Importar mais condomínios
          </Button>
        </div>
      )}
    </div>
  );
}
