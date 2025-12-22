import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AgendamentoVisita, AgendamentoVisitaInsert, StatusVisita } from "@/types/visitas";
import { toast } from "sonner";

export function useAgendamentos() {
  const queryClient = useQueryClient();

  const { data: agendamentos, isLoading, error } = useQuery({
    queryKey: ["agendamentos-visita"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos_visita" as any)
        .select("*")
        .order("data_hora", { ascending: true });

      if (error) throw error;
      return data as unknown as AgendamentoVisita[];
    },
  });

  const createAgendamento = useMutation({
    mutationFn: async (agendamento: AgendamentoVisitaInsert) => {
      const { data, error } = await supabase
        .from("agendamentos_visita" as any)
        .insert(agendamento)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AgendamentoVisita;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos-visita"] });
      toast.success("Agendamento criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar agendamento");
      console.error(error);
    },
  });

  const updateAgendamento = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AgendamentoVisita> & { id: string }) => {
      const { data, error } = await supabase
        .from("agendamentos_visita" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AgendamentoVisita;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos-visita"] });
      toast.success("Agendamento atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar agendamento");
      console.error(error);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusVisita }) => {
      const { data, error } = await supabase
        .from("agendamentos_visita" as any)
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AgendamentoVisita;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos-visita"] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status");
      console.error(error);
    },
  });

  // Busca agendamentos de uma data específica
  const getAgendamentosByDate = async (date: string): Promise<AgendamentoVisita[]> => {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data, error } = await supabase
      .from("agendamentos_visita" as any)
      .select("*")
      .gte("data_hora", startOfDay)
      .lte("data_hora", endOfDay)
      .order("data_hora", { ascending: true });

    if (error) return [];
    return data as unknown as AgendamentoVisita[];
  };

  return {
    agendamentos,
    isLoading,
    error,
    createAgendamento,
    updateAgendamento,
    updateStatus,
    getAgendamentosByDate,
  };
}
