import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileCheck2 } from "lucide-react";

interface AvaliacaoRow {
  id: string;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  proprietario_nome: string | null;
  property_area_m2: number | null;
  final_value_med: number | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (avaliacaoId: string) => void;
}

export function ImportarAvaliacaoDialog({ open, onOpenChange, onSelect }: Props) {
  const [rows, setRows] = useState<AvaliacaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [term, setTerm] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("valuations")
        .select("id, logradouro, numero, bairro, proprietario_nome, property_area_m2, final_value_med, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      setRows(((data as unknown) as AvaliacaoRow[]) || []);
      setLoading(false);
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.logradouro, r.bairro, r.proprietario_nome]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t)),
    );
  }, [rows, term]);

  const fmtBRL = (n: number | null) =>
    n ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "-";
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar de avaliação existente</DialogTitle>
          <DialogDescription>
            Selecione uma avaliação para pré-preencher os dados do parecer.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por endereço, bairro ou cliente..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando avaliações...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {rows.length === 0 ? "Nenhuma avaliação encontrada." : "Nenhum resultado para a busca."}
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((r) => (
                <li key={r.id} className="p-3 flex items-center gap-3 hover:bg-muted/40">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {[r.logradouro, r.numero].filter(Boolean).join(", ") || "Sem endereço"}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                      <span>{r.bairro || "-"}</span>
                      {r.proprietario_nome && <span>• {r.proprietario_nome}</span>}
                      {r.property_area_m2 && <span>• {r.property_area_m2} m²</span>}
                      <span>• {fmtBRL(r.final_value_med)}</span>
                      <span>• {fmtDate(r.created_at)}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      onSelect(r.id);
                      onOpenChange(false);
                    }}
                  >
                    <FileCheck2 className="h-4 w-4 mr-1" /> Usar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}