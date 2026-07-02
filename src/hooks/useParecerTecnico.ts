import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { defaultParecer, ParecerTecnico } from "@/lib/parecer/types";
import { toast } from "@/hooks/use-toast";

export function useParecerTecnico(id?: string) {
  const { organization } = useOrganization();
  const [parecer, setParecer] = useState<ParecerTecnico>(defaultParecer());
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [currentId, setCurrentId] = useState<string | undefined>(id);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("pareceres_tecnicos")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!error && data) {
        setParecer({ ...defaultParecer(), ...(data as any) });
        setCurrentId(data.id);
        setLastSavedAt(new Date());
      }
      setLoading(false);
      hydratedRef.current = true;
    })();
  }, [id]);

  // Marca como hidratado também no fluxo "novo" (sem id)
  useEffect(() => {
    if (!id) hydratedRef.current = true;
  }, [id]);

  const update = useCallback((patch: Partial<ParecerTecnico>) => {
    setParecer((prev) => ({ ...prev, ...patch }));
  }, []);

  const save = useCallback(async (): Promise<string | null> => {
    if (!organization?.id) {
      return null;
    }
    if (savingRef.current) return currentId || null;
    savingRef.current = true;
    setSaving(true);
    const payload: any = {
      ...parecer,
      organization_id: organization.id,
      area_privativa: parecer.area_privativa ? Number(parecer.area_privativa) : null,
      area_total: parecer.area_total ? Number(parecer.area_total) : null,
      quartos: parecer.quartos ? Number(parecer.quartos) : null,
      suites: parecer.suites ? Number(parecer.suites) : null,
      vagas: parecer.vagas ? Number(parecer.vagas) : null,
      ano_construcao: parecer.ano_construcao ? Number(parecer.ano_construcao) : null,
      valor_mercado: parecer.valor_mercado ? Number(parecer.valor_mercado) : null,
      valor_m2_apurado: parecer.valor_m2_apurado ? Number(parecer.valor_m2_apurado) : null,
    };
    delete payload.id;

    let savedId = currentId;
    if (currentId) {
      const { error } = await supabase
        .from("pareceres_tecnicos")
        .update(payload)
        .eq("id", currentId);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        setSaving(false);
        savingRef.current = false;
        return null;
      }
    } else {
      const { data, error } = await supabase
        .from("pareceres_tecnicos")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) {
        toast({ title: "Erro ao salvar", description: error?.message, variant: "destructive" });
        setSaving(false);
        savingRef.current = false;
        return null;
      }
      savedId = data.id;
      setCurrentId(data.id);
    }
    setSaving(false);
    savingRef.current = false;
    dirtyRef.current = false;
    setLastSavedAt(new Date());
    return savedId || null;
  }, [parecer, organization?.id, currentId]);

  // Auto-save (debounced). Cria o registro no primeiro conteudo relevante e
  // continua salvando a cada mudanca. Nao dispara enquanto carrega, sem
  // organizacao, ou sem qualquer conteudo minimo.
  useEffect(() => {
    if (!hydratedRef.current || loading) return;
    if (!organization?.id) return;

    const hasContent = !!(
      parecer.endereco_imovel?.trim() ||
      parecer.bairro?.trim() ||
      parecer.diagnostico_regiao?.trim() ||
      parecer.observacoes_perito?.trim() ||
      parecer.conclusao?.trim() ||
      parecer.valor_mercado?.trim() ||
      (parecer.comparativos && parecer.comparativos.length > 0) ||
      parecer.avaliacao_id
    );
    if (!currentId && !hasContent) return;

    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (dirtyRef.current) save();
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parecer, organization?.id, loading]);

  // Salva imediatamente ao sair da pagina se houver alteracoes pendentes
  useEffect(() => {
    const handler = () => {
      if (dirtyRef.current) save();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [save]);

  return { parecer, setParecer, update, loading, save, saving, currentId, lastSavedAt };
}
