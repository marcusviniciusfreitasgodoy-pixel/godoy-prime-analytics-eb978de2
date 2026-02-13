import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FeedbackVisita, FeedbackVisitaInsert } from "@/types/visitas";
import { sendFeedbackReceivedEmail } from "@/utils/visitEmailService";
import { toast } from "sonner";

export function useFeedbackVisita(fichaVisitaId?: string) {
  const queryClient = useQueryClient();

  const { data: feedbacks, isLoading, error } = useQuery({
    queryKey: ["feedbacks-visita", fichaVisitaId],
    queryFn: async () => {
      let query = supabase
        .from("feedbacks_visita" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (fichaVisitaId) {
        query = query.eq("ficha_visita_id", fichaVisitaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as FeedbackVisita[];
    },
    enabled: true,
  });

  const createFeedback = useMutation({
    mutationFn: async (feedback: FeedbackVisitaInsert) => {
      const { data, error } = await supabase.functions.invoke("public-submit", {
        body: { action: "feedback", payload: feedback },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return null;
    },
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks-visita"] });
      toast.success("Feedback enviado com sucesso! Obrigado.");

      // Notificar corretor e agência sobre o feedback recebido
      try {
        const { data: ficha } = await supabase
          .from("fichas_visita" as any)
          .select("id, codigo, endereco_imovel, nome_visitante, nome_corretor, corretor_id")
          .eq("id", variables.ficha_visita_id)
          .single();

        const fichaData = ficha as unknown as {
          codigo: string;
          endereco_imovel: string;
          nome_visitante: string;
          nome_corretor: string;
          corretor_id: string | null;
        } | null;

        if (fichaData?.corretor_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name" as any)
            .eq("id", fichaData.corretor_id)
            .single();
          const corretorProfile = profile as unknown as { email: string | null; full_name: string } | null;

          if (corretorProfile?.email) {
            await sendFeedbackReceivedEmail(corretorProfile.email, {
              nome_visitante: fichaData.nome_visitante,
              endereco_imovel: fichaData.endereco_imovel,
              nome_corretor: corretorProfile.full_name,
              codigo_visita: fichaData.codigo,
            });
          }
        }
      } catch (err) {
        console.error("Erro ao notificar sobre feedback:", err);
      }
    },
    onError: (error: any) => {
      const message =
        (typeof error === "object" && error && "message" in error && typeof error.message === "string")
          ? error.message
          : error instanceof Error
            ? error.message
            : JSON.stringify(error);

      toast.error(`Erro ao enviar feedback: ${message}`);
      console.error("createFeedback error:", error);
    },
  });

  // Busca feedback por código da ficha de visita (usado na página pública)
  const getFeedbackByCodigoVisita = async (codigoVisita: string): Promise<FeedbackVisita | null> => {
    // Primeiro busca a ficha pelo código
    const { data: ficha, error: fichaError } = await supabase
      .from("fichas_visita" as any)
      .select("id")
      .eq("codigo", codigoVisita)
      .single();

    if (fichaError || !ficha) return null;

    const fichaData = ficha as unknown as { id: string };

    // Depois busca o feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from("feedbacks_visita" as any)
      .select("*")
      .eq("ficha_visita_id", fichaData.id)
      .single();

    if (feedbackError) return null;
    return feedback as unknown as FeedbackVisita;
  };

  // Verifica se já existe feedback para uma ficha
  const checkFeedbackExists = async (fichaVisitaId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("feedbacks_visita" as any)
      .select("id")
      .eq("ficha_visita_id", fichaVisitaId)
      .single();

    return !error && !!data;
  };

  return {
    feedbacks,
    isLoading,
    error,
    createFeedback,
    getFeedbackByCodigoVisita,
    checkFeedbackExists,
  };
}
