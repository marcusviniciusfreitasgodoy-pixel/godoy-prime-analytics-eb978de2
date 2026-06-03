import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPublicAppUrl } from "@/utils/publicUrl";
import { supabase } from "@/integrations/supabase/client";
import { AgendamentoVisita, AgendamentoVisitaInsert, StatusVisita } from "@/types/visitas";
import { sendAgendamentoConfirmadoEmail, sendCorretorAgendamentoEmail } from "@/utils/visitEmailService";
import { enviarConfirmacaoAgendamento, enviarReagendamentoVisita, enviarCancelamentoVisita } from "@/utils/whatsappService";
import { toast } from "sonner";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_AGENDAMENTOS } from "@/data/demoData";

export function useAgendamentos() {
  const queryClient = useQueryClient();
  const { isDemo } = useDemo();

  const { data: agendamentos, isLoading, error } = useQuery({
    queryKey: ["agendamentos-visita"],
    queryFn: async () => {
      if (isDemo) return DEMO_AGENDAMENTOS as unknown as AgendamentoVisita[];

      const { data, error } = await supabase
        .from("agendamentos_visita" as any)
        .select("*")
        .order("data_hora", { ascending: true });

      if (error) throw error;
      return data as unknown as AgendamentoVisita[];
    },
    staleTime: isDemo ? Infinity : 0,
  });

  const createAgendamento = useMutation({
    mutationFn: async (agendamento: AgendamentoVisitaInsert) => {
      if (isDemo) {
        toast.info("Funcionalidade desabilitada no modo demonstração");
        return {} as AgendamentoVisita;
      }

      const { data, error } = await supabase
        .from("agendamentos_visita" as any)
        .insert(agendamento)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AgendamentoVisita;
    },
    onSuccess: async (data) => {
      if (isDemo) return;
      queryClient.invalidateQueries({ queryKey: ["agendamentos-visita"] });
      queryClient.invalidateQueries({ queryKey: ["visitas-stats"] });
      toast.success("Agendamento criado com sucesso!");

      // Auto-criar ficha de visita vinculada ao agendamento
      try {
        const codigo = `VIS-${Date.now().toString(36).toUpperCase()}`;
        let nomeCorretor = "Corretor";
        if (data.corretor_id) {
          const { data: profile } = await supabase
            .from("profiles").select("full_name" as any).eq("id", data.corretor_id).single();
          if (profile) nomeCorretor = (profile as any).full_name || "Corretor";
        }
        await supabase
          .from("fichas_visita" as any)
          .insert({
            codigo,
            agendamento_id: data.id,
            nome_visitante: data.nome_visitante,
            telefone_visitante: data.telefone_visitante,
            email_visitante: data.email_visitante || null,
            cpf_visitante: "A preencher",
            endereco_imovel: data.endereco_imovel,
            codigo_imovel: data.codigo_imovel || null,
            corretor_id: data.corretor_id || null,
            nome_corretor: nomeCorretor,
            nome_proprietario: "A preencher",
            data_visita: data.data_hora,
            status: "agendada" as const,
          });
        queryClient.invalidateQueries({ queryKey: ["fichas-visita"] });
        toast.success("Ficha de visita criada automaticamente!");
      } catch (fichaErr) {
        console.error("Erro ao criar ficha automática:", fichaErr);
      }

      if (data.email_visitante) {
        try {
          const linkConfirmacao = (data as any).token_confirmacao
            ? `${getPublicAppUrl()}/visitas/confirmar/${(data as any).token_confirmacao}`
            : undefined;
          await sendAgendamentoConfirmadoEmail(data.email_visitante, {
            nome_visitante: data.nome_visitante, telefone_visitante: data.telefone_visitante,
            endereco_imovel: data.endereco_imovel, data_hora: data.data_hora,
            link_confirmacao: linkConfirmacao,
          });
          toast.success("Email de confirmação enviado!");
        } catch (err) { console.error("Erro ao enviar email:", err); }
      }

      if (data.corretor_id) {
        try {
          const { data: profile } = await supabase
            .from("profiles").select("email, full_name" as any).eq("id", data.corretor_id).single();
          const corretorProfile = profile as unknown as { email: string | null; full_name: string } | null;
          if (corretorProfile?.email) {
            await sendCorretorAgendamentoEmail(corretorProfile.email, {
              nome_visitante: data.nome_visitante, endereco_imovel: data.endereco_imovel,
              data_hora: data.data_hora, nome_corretor: corretorProfile.full_name,
            });
          }
        } catch (err) { console.error("Erro ao notificar corretor:", err); }
      }

      if (data.telefone_visitante) {
        try {
          const linkConfirmacao = (data as any).token_confirmacao
            ? `${getPublicAppUrl()}/visitas/confirmar/${(data as any).token_confirmacao}`
            : undefined;
          const resultado = await enviarConfirmacaoAgendamento(data.telefone_visitante, {
            nome_visitante: data.nome_visitante, endereco_imovel: data.endereco_imovel,
            data_hora: data.data_hora, codigo_imovel: data.codigo_imovel, agendamentoId: data.id,
            link_confirmacao: linkConfirmacao,
          });
          if (resultado.success) toast.success("WhatsApp de confirmação enviado!");
          else console.error("Erro ao enviar WhatsApp:", resultado.error);
        } catch (err) { console.error("Erro ao enviar WhatsApp:", err); }
      }
    },
    onError: (error) => {
      if (isDemo) return;
      toast.error("Erro ao criar agendamento");
      console.error(error);
    },
  });

  const updateAgendamento = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AgendamentoVisita> & { id: string }) => {
      if (isDemo) {
        toast.info("Funcionalidade desabilitada no modo demonstração");
        return {} as AgendamentoVisita;
      }

      const { data, error } = await supabase
        .from("agendamentos_visita" as any).update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as unknown as AgendamentoVisita;
    },
    onSuccess: async (data) => {
      if (isDemo) return;
      queryClient.invalidateQueries({ queryKey: ["agendamentos-visita"] });
      queryClient.invalidateQueries({ queryKey: ["visitas-stats"] });
      toast.success("Agendamento atualizado!");

      if (data.telefone_visitante) {
        try {
          const resultado = await enviarReagendamentoVisita(data.telefone_visitante, {
            nome_visitante: data.nome_visitante, endereco_imovel: data.endereco_imovel,
            data_hora: data.data_hora, codigo_imovel: data.codigo_imovel, agendamentoId: data.id,
          });
          if (resultado.success) toast.success("WhatsApp de reagendamento enviado!");
        } catch (err) { console.error("Erro ao enviar WhatsApp:", err); }
      }
    },
    onError: (error) => {
      if (isDemo) return;
      toast.error("Erro ao atualizar agendamento");
      console.error(error);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusVisita }) => {
      if (isDemo) {
        toast.info("Funcionalidade desabilitada no modo demonstração");
        return { agendamento: {} as AgendamentoVisita, statusAnterior: undefined, novoStatus: status };
      }

      const { data: agendamentoAtual } = await supabase
        .from("agendamentos_visita" as any).select("*").eq("id", id).single();
      const statusAnterior = (agendamentoAtual as unknown as AgendamentoVisita)?.status;

      const { data, error } = await supabase
        .from("agendamentos_visita" as any).update({ status }).eq("id", id).select().single();
      if (error) throw error;
      return { agendamento: data as unknown as AgendamentoVisita, statusAnterior, novoStatus: status };
    },
    onSuccess: async ({ agendamento, statusAnterior, novoStatus }) => {
      if (isDemo) return;
      queryClient.invalidateQueries({ queryKey: ["agendamentos-visita"] });
      queryClient.invalidateQueries({ queryKey: ["visitas-stats"] });
      toast.success("Status atualizado!");

      if (novoStatus === 'cancelada' && statusAnterior !== 'cancelada') {
        // Auto-cancelar ficha vinculada
        try {
          const { data: fichaVinculada } = await supabase
            .from("fichas_visita" as any)
            .select("id")
            .eq("agendamento_id", agendamento.id)
            .maybeSingle();
          if (fichaVinculada) {
            await supabase
              .from("fichas_visita" as any)
              .update({ status: "cancelada" as const })
              .eq("id", (fichaVinculada as any).id);
            queryClient.invalidateQueries({ queryKey: ["fichas-visita"] });
            toast.info("Ficha de visita cancelada automaticamente");
          }
        } catch (err) { console.error("Erro ao cancelar ficha vinculada:", err); }

        if (agendamento.telefone_visitante) {
          try {
            const resultado = await enviarCancelamentoVisita(agendamento.telefone_visitante, {
              nome_visitante: agendamento.nome_visitante, endereco_imovel: agendamento.endereco_imovel,
              data_hora: agendamento.data_hora,
            });
            if (resultado.success) toast.success("WhatsApp de cancelamento enviado!");
          } catch (err) { console.error("Erro ao enviar WhatsApp:", err); }
        }
      }
    },
    onError: (error) => {
      if (isDemo) return;
      toast.error("Erro ao atualizar status");
      console.error(error);
    },
  });

  const getAgendamentosByDate = async (date: string): Promise<AgendamentoVisita[]> => {
    if (isDemo) {
      return DEMO_AGENDAMENTOS.filter(a => a.data_hora.startsWith(date)) as unknown as AgendamentoVisita[];
    }

    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;
    const { data, error } = await supabase
      .from("agendamentos_visita" as any).select("*")
      .gte("data_hora", startOfDay).lte("data_hora", endOfDay)
      .order("data_hora", { ascending: true });
    if (error) return [];
    return data as unknown as AgendamentoVisita[];
  };

  return { agendamentos, isLoading, error, createAgendamento, updateAgendamento, updateStatus, getAgendamentosByDate };
}
