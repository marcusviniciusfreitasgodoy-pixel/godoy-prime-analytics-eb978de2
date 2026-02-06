import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

export function FeedbackRealtimeListener() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("feedbacks-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "feedbacks_visita",
        },
        async (payload) => {
          const feedbackData = payload.new as { ficha_visita_id: string };

          // Buscar dados da ficha associada para contexto
          const { data: ficha } = await supabase
            .from("fichas_visita" as any)
            .select("id, codigo, endereco_imovel, nome_visitante")
            .eq("id", feedbackData.ficha_visita_id)
            .single();

          const fichaInfo = ficha as unknown as {
            id: string;
            codigo: string;
            endereco_imovel: string;
            nome_visitante: string;
          } | null;

          toast.success(
            fichaInfo
              ? `Novo feedback de ${fichaInfo.nome_visitante} — ${fichaInfo.endereco_imovel}`
              : "Novo feedback de visita recebido!",
            {
              duration: 8000,
              action: fichaInfo
                ? {
                    label: "Ver ficha",
                    onClick: () => navigate(`/visitas/ficha/${fichaInfo.id}`),
                  }
                : undefined,
            }
          );

          // Invalidate queries to update dashboard charts in real-time
          queryClient.invalidateQueries({ queryKey: ["feedbacks-list"] });
          queryClient.invalidateQueries({ queryKey: ["visitas-stats"] });
          queryClient.invalidateQueries({ queryKey: ["feedback-analytics"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, queryClient]);

  return null;
}
