import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { PIPELINE_COLUMNS } from "@/types/crm";

export function PipelineRealtimeListener() {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const lastCheckRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: recentActivities } = await supabase
        .from("atividades_lead")
        .select("lead_id, usuario_id, usuario_nome, metadata, created_at")
        .eq("tipo", "status_alterado")
        .gt("created_at", lastCheckRef.current)
        .order("created_at", { ascending: false })
        .limit(10);

      if (recentActivities && recentActivities.length > 0) {
        lastCheckRef.current = recentActivities[0].created_at || new Date().toISOString();

        queryClient.invalidateQueries({ queryKey: ["pipeline-leads"] });

        for (const activity of recentActivities) {
          if (activity.usuario_id === user?.id) continue;

          const { data: lead } = await supabase
            .from("leads")
            .select("nome, estagio_pipeline")
            .eq("id", activity.lead_id)
            .single();

          if (!lead) continue;

          const stageLabel =
            PIPELINE_COLUMNS.find((c) => c.id === (lead as any).estagio_pipeline)?.titulo || (lead as any).estagio_pipeline;
          const authorName = activity.usuario_nome || "alguém";

          toast.info(
            `Lead "${(lead as any).nome}" movido para ${stageLabel} por ${authorName}`,
            { duration: 6000 }
          );
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [queryClient, user?.id]);

  return null;
}
