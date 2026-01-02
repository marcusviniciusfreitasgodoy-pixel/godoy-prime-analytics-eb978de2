import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FichaVisita, FichaVisitaInsert, StatusVisita } from "@/types/visitas";
import { toast } from "sonner";

export function useVisitas() {
  const queryClient = useQueryClient();

  const { data: fichas, isLoading, error } = useQuery({
    queryKey: ["fichas-visita"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichas_visita" as any)
        .select("*")
        .order("data_visita", { ascending: false });

      if (error) throw error;
      return data as unknown as FichaVisita[];
    },
  });

  const createFicha = useMutation({
    mutationFn: async (ficha: FichaVisitaInsert) => {
      const { data, error } = await supabase
        .from("fichas_visita" as any)
        .insert(ficha)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as FichaVisita;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fichas-visita"] });
      toast.success("Ficha de visita criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar ficha de visita");
      console.error(error);
    },
  });

  const updateFicha = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FichaVisita> & { id: string }) => {
      const { data, error } = await supabase
        .from("fichas_visita" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as FichaVisita;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fichas-visita"] });
      toast.success("Ficha atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar ficha");
      console.error(error);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusVisita }) => {
      const { data, error } = await supabase
        .from("fichas_visita" as any)
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as FichaVisita;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fichas-visita"] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status");
      console.error(error);
    },
  });

  // Returns minimal data for public feedback form (security: sensitive PII removed)
  const getFichaByCodigo = async (codigo: string): Promise<Pick<FichaVisita, 'id' | 'codigo' | 'endereco_imovel' | 'data_visita' | 'nome_corretor' | 'status'> | null> => {
    const { data, error } = await supabase
      .rpc('get_ficha_by_codigo', { p_codigo: codigo });

    if (error || !data || data.length === 0) return null;
    return data[0] as Pick<FichaVisita, 'id' | 'codigo' | 'endereco_imovel' | 'data_visita' | 'nome_corretor' | 'status'>;
  };

  return {
    fichas,
    isLoading,
    error,
    createFicha,
    updateFicha,
    updateStatus,
    getFichaByCodigo,
  };
}
