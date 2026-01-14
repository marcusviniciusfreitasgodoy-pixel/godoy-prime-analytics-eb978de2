import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LastSyncInfo {
  lastTransaction: string | null;
  totalRecords: number;
  formattedDate: string;
  formattedTime: string;
  isRecent: boolean; // Within last 24 hours
}

export function useLastSync() {
  return useQuery({
    queryKey: ['last-sync-info'],
    queryFn: async (): Promise<LastSyncInfo> => {
      // Get the most recent updated_at from itbi_transactions
      const { data, error } = await supabase
        .from('itbi_transactions')
        .select('updated_at, created_at')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .single();

      if (error || !data) {
        return {
          lastTransaction: null,
          totalRecords: 0,
          formattedDate: 'Nunca sincronizado',
          formattedTime: '',
          isRecent: false,
        };
      }

      // Also get total count
      const { count } = await supabase
        .from('itbi_transactions')
        .select('*', { count: 'exact', head: true });

      const lastDate = new Date(data.updated_at || data.created_at);
      const now = new Date();
      const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

      return {
        lastTransaction: data.updated_at || data.created_at,
        totalRecords: count || 0,
        formattedDate: lastDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        formattedTime: lastDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isRecent: diffHours < 24,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
