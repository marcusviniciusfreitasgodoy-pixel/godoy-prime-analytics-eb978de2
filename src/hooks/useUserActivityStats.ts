import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserActivitySummary {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  total_actions: number;
  active_days: number;
  logins: number;
  valuations: number;
  vistorias: number;
  searches: number;
  exports: number;
  first_activity: string | null;
  last_activity: string | null;
}

export function useUserActivityStats() {
  return useQuery({
    queryKey: ['user-activity-stats'],
    queryFn: async () => {
      // Query the view using raw fetch since it's not in the generated types
      const { data, error } = await supabase
        .rpc('get_user_activity_summary' as any)
        .select('*');

      if (error) {
        // Fallback: try direct query
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/view_user_activity_summary?order=last_activity.desc.nullslast`,
          {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            }
          }
        );
        
        if (!response.ok) {
          console.error('Activity stats fetch error');
          return [] as UserActivitySummary[];
        }
        
        const rawData = await response.json();
        return rawData as UserActivitySummary[];
      }
      return (data || []) as unknown as UserActivitySummary[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useRecentActivityLogs(limit = 50) {
  return useQuery({
    queryKey: ['recent-activity-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_activity_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Activity logs error:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 1000 * 60, // 1 minute
  });
}
