import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

export function FeedbackRealtimeListener() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lastCheckRef = useRef<string>(new Date().toISOString());
  const lastSignatureCheckRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    const interval = setInterval(async () => {
      // --- Poll for new feedbacks ---
      const { data: newFeedbacks } = await supabase
        .from("feedbacks_visita" as any)
        .select("ficha_visita_id, created_at")
        .gt("created_at", lastCheckRef.current)
        .order("created_at", { ascending: false })
        .limit(5);

      if (newFeedbacks && newFeedbacks.length > 0) {
        lastCheckRef.current = (newFeedbacks as any)[0].created_at;

        for (const fb of newFeedbacks as any[]) {
          const { data: ficha } = await supabase
            .from("fichas_visita" as any)
            .select("id, codigo, endereco_imovel, nome_visitante")
            .eq("id", fb.ficha_visita_id)
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
        }

        queryClient.invalidateQueries({ queryKey: ["feedbacks-list"] });
        queryClient.invalidateQueries({ queryKey: ["visitas-stats"] });
        queryClient.invalidateQueries({ queryKey: ["feedback-analytics"] });
      }

      // --- Poll for new signatures ---
      const { data: recentFichas } = await supabase
        .from("fichas_visita" as any)
        .select("id, codigo, endereco_imovel, nome_visitante, assinatura_visitante, assinatura_corretor, updated_at")
        .gt("updated_at", lastSignatureCheckRef.current)
        .order("updated_at", { ascending: false })
        .limit(5);

      if (recentFichas && recentFichas.length > 0) {
        lastSignatureCheckRef.current = (recentFichas as any)[0].updated_at;

        for (const ficha of recentFichas as any[]) {
          if (ficha.assinatura_visitante || ficha.assinatura_corretor) {
            toast.info(
              `✍️ Assinatura registrada — ${ficha.nome_visitante} — ${ficha.endereco_imovel}`,
              {
                duration: 8000,
                action: {
                  label: "Ver ficha",
                  onClick: () => navigate(`/visitas/ficha/${ficha.id}`),
                },
              }
            );
          }
        }

        queryClient.invalidateQueries({ queryKey: ["fichas-visita"] });
        queryClient.invalidateQueries({ queryKey: ["visitas-stats"] });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [navigate, queryClient]);

  return null;
}
