import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type UserActivitySummary =
  Database['public']['Views']['view_user_activity_summary']['Row'];

/**
 * Resumo de atividade por usuário, lido da view `view_user_activity_summary`.
 *
 * A view é SECURITY INVOKER e `user_activity_logs` só libera leitura para
 * membros autenticados da organização, portanto a consulta precisa ir pelo
 * client do Supabase (que envia o token da sessão). A versão anterior chamava
 * uma RPC inexistente e caía num fetch com a chave publicável, que sempre
 * voltava vazio em produção.
 */
export function useUserActivityStats() {
  return useQuery({
    queryKey: ['user-activity-stats'],
    queryFn: async (): Promise<UserActivitySummary[]> => {
      const { data, error } = await supabase
        .from('view_user_activity_summary')
        .select('*')
        .order('last_activity', { ascending: false, nullsFirst: false })
        .limit(5000);

      if (error) {
        console.error('Erro ao carregar resumo de atividade:', error.message);
        throw error;
      }
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useRecentActivityLogs(limit = 50) {
  return useQuery({
    queryKey: ['recent-activity-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao carregar registros de atividade:', error.message);
        return [];
      }
      return data ?? [];
    },
    staleTime: 1000 * 60, // 1 minuto
  });
}
