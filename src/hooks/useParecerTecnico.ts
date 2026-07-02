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
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      }
      setLoading(false);
    })();
  }, [id]);

  const update = useCallback((patch: Partial<ParecerTecnico>) => {
    setParecer((prev) => ({ ...prev, ...patch }));
  }, []);

  const save = useCallback(async (): Promise<string | null> => {
    if (!organization?.id) {
      toast({ title: "Organizacao nao carregada", variant: "destructive" });
      return null;
    }
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
        return null;
      }
      savedId = data.id;
      setCurrentId(data.id);
    }
    setSaving(false);
    return savedId || null;
  }, [parecer, organization?.id, currentId]);

  // Auto save (debounced) when a parecer already exists
  useEffect(() => {
    if (!currentId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      save();
    }, 2000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parecer]);

  return { parecer, setParecer, update, loading, save, saving, currentId };
}
