import { useState, useCallback, useMemo, useRef } from "react";
import { Upload, Check, Loader2, Sparkles, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const MICROBAIRRO_OPTIONS = [
  "Alambique",
  "Barra Central",
  "Eixo Américas",
  "Eixo Lúcio Costa",
  "Paralela",
  "Península",
  "Recreio",
];

function inferirMicrobairro(logradouro: string, bairro: string): string {
  const log = normalize(logradouro);
  const bNorm = normalize(bairro);

  // Península
  if (
    log.includes("flamboyants") ||
    log.includes("acacias da peninsula") ||
    log.includes("jacarandas da peninsula") ||
    log.includes("bromelias da peninsula") ||
    log.includes("bauhineas da peninsula")
  )
    return "Península";

  // Alambique
  if (log.includes("rachel de queiroz") || log.includes("rosauro estelita") || log.includes("celia ribeiro"))
    return "Alambique";

  // Lúcio Costa — depends on bairro
  if (log.includes("lucio costa")) {
    if (bNorm.includes("recreio")) return "Recreio";
    return "Eixo Lúcio Costa";
  }

  // Recreio keywords
  if (
    log.includes("tim maia") ||
    log.includes("vereador alceu") ||
    log.includes("benvindo de novaes") ||
    log.includes("pontal") ||
    log.includes("henfil")
  )
    return "Recreio";

  // Recreio by bairro
  if (bNorm.includes("recreio")) return "Recreio";

  // Eixo Américas
  if (log.includes("das americas")) return "Eixo Américas";

  // Paralela
  if (
    log.includes("abelardo bueno") ||
    log.includes("ayrton senna") ||
    log.includes("joao cabral") ||
    log.includes("tim lopes")
  )
    return "Paralela";

  return "Barra Central";
}

type AnalysisRow = {
  key: string;
  nome: string;
  logradouro: string;
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
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Parse & analyze ──────────────────────────────────────────────────────
  const processData = useCallback(async (text: string) => {
    if (!text.trim()) {
      toast.error("Nenhum dado para analisar.");
      return;
    }

    setAnalyzing(true);

    const rawLines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const hasHeader = rawLines.length > 0 && normalize(rawLines[0]).includes("nome_condominio");
    const lines = hasHeader ? rawLines.slice(1) : rawLines;

    const isCSV = lines.length > 0 && !lines[0].includes("|") && lines[0].split(",").length >= 2;

    type Parsed = { nome: string; logradouro: string; bairro: string; csvMicrobairro?: string };

    const KNOWN_MICROBAIRROS = MICROBAIRRO_OPTIONS.map(m => normalize(m));

    const parsed: Parsed[] = lines
      .map(line => {
        if (isCSV) {
          const parts = line.split(",").map(p => p.trim());
          return {
            nome: parts[0] || "",
            logradouro: parts[1] || "",
            bairro: "",
            csvMicrobairro: parts[2] || "",
          };
        }
        const parts = line.split("|").map(p => p.trim());
        return { nome: parts[0] || "", logradouro: parts[1] || "", bairro: parts[2] || "" };
      })
      .filter(p => p.nome && p.logradouro);

    // Filter by allowed bairros / known microbairros
    const allowed = parsed.filter(p => {
      if (isCSV && p.csvMicrobairro) {
        return KNOWN_MICROBAIRROS.includes(normalize(p.csvMicrobairro));
      }
      const bNorm = normalize(p.bairro);
      return BAIRROS_PERMITIDOS.some(b => bNorm.includes(b));
    });

    // Load existing
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
        microbairro: entry.csvMicrobairro || inferirMicrobairro(entry.logradouro, entry.bairro),
        exists,
        selected: !exists,
      };
    });

    analysisRows.sort((a, b) => {
      if (a.exists !== b.exists) return a.exists ? 1 : -1;
      return a.nome.localeCompare(b.nome);
    });

    setRows(analysisRows);
    setStep("preview");

    const newCount = analysisRows.filter(r => !r.exists).length;
    const existCount = analysisRows.filter(r => r.exists).length;
    toast.info(`${newCount} novos encontrados, ${existCount} já existem na base`);
  }, []);

  // ── File upload handler ──────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      processData(content);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Row actions ──────────────────────────────────────────────────────────
  function toggleRow(key: string) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, selected: !r.selected } : r));
  }

  function selectAllNew() {
    setRows(prev => prev.map(r => r.exists ? r : { ...r, selected: true }));
  }

  function updateMicrobairro(key: string, value: string) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, microbairro: value } : r));
  }

  const newRows = useMemo(() => rows.filter(r => !r.exists), [rows]);
  const existingRows = useMemo(() => rows.filter(r => r.exists), [rows]);
  const selectedRows = useMemo(() => newRows.filter(r => r.selected), [newRows]);

  // ── Import ───────────────────────────────────────────────────────────────
  async function importarSelecionados() {
    if (selectedRows.length === 0) {
      toast.error("Selecione ao menos um condomínio.");
      return;
    }

    if (!confirm(`Importar ${selectedRows.length} condomínios?`)) return;

    setImporting(true);
    let ok = 0;

    for (let i = 0; i < selectedRows.length; i += 20) {
      const batch = selectedRows.slice(i, i + 20).map(r => ({
        nome_condominio: r.nome,
        logradouro_padrao: r.logradouro,
        microbairro: r.microbairro,
        ativo: true,
      }));

      const { error } = await supabase.from("condominios_mapeamento").insert(batch);
      if (error) {
        console.error("Insert error:", error.message);
      } else {
        ok += batch.length;
      }
    }

    setImporting(false);
    setImportedCount(ok);
    toast.success(`${ok} condomínios importados com sucesso!`);
    setStep("done");
  }

  function reset() {
    setPastedText("");
    setRows([]);
    setStep("input");
    setImportedCount(0);
  }

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Upload className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Importar Condomínios</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Selecione um CSV ou cole uma lista no formato{" "}
          <code className="text-xs bg-muted px-1 rounded">Nome | Logradouro | Bairro</code>.
        </p>
      </div>

      {/* INPUT step */}
      {step === "input" && (
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileRef.current?.click()}
            disabled={analyzing}
          >
            <FileUp className="h-4 w-4 mr-2" />
            Selecionar CSV
          </Button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex-1 border-t border-border" />
            <span>ou cole manualmente</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <Textarea
            placeholder={`Nome | Logradouro | Bairro\nAlphaville Barra | Avenida das Américas | BARRA DA TIJUCA`}
            className="min-h-[160px] font-mono text-xs"
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
          />

          <Button
            onClick={() => processData(pastedText)}
            className="w-full"
            size="lg"
            disabled={!pastedText.trim() || analyzing}
          >
            {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
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
              <Badge variant="outline">{selectedRows.length} selecionados</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllNew}>
                Selecionar todos os novos
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                Recomeçar
              </Button>
            </div>
          </div>

          {/* New rows */}
          {newRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Novos para importar</p>
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 overflow-hidden">
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-emerald-50/50 dark:bg-emerald-900/10">
                        <TableHead className="w-10" />
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Logradouro</TableHead>
                        <TableHead className="text-xs w-[180px]">Microbairro</TableHead>
                        <TableHead className="text-xs w-[80px]">Status</TableHead>
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
                          <TableCell className="py-1.5">
                            <Select value={row.microbairro} onValueChange={v => updateMicrobairro(row.key, v)}>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MICROBAIRRO_OPTIONS.map(opt => (
                                  <SelectItem key={opt} value={opt} className="text-xs">
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]">
                              Novo
                            </Badge>
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
              <p className="text-sm font-semibold text-muted-foreground">Já existem na base</p>
              <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
                <div className="max-h-[200px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Logradouro</TableHead>
                        <TableHead className="text-xs">Microbairro</TableHead>
                        <TableHead className="text-xs w-[80px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {existingRows.map(row => (
                        <TableRow key={row.key} className="opacity-60">
                          <TableCell className="text-xs py-1.5">{row.nome}</TableCell>
                          <TableCell className="text-xs text-muted-foreground py-1.5">{row.logradouro}</TableCell>
                          <TableCell className="text-xs text-muted-foreground py-1.5">{row.microbairro}</TableCell>
                          <TableCell className="py-1.5">
                            <Badge variant="secondary" className="text-[10px]">Já existe</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={importarSelecionados}
            className="w-full"
            size="lg"
            disabled={selectedRows.length === 0 || importing}
          >
            {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {importing ? "Importando…" : `Importar ${selectedRows.length} selecionados`}
          </Button>
        </div>
      )}

      {/* DONE step */}
      {step === "done" && (
        <div className="space-y-4 text-center py-8">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Check className="h-6 w-6" />
            <span className="text-lg font-semibold">{importedCount} condomínios importados com sucesso!</span>
          </div>
          <div className="flex items-start gap-2 justify-center text-sm text-muted-foreground max-w-md mx-auto">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>Execute o <strong>Enriquecimento IA</strong> para completar os dados.</span>
          </div>
          <Button variant="outline" onClick={reset} className="mt-4">
            Importar mais condomínios
          </Button>
        </div>
      )}
    </div>
  );
}
