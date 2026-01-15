import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BairroSuggestion {
  bairro: string;
  total_transacoes: number;
}

export function useBairroSuggestions(query: string) {
  return useQuery<BairroSuggestion[]>({
    queryKey: ["bairro-suggestions", query],
    queryFn: async () => {
      const q = (query || "").trim();
      if (q.length < 2) return [];

      console.debug("[useBairroSuggestions] fetching", { q });

      const { data, error } = await supabase.functions.invoke("public-bairro-suggestions", {
        body: {
          query: q,
          limit: 20,
        },
      });

      if (error) {
        console.error("[useBairroSuggestions] invoke error", { q, error });
        throw error;
      }

      const suggestions = (data?.suggestions || []) as BairroSuggestion[];
      console.debug("[useBairroSuggestions] fetched", { q, count: suggestions.length });
      return suggestions;
    },
    enabled: (query || "").trim().length >= 2,
    staleTime: 30 * 1000,
  });
}

// Mantido por compatibilidade (BairroSelector antigo). Agora retorna lista vazia para evitar
// consultas pesadas sem necessidade.
export function useAllBairros() {
  return useQuery<BairroSuggestion[]>({
    queryKey: ["all-bairros"],
    queryFn: async () => [],
    staleTime: 5 * 60 * 1000,
  });
}
