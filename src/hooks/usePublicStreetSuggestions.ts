import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicStreetSuggestion {
  logradouro: string;
  total_transacoes: number;
  nome_condominio?: string;
  microbairro?: string;
}

export function usePublicStreetSuggestions(query: string, bairro: string = 'BARRA DA TIJUCA') {
  return useQuery<PublicStreetSuggestion[]>({
    queryKey: ['public-street-suggestions', query, bairro],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      const { data, error } = await supabase.functions.invoke('public-itbi-stats', {
        body: {
          action: 'suggestions',
          bairro,
          query,
        }
      });

      if (error) {
        console.error('Error fetching suggestions:', error);
        return [];
      }

      return data?.suggestions || [];
    },
    enabled: query.length >= 2,
    staleTime: 30000,
  });
}