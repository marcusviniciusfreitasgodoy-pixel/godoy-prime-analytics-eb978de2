import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FichaVisita, FichaVisitaInsert, StatusVisita } from "@/types/visitas";
import { sendFeedbackRequestEmail } from "@/utils/visitEmailService";
import { enviarFichaCompletaPosVisita } from "@/utils/whatsappService";
import { toast } from "sonner";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_FICHAS_VISITA } from "@/data/demoData";

export function useVisitas() {
  const queryClient = useQueryClient();
  const { isDemo } = useDemo();

  const { data: fichas, isLoading, error } = useQuery({
    queryKey: ["fichas-visita"],
    queryFn: async () => {
      if (isDemo) return DEMO_FICHAS_VISITA;

      const { data, error } = await supabase
        .from("fichas_visita" as any)
        .select("*")
        .order("data_visita", { ascending: false });

      if (error) throw error;
      return data as unknown as FichaVisita[];
    },
    staleTime: isDemo ? Infinity : 0,
  });

  const createFicha = useMutation({
    mutationFn: async (ficha: FichaVisitaInsert) => {
      if (isDemo) {
        toast.info("Funcionalidade desabilitada no modo demonstração");
        return {} as FichaVisita;
      }

      const { data, error } = await supabase
        .from("fichas_visita" as any)
        .insert(ficha)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as FichaVisita;
    },
    onSuccess: () => {
      if (isDemo) return;
      queryClient.invalidateQueries({ queryKey: ["fichas-visita"] });
      queryClient.invalidateQueries({ queryKey: ["visitas-stats"] });
      toast.success("Ficha de visita criada com sucesso!");
    },
    onError: (error) => {
      if (isDemo) return;
      toast.error("Erro ao criar ficha de visita");
      console.error(error);
    },
  });

  const updateFicha = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FichaVisita> & { id: string }) => {
      if (isDemo) {
        toast.info("Funcionalidade desabilitada no modo demonstração");
        return {} as FichaVisita;
      }

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
      if (isDemo) return;
      queryClient.invalidateQueries({ queryKey: ["fichas-visita"] });
      queryClient.invalidateQueries({ queryKey: ["visitas-stats"] });
      toast.success("Ficha atualizada com sucesso!");
    },
    onError: (error) => {
      if (isDemo) return;
      toast.error("Erro ao atualizar ficha");
      console.error(error);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusVisita }) => {
      if (isDemo) {
        toast.info("Funcionalidade desabilitada no modo demonstração");
        return {} as FichaVisita;
      }

      const { data, error } = await supabase
        .from("fichas_visita" as any)
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as FichaVisita;
    },
    onSuccess: async (data) => {
      if (isDemo) return;
      queryClient.invalidateQueries({ queryKey: ["fichas-visita"] });
      queryClient.invalidateQueries({ queryKey: ["visitas-stats"] });
      toast.success("Status atualizado!");

      if (data.status === "realizada") {
        const baseUrl = getPublicAppUrl();
        const signatureVisitanteUrl = `${baseUrl}/visitas/assinatura/${data.codigo}/visitante`;
        const signatureCorretorUrl = `${baseUrl}/visitas/assinatura/${data.codigo}/corretor`;

        // Enviar link de assinatura + feedback ao visitante por email
        if (data.email_visitante) {
          try {
            await sendFeedbackRequestEmail(data.email_visitante, {
              nome_visitante: data.nome_visitante,
              endereco_imovel: data.endereco_imovel,
              codigo_visita: data.codigo,
            });
            toast.success("Email de feedback enviado ao visitante!");
          } catch (err) {
            console.error("Erro ao enviar email de feedback:", err);
          }
        }

        // Enviar ficha completa + assinatura + feedback ao visitante por WhatsApp
        if (data.telefone_visitante) {
          try {
            const resultado = await enviarFichaCompletaPosVisita(data.telefone_visitante, data);
            if (resultado.success) {
              toast.success("WhatsApp com ficha completa enviado!");
            }
          } catch (err) {
            console.error("Erro ao enviar WhatsApp pós-visita:", err);
          }
        }

        // Notificar corretor com link de assinatura por email
        if (data.corretor_id) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email, full_name, phone" as any)
              .eq("id", data.corretor_id)
              .single();
            const corretorProfile = profile as unknown as { email: string | null; full_name: string; phone: string | null } | null;
            if (corretorProfile?.email) {
              await import("@/utils/visitEmailService").then(m =>
                m.sendCorretorAgendamentoEmail(corretorProfile!.email!, {
                  nome_visitante: data.nome_visitante,
                  endereco_imovel: data.endereco_imovel,
                  data_hora: data.data_visita,
                  nome_corretor: corretorProfile!.full_name,
                })
              );
            }
            // Enviar WhatsApp ao corretor com ficha completa
            if (corretorProfile?.phone) {
              try {
                const resultado = await enviarFichaCompletaPosVisita(corretorProfile.phone, data);
                if (resultado.success) {
                  toast.success("WhatsApp enviado ao corretor!");
                }
              } catch (errWa) {
                console.error("Erro ao enviar WhatsApp ao corretor:", errWa);
              }
            }
          } catch (err) {
            console.error("Erro ao notificar corretor:", err);
          }
        }
      }
    },
    onError: (error) => {
      if (isDemo) return;
      toast.error("Erro ao atualizar status");
      console.error(error);
    },
  });

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
