import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AgendamentoVisita, AgendamentoVisitaInsert, StatusVisita } from "@/types/visitas";
import { sendAgendamentoConfirmadoEmail } from "@/utils/visitEmailService";
import { enviarConfirmacaoAgendamento, enviarReagendamentoVisita, enviarCancelamentoVisita } from "@/utils/whatsappService";
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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos-visita"] });
      toast.success("Agendamento criado com sucesso!");

      // Enviar email de confirmação se tiver email
      if (data.email_visitante) {
        try {
          await sendAgendamentoConfirmadoEmail(data.email_visitante, {
            nome_visitante: data.nome_visitante,
            telefone_visitante: data.telefone_visitante,
            endereco_imovel: data.endereco_imovel,
            data_hora: data.data_hora,
          });
          toast.success("Email de confirmação enviado!");
        } catch (err) {
          console.error("Erro ao enviar email:", err);
        }
      }

      // Enviar WhatsApp de confirmação se tiver telefone
      if (data.telefone_visitante) {
        try {
          const resultado = await enviarConfirmacaoAgendamento(data.telefone_visitante, {
            nome_visitante: data.nome_visitante,
            endereco_imovel: data.endereco_imovel,
            data_hora: data.data_hora,
            codigo_imovel: data.codigo_imovel,
            agendamentoId: data.id,
          });
          if (resultado.success) {
            toast.success("WhatsApp de confirmação enviado!");
          } else {
            console.error("Erro ao enviar WhatsApp:", resultado.error);
          }
        } catch (err) {
          console.error("Erro ao enviar WhatsApp:", err);
        }
      }
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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos-visita"] });
      toast.success("Agendamento atualizado!");

      // Enviar WhatsApp de reagendamento se tiver telefone
      if (data.telefone_visitante) {
        try {
          const resultado = await enviarReagendamentoVisita(data.telefone_visitante, {
            nome_visitante: data.nome_visitante,
            endereco_imovel: data.endereco_imovel,
            data_hora: data.data_hora,
            codigo_imovel: data.codigo_imovel,
            agendamentoId: data.id,
          });
          if (resultado.success) {
            toast.success("WhatsApp de reagendamento enviado!");
          }
        } catch (err) {
          console.error("Erro ao enviar WhatsApp:", err);
        }
      }
    },
    onError: (error) => {
      toast.error("Erro ao atualizar agendamento");
      console.error(error);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusVisita }) => {
      // Buscar dados do agendamento antes de atualizar
      const { data: agendamentoAtual } = await supabase
        .from("agendamentos_visita" as any)
        .select("*")
        .eq("id", id)
        .single();

      const statusAnterior = (agendamentoAtual as unknown as AgendamentoVisita)?.status;

      const { data, error } = await supabase
        .from("agendamentos_visita" as any)
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      
      return { 
        agendamento: data as unknown as AgendamentoVisita, 
        statusAnterior,
        novoStatus: status 
      };
    },
    onSuccess: async ({ agendamento, statusAnterior, novoStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["agendamentos-visita"] });
      toast.success("Status atualizado!");

      // Enviar WhatsApp de cancelamento se mudou para cancelada
      if (novoStatus === 'cancelada' && statusAnterior !== 'cancelada' && agendamento.telefone_visitante) {
        try {
          const resultado = await enviarCancelamentoVisita(agendamento.telefone_visitante, {
            nome_visitante: agendamento.nome_visitante,
            endereco_imovel: agendamento.endereco_imovel,
            data_hora: agendamento.data_hora,
          });
          if (resultado.success) {
            toast.success("WhatsApp de cancelamento enviado!");
          }
        } catch (err) {
          console.error("Erro ao enviar WhatsApp:", err);
        }
      }
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
