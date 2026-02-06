import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FichaVisita, FichaVisitaInsert, StatusVisita } from "@/types/visitas";
import { sendFeedbackRequestEmail } from "@/utils/visitEmailService";
import { enviarSolicitacaoFeedback } from "@/utils/whatsappService";
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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["fichas-visita"] });
      toast.success("Status atualizado!");

      // Disparo automático de feedback ao marcar como "realizada"
      if (data.status === "realizada") {
        // Enviar email de feedback se tiver email do visitante
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

        // Enviar WhatsApp de feedback se tiver telefone
        if (data.telefone_visitante) {
          try {
            const resultado = await enviarSolicitacaoFeedback(data.telefone_visitante, {
              nome_visitante: data.nome_visitante,
              endereco_imovel: data.endereco_imovel,
              codigo_visita: data.codigo,
            });
            if (resultado.success) {
              toast.success("WhatsApp com link de feedback enviado!");
            }
          } catch (err) {
            console.error("Erro ao enviar WhatsApp de feedback:", err);
          }
        }
      }
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
