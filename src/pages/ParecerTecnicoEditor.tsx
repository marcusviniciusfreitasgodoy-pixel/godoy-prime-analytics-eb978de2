import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Save, Printer, ArrowLeft, Download } from "lucide-react";
import { useParecerTecnico } from "@/hooks/useParecerTecnico";
import { ParecerForm } from "@/components/parecer/ParecerForm";
import { ParecerPreview } from "@/components/parecer/ParecerPreview";
import { ImportarAvaliacaoDialog } from "@/components/parecer/ImportarAvaliacaoDialog";
import { prefillFromAvaliacao } from "@/lib/parecer/prefillFromAvaliacao";
import { findForbidden } from "@/lib/parecer/types";
import { toast } from "@/hooks/use-toast";
import "@/styles/parecer-print.css";

export default function ParecerTecnicoEditor() {
  const { id } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const avaliacaoId = search.get("avaliacaoId") || undefined;
  const { parecer, setParecer, update, save, saving, currentId, loading, lastSavedAt } =
    useParecerTecnico(id);
  const [importOpen, setImportOpen] = useState(false);

  // Ao criar um novo parecer, o auto-save gera o id; refletir na URL para
  // que reload/refresh continue apontando para o mesmo registro.
  useEffect(() => {
    if (!id && currentId) {
      navigate(`/parecer-tecnico/${currentId}`, { replace: true });
    }
  }, [id, currentId, navigate]);

  useEffect(() => {
    if (id || !avaliacaoId) return;
    (async () => {
      const patch = await prefillFromAvaliacao(avaliacaoId);
      if (Object.keys(patch).length) {
        setParecer((prev) => ({ ...prev, ...patch }));
        toast({ title: "Dados da avaliacao carregados" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avaliacaoId, id]);

  const handleSave = async () => {
    // Check all text fields for forbidden phrases
    const textFields: string[] = [
      parecer.objetivo, parecer.finalidade, parecer.pressupostos,
      parecer.diagnostico_regiao, parecer.fundamentacao_metodologica,
      parecer.observacoes_perito, parecer.reformas,
      parecer.riscos_estruturais, parecer.riscos_documentais, parecer.riscos_condominiais,
      parecer.alavancagem, parecer.conclusao,
      ...parecer.argumentos,
    ];
    const forbiddenFound = new Set<string>();
    for (const t of textFields) {
      for (const p of findForbidden(t || "")) forbiddenFound.add(p);
    }
    if (forbiddenFound.size > 0) {
      toast({
        title: "Termos proibidos detectados",
        description: `Remova: ${Array.from(forbiddenFound).join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    const savedId = await save();
    if (savedId) {
      toast({ title: "Parecer salvo" });
      if (!id && savedId) navigate(`/parecer-tecnico/${savedId}`, { replace: true });
    }
  };

  const handlePrint = () => window.print();

  const handleImport = async (avaliacaoId: string) => {
    const patch = await prefillFromAvaliacao(avaliacaoId);
    if (!Object.keys(patch).length) {
      toast({ title: "Não foi possível carregar a avaliação", variant: "destructive" });
      return;
    }
    const hasContent = !!(parecer.endereco_imovel || parecer.bairro || parecer.valor_mercado);
    if (hasContent) {
      const ok = window.confirm(
        "Já existem dados preenchidos. Deseja sobrescrever com os dados desta avaliação?",
      );
      if (!ok) {
        // merge só nos campos vazios
        setParecer((prev) => {
          const merged: any = { ...prev };
          for (const [k, v] of Object.entries(patch)) {
            const cur = (prev as any)[k];
            if (cur === undefined || cur === null || cur === "" || (Array.isArray(cur) && cur.length === 0)) {
              merged[k] = v;
            }
          }
          return merged;
        });
        toast({ title: "Campos vazios preenchidos a partir da avaliação" });
        return;
      }
    }
    setParecer((prev) => ({ ...prev, ...patch }));
    toast({ title: "Dados da avaliação importados" });
  };

  if (loading) return <div className="p-6">Carregando parecer...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 parecer-editor-actions">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold">Gerador de Parecer Tecnico</h1>
            <p className="text-xs text-muted-foreground">Godoy Prime Realty | ABNT NBR 14.653</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Download className="h-4 w-4 mr-1" /> Importar de avaliação
          </Button>
          <span className="text-xs text-muted-foreground self-center">
            {saving
              ? "Salvando..."
              : lastSavedAt
                ? `Salvo automaticamente ${lastSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                : "Alterações são salvas automaticamente"}
          </span>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
        </div>
      </div>

      <ImportarAvaliacaoDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSelect={handleImport}
      />

      <div className="parecer-editor-shell">
        <div className="parecer-editor-form">
          <ParecerForm data={parecer} onChange={update} parecerId={currentId} />
        </div>
        <div className="parecer-editor-preview">
          <ParecerPreview data={parecer} />
        </div>
      </div>
    </div>
  );
}
