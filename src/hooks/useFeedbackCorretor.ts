import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FeedbackCorretor {
  id: string;
  ficha_visita_id: string;
  corretor_id: string;
  respostas: Record<string, any>;
  notas_gerais: string | null;
  proximos_passos: string | null;
  organization_id: string | null;
  created_at: string;
}

export interface FeedbackCorretorInsert {
  ficha_visita_id: string;
  corretor_id: string;
  respostas: Record<string, any>;
  notas_gerais?: string | null;
  proximos_passos?: string | null;
}

export function useFeedbackCorretor(fichaVisitaId?: string) {
  const queryClient = useQueryClient();

  const { data: feedback, isLoading } = useQuery({
    queryKey: ["feedback-corretor", fichaVisitaId],
    queryFn: async () => {
      if (!fichaVisitaId) return null;
      const { data, error } = await supabase
        .from("feedbacks_corretor" as any)
        .select("*")
        .eq("ficha_visita_id", fichaVisitaId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as FeedbackCorretor | null;
    },
    enabled: !!fichaVisitaId,
  });

  const createFeedback = useMutation({
    mutationFn: async (input: FeedbackCorretorInsert) => {
      const { data, error } = await supabase
        .from("feedbacks_corretor" as any)
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-corretor"] });
      toast.success("Feedback do corretor registrado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao registrar feedback: ${error.message}`);
    },
  });

  return { feedback, isLoading, createFeedback };
}
