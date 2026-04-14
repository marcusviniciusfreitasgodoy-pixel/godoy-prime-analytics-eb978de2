import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Loader2, FileText } from "lucide-react";

const VALID_CATEGORIES = ["documentacao", "legislacao", "avaliacao", "mercado", "financiamento", "contratos", "due_diligence"];

interface CSVRow {
  category: string;
  title: string;
  content: string;
  keywords: string;
  source: string;
}

export default function CSVImportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (rows: CSVRow[]) => {
      const records = rows.map(r => ({
        category: r.category,
        title: r.title,
        content: r.content,
        keywords: r.keywords ? r.keywords.split(';').map(k => k.trim()).filter(Boolean) : [],
        source: r.source || null,
        is_active: true,
      }));

      const { error } = await supabase.from('sofia_knowledge_base').insert(records);
      if (error) throw error;
      return records.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['sofia-knowledge-base'] });
      toast.success(`${count} artigos importados com sucesso!`);
      resetState();
    },
    onError: (error) => {
      toast.error(`Erro na importação: ${error.message}`);
    },
  });

  const resetState = () => {
    setPreview([]);
    setErrors([]);
    setIsOpen(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) throw new Error('CSV precisa ter pelo menos 1 linha de dados além do cabeçalho');

    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const catIdx = header.indexOf('categoria');
    const titleIdx = header.indexOf('titulo');
    const contentIdx = header.indexOf('conteudo');
    const kwIdx = header.indexOf('palavras_chave');
    const srcIdx = header.indexOf('fonte');

    if (catIdx === -1 || titleIdx === -1 || contentIdx === -1) {
      throw new Error('CSV precisa ter as colunas: categoria, titulo, conteudo');
    }

    const rows: CSVRow[] = [];
    const errs: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const category = cols[catIdx]?.trim() || '';
      const title = cols[titleIdx]?.trim() || '';
      const content = cols[contentIdx]?.trim() || '';

      if (!title || !content) {
        errs.push(`Linha ${i + 1}: título ou conteúdo vazio`);
        continue;
      }
      if (!VALID_CATEGORIES.includes(category)) {
        errs.push(`Linha ${i + 1}: categoria "${category}" inválida`);
        continue;
      }

      rows.push({
        category,
        title,
        content,
        keywords: kwIdx >= 0 ? cols[kwIdx]?.trim() || '' : '',
        source: srcIdx >= 0 ? cols[srcIdx]?.trim() || '' : '',
      });
    }

    setErrors(errs);
    return rows;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { result.push(current); current = ''; continue; }
      current += char;
    }
    result.push(current);
    return result;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target?.result as string);
        setPreview(rows);
      } catch (err: any) {
        toast.error(err.message);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Artigos via CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Colunas obrigatórias: <strong>categoria, titulo, conteudo</strong></p>
            <p>Colunas opcionais: <strong>palavras_chave</strong> (separadas por ;), <strong>fonte</strong></p>
            <p>Categorias válidas: {VALID_CATEGORIES.join(', ')}</p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />

          {errors.length > 0 && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md max-h-32 overflow-y-auto">
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {preview.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                <span><strong>{preview.length}</strong> artigos prontos para importar</span>
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 text-xs space-y-1">
                {preview.slice(0, 10).map((r, i) => (
                  <p key={i} className="truncate">
                    <span className="text-muted-foreground">[{r.category}]</span> {r.title}
                  </p>
                ))}
                {preview.length > 10 && <p className="text-muted-foreground">...e mais {preview.length - 10}</p>}
              </div>
              <Button
                onClick={() => importMutation.mutate(preview)}
                disabled={importMutation.isPending}
                className="w-full"
              >
                {importMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Importar {preview.length} artigos
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
