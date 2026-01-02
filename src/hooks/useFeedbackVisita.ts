import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FeedbackVisita, FeedbackVisitaInsert } from "@/types/visitas";
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
      const { data, error } = await supabase
        .from("feedbacks_visita" as any)
        .insert(feedback)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as FeedbackVisita;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks-visita"] });
      toast.success("Feedback enviado com sucesso! Obrigado.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
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
