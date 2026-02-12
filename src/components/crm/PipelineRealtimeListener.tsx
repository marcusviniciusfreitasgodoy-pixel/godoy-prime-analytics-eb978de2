import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { PIPELINE_COLUMNS } from "@/types/crm";

export function PipelineRealtimeListener() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();

  useEffect(() => {
    const channel = supabase
      .channel("pipeline-leads-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
        },
        async (payload) => {
          const oldStage = (payload.old as any)?.estagio_pipeline;
          const newStage = (payload.new as any)?.estagio_pipeline;

          // Only act on stage changes
          if (!newStage || oldStage === newStage) {
            queryClient.invalidateQueries({ queryKey: ["pipeline-leads"] });
            return;
          }

          const leadId = (payload.new as any).id;
          const leadName = (payload.new as any).nome || "Lead";

          // Fetch who made the change
          const { data: activity } = await supabase
            .from("atividades_lead")
            .select("usuario_id, usuario_nome")
            .eq("lead_id", leadId)
            .eq("tipo", "status_alterado")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Invalidate to refresh board
          queryClient.invalidateQueries({ queryKey: ["pipeline-leads"] });

          // Suppress toast for the user who performed the action
          if (activity?.usuario_id === user?.id) return;

          const stageLabel =
            PIPELINE_COLUMNS.find((c) => c.id === newStage)?.titulo || newStage;
          const authorName = activity?.usuario_nome || "alguém";

          toast.info(
            `Lead "${leadName}" movido para ${stageLabel} por ${authorName}`,
            { duration: 6000 }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  return null;
}
