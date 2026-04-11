import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppLog {
  id: string;
  telefone_destino: string;
  tipo_mensagem: string;
  mensagem_texto: string | null;
  status_envio: string;
  resposta_api: any;
  message_id_externo: string | null;
  organization_id: string | null;
  usuario_id: string | null;
  dados_contexto: any;
  erro_mensagem: string | null;
  created_at: string;
}

export function useWhatsAppLogs(filters?: { tipo?: string; status?: string }) {
  return useQuery({
    queryKey: ["whatsapp-logs", filters],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_message_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filters?.tipo) {
        query = query.eq("tipo_mensagem", filters.tipo);
      }
      if (filters?.status) {
        query = query.eq("status_envio", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as WhatsAppLog[];
    },
  });
}
