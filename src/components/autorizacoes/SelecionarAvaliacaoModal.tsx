import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, MapPin, FileSignature, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAutorizacoesByValuationIds } from "@/hooks/useAutorizacoes";
import { GerarAutorizacaoDrawer } from "./GerarAutorizacaoDrawer";
import { valuationRowToState } from "@/utils/autorizacaoMapper";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

export function SelecionarAvaliacaoModal({ open, onOpenChange }: Props) {
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: avaliacoes = [], isLoading } = useQuery({
    queryKey: ["avaliacoes-para-autorizacao", user?.id, isAdmin],
    queryFn: async () => {
      let q = supabase
        .from("valuations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!isAdmin && user?.id) q = q.eq("user_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const ids = useMemo(() => avaliacoes.map((a: any) => a.id), [avaliacoes]);
  const { data: autorizacoesMap } = useAutorizacoesByValuationIds(ids);

  const filtered = useMemo(() => {
    if (!search) return avaliacoes;
    const term = search.toLowerCase();
    return avaliacoes.filter((a: any) =>
      (a.logradouro || "").toLowerCase().includes(term) ||
      (a.bairro || "").toLowerCase().includes(term) ||
      (a.proprietario || "").toLowerCase().includes(term)
    );
  }, [avaliacoes, search]);

  const handleSelect = (av: any) => {
    setSelected(av);
    setDrawerOpen(true);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Selecionar Avaliação
            </DialogTitle>
            <DialogDescription>
              Escolha uma avaliação salva para gerar a Autorização de Captação. Os dados do imóvel e proprietário serão pré-preenchidos.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por endereço, bairro ou proprietário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="flex-1 pr-3 -mr-3">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhuma avaliação encontrada.
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((av: any) => {
                  const existing = autorizacoesMap?.get(av.id);
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => !existing && handleSelect(av)}
                      disabled={!!existing}
                      className={`w-full text-left border rounded-lg p-3 transition-colors ${
                        existing
                          ? "bg-muted/40 border-emerald-300 cursor-default"
                          : "hover:border-primary hover:bg-primary/5 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary shrink-0" />
                            <p className="font-medium text-sm truncate">
                              {av.logradouro}{av.numero ? `, ${av.numero}` : ""}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                            {av.bairro} • {av.proprietario || "Sem proprietário"} • {format(new Date(av.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm text-primary">{formatBRL(av.final_value_med)}</p>
                          {existing && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 mt-1 text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Autorização emitida
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {selected && (
        <GerarAutorizacaoDrawer
          open={drawerOpen}
          onOpenChange={(o) => {
            setDrawerOpen(o);
            if (!o) setSelected(null);
          }}
          state={valuationRowToState(selected)}
          valuationId={selected.id}
          defaultValorAvaliacao={selected.final_value_med}
        />
      )}
    </>
  );
}
