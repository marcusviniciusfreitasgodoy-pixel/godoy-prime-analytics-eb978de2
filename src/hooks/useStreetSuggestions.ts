import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StreetSuggestion {
  logradouro: string;
  total_transacoes: number;
  nome_condominio?: string;
  microbairro?: string;
  padrao_construtivo?: string;
}

export function useStreetSuggestions(query: string, bairro: string = 'BARRA DA TIJUCA') {
  return useQuery<StreetSuggestion[]>({
    queryKey: ['street-suggestions', query, bairro],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      const searchTerm = query.toUpperCase().trim();
      
      // Remove prefixos comuns para buscar pelo nome
      const cleanedSearch = searchTerm
        .replace(/^(AVENIDA|AVN|AV|AV\.|AVENUE)\s*/i, '')
        .replace(/^(RUA|R|R\.)\s*/i, '')
        .replace(/^(PRAÇA|PRC|PRACA)\s*/i, '')
        .replace(/^(ESTRADA|EST|EST\.)\s*/i, '')
        .replace(/^(ALAMEDA|AL|AL\.)\s*/i, '')
        .replace(/^(TRAVESSA|TV|TV\.)\s*/i, '')
        .trim();

      // 1. Buscar na tabela de mapeamento de condomínios por nome
      const { data: condominios } = await supabase
        .from('condominios_mapeamento')
        .select('logradouro_padrao, nome_condominio, microbairro, padrao_construtivo')
        .or(`nome_condominio.ilike.%${cleanedSearch}%,nome_condominio.ilike.%${searchTerm}%,logradouro_padrao.ilike.%${cleanedSearch}%`);

      // Criar mapa de logradouros para dados do condomínio
      const condominioMap = new Map<string, { nome: string; microbairro?: string; padrao?: string }>();
      (condominios || []).forEach(c => {
        condominioMap.set(c.logradouro_padrao, {
          nome: c.nome_condominio,
          microbairro: c.microbairro || undefined,
          padrao: c.padrao_construtivo || undefined,
        });
      });

      // 2. Buscar transações por logradouro OU pelos logradouros dos condomínios encontrados
      const condominioLogradouros = (condominios || []).map(c => c.logradouro_padrao);
      
      let orConditions = `logradouro.ilike.%${cleanedSearch}%,logradouro.ilike.%${searchTerm}%`;
      
      // Adicionar logradouros dos condomínios encontrados
      if (condominioLogradouros.length > 0) {
        const condLogConditions = condominioLogradouros.map(l => `logradouro.eq.${l}`).join(',');
        orConditions += `,${condLogConditions}`;
      }

      const { data, error } = await supabase
        .from('itbi_transactions')
        .select('logradouro')
        .eq('uso', 'Residencial')
        .ilike('bairro', bairro)
        .or(orConditions)
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

      // Criar sugestões com dados do condomínio quando disponíveis
      const suggestions: StreetSuggestion[] = Object.entries(grouped)
        .map(([logradouro, total_transacoes]) => {
          const condInfo = condominioMap.get(logradouro);
          return {
            logradouro,
            total_transacoes,
            nome_condominio: condInfo?.nome,
            microbairro: condInfo?.microbairro,
            padrao_construtivo: condInfo?.padrao,
          };
        })
        .sort((a, b) => {
          // Priorizar resultados com nome de condomínio
          if (a.nome_condominio && !b.nome_condominio) return -1;
          if (!a.nome_condominio && b.nome_condominio) return 1;
          // Depois por quantidade de transações
          return b.total_transacoes - a.total_transacoes;
        })
        .slice(0, 10);

      // Adicionar condomínios sem transações ainda (para permitir descoberta)
      const suggestedLogradouros = new Set(suggestions.map(s => s.logradouro));
      (condominios || []).forEach(c => {
        if (!suggestedLogradouros.has(c.logradouro_padrao) && suggestions.length < 12) {
          suggestions.push({
            logradouro: c.logradouro_padrao,
            total_transacoes: 0,
            nome_condominio: c.nome_condominio,
            microbairro: c.microbairro || undefined,
            padrao_construtivo: c.padrao_construtivo || undefined,
          });
        }
      });

      return suggestions;
    },
    enabled: query.length >= 2,
    staleTime: 30000,
  });
}
