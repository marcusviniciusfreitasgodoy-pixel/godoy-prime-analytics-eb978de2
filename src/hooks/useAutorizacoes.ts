import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Autorizacao, AutorizacaoEvento } from "@/types/autorizacao";

export function useAutorizacoes() {
  return useQuery({
    queryKey: ["autorizacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autorizacoes_captacao" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as unknown as Autorizacao[];
    },
  });
}

export function useAutorizacao(id: string | undefined) {
  return useQuery({
    queryKey: ["autorizacao", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("autorizacoes_captacao" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Autorizacao | null;
    },
    enabled: !!id,
  });
}

export function useAutorizacaoEventos(autorizacaoId: string | undefined) {
  return useQuery({
    queryKey: ["autorizacao-eventos", autorizacaoId],
    queryFn: async () => {
      if (!autorizacaoId) return [];
      const { data, error } = await supabase
        .from("autorizacoes_captacao_eventos" as any)
        .select("*")
        .eq("autorizacao_id", autorizacaoId)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as unknown as AutorizacaoEvento[];
    },
    enabled: !!autorizacaoId,
  });
}

export function useCreateAutorizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from("autorizacoes_captacao" as any)
        .insert(payload as any)
        .select("*")
        .single();
      if (error) throw error;
      // Registrar evento de criação
      await supabase.from("autorizacoes_captacao_eventos" as any).insert({
        autorizacao_id: (data as any).id,
        tipo: "criada",
      } as any);
      return data as unknown as Autorizacao;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["autorizacoes"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao criar autorização", { description: err?.message });
    },
  });
}

export function useUpdateAutorizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from("autorizacoes_captacao" as any)
        .update(updates as any)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as Autorizacao;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["autorizacoes"] });
      qc.invalidateQueries({ queryKey: ["autorizacao", vars.id] });
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar autorização", { description: err?.message });
    },
  });
}

export function useEnviarAutorizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (autorizacaoId: string) => {
      const { data, error } = await supabase.functions.invoke("enviar-autorizacao", {
        body: { autorizacao_id: autorizacaoId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["autorizacoes"] });
      qc.invalidateQueries({ queryKey: ["autorizacao", id] });
      toast.success("Autorização enviada ao proprietário");
    },
    onError: (err: any) => {
      toast.error("Erro ao enviar", { description: err?.message });
    },
  });
}