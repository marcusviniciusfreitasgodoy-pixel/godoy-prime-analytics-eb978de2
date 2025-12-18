import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type ActionType = 'login' | 'logout' | 'valuation' | 'vistoria' | 'search' | 'export' | 'page_view' | 'document_analysis';

interface TrackOptions {
  details?: Record<string, any>;
  pagePath?: string;
}

export function useActivityTracking() {
  const { user } = useAuth();

  const trackActivity = useCallback(async (
    actionType: ActionType,
    options: TrackOptions = {}
  ) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_activity_logs' as any)
        .insert({
          user_id: user.id,
          action_type: actionType,
          action_details: options.details || {},
          page_path: options.pagePath || window.location.pathname
        });

      if (error) {
        console.error('Error tracking activity:', error);
      }
    } catch (err) {
      console.error('Activity tracking error:', err);
    }
  }, [user?.id]);

  const trackLogin = useCallback(() => {
    trackActivity('login');
  }, [trackActivity]);

  const trackValuation = useCallback((valuationId?: string) => {
    trackActivity('valuation', { details: { valuation_id: valuationId } });
  }, [trackActivity]);

  const trackVistoria = useCallback((propertyAddress?: string) => {
    trackActivity('vistoria', { details: { property: propertyAddress } });
  }, [trackActivity]);

  const trackSearch = useCallback((searchType: string, query?: string) => {
    trackActivity('search', { details: { type: searchType, query } });
  }, [trackActivity]);

  const trackExport = useCallback((exportType: string) => {
    trackActivity('export', { details: { type: exportType } });
  }, [trackActivity]);

  const trackPageView = useCallback((pagePath?: string) => {
    trackActivity('page_view', { pagePath });
  }, [trackActivity]);

  return {
    trackActivity,
    trackLogin,
    trackValuation,
    trackVistoria,
    trackSearch,
    trackExport,
    trackPageView
  };
}
