import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StreetSuggestion {
  logradouro: string;
  total_transacoes: number;
}

export function useStreetSuggestions(query: string, bairro: string = 'BARRA DA TIJUCA') {
  return useQuery<StreetSuggestion[]>({
    queryKey: ['street-suggestions', query, bairro],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      // Remove prefixos comuns para buscar pelo nome
      const cleanedSearch = query
        .toUpperCase()
        .trim()
        .replace(/^(AVENIDA|AVN|AV|AV\.|AVENUE)\s*/i, '')
        .replace(/^(RUA|R|R\.)\s*/i, '')
        .replace(/^(PRAÇA|PRC|PRACA)\s*/i, '')
        .replace(/^(ESTRADA|EST|EST\.)\s*/i, '')
        .replace(/^(ALAMEDA|AL|AL\.)\s*/i, '')
        .replace(/^(TRAVESSA|TV|TV\.)\s*/i, '')
        .trim();

      const { data, error } = await supabase
        .from('itbi_transactions')
        .select('logradouro')
        .eq('uso', 'Residencial')
        .ilike('bairro', bairro)
        .or(`logradouro.ilike.%${cleanedSearch}%,logradouro.ilike.%${query.toUpperCase()}%`)
        .limit(500);

      if (error) throw error;

      // Agrupar por logradouro e contar transações
      const grouped = (data || []).reduce((acc, t) => {
        if (!acc[t.logradouro]) {
          acc[t.logradouro] = 0;
        }
        acc[t.logradouro]++;
        return acc;
      }, {} as Record<string, number>);

      // Ordenar por quantidade de transações (mais relevantes primeiro)
      const suggestions = Object.entries(grouped)
        .map(([logradouro, total_transacoes]) => ({
          logradouro,
          total_transacoes,
        }))
        .sort((a, b) => b.total_transacoes - a.total_transacoes)
        .slice(0, 8);

      return suggestions;
    },
    enabled: query.length >= 2,
    staleTime: 30000, // Cache por 30 segundos
  });
}
