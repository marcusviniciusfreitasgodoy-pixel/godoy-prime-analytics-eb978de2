import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DisponibilidadeCorretor, DisponibilidadeCorretorInsert } from "@/types/visitas";
import { toast } from "sonner";

export function useDisponibilidade(corretorId?: string) {
  const queryClient = useQueryClient();

  const { data: disponibilidades, isLoading, error } = useQuery({
    queryKey: ["disponibilidade-corretor", corretorId],
    queryFn: async () => {
      let query = supabase
        .from("disponibilidade_corretor" as any)
        .select("*")
        .eq("ativo", true)
        .gte("data", new Date().toISOString().split("T")[0])
        .order("data", { ascending: true });

      if (corretorId) {
        query = query.eq("corretor_id", corretorId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as DisponibilidadeCorretor[];
    },
    enabled: true,
  });

  const createDisponibilidade = useMutation({
    mutationFn: async (disponibilidade: DisponibilidadeCorretorInsert) => {
      const { data, error } = await supabase
        .from("disponibilidade_corretor" as any)
        .insert(disponibilidade)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as DisponibilidadeCorretor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disponibilidade-corretor"] });
      toast.success("Disponibilidade cadastrada!");
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar disponibilidade");
      console.error(error);
    },
  });

  const updateDisponibilidade = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DisponibilidadeCorretor> & { id: string }) => {
      const { data, error } = await supabase
        .from("disponibilidade_corretor" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as DisponibilidadeCorretor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disponibilidade-corretor"] });
      toast.success("Disponibilidade atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar disponibilidade");
      console.error(error);
    },
  });

  const deleteDisponibilidade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("disponibilidade_corretor" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disponibilidade-corretor"] });
      toast.success("Disponibilidade removida!");
    },
    onError: (error) => {
      toast.error("Erro ao remover disponibilidade");
      console.error(error);
    },
  });

  // Busca horários disponíveis para uma data específica
  const getHorariosDisponiveis = async (data: string): Promise<string[]> => {
    const { data: result, error } = await supabase
      .from("disponibilidade_corretor" as any)
      .select("horarios_disponiveis")
      .eq("data", data)
      .eq("ativo", true);

    if (error || !result) return [];

    // Combina todos os horários disponíveis de todos os corretores
    const allHorarios = (result as unknown as { horarios_disponiveis: string[] }[]).flatMap(
      (d) => d.horarios_disponiveis || []
    );
    return [...new Set(allHorarios)].sort();
  };

  return {
    disponibilidades,
    isLoading,
    error,
    createDisponibilidade,
    updateDisponibilidade,
    deleteDisponibilidade,
    getHorariosDisponiveis,
  };
}
