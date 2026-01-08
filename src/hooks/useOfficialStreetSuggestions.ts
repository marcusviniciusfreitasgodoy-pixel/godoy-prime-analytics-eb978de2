import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeStreetSearchTerm, normalizeAccents } from '@/lib/utils';

export interface OfficialStreetSuggestion {
  logradouro: string;
  logradouro_itbi?: string;
  fonte: 'oficial' | 'itbi' | 'combinado';
  cod_trecho?: number;
  hierarquia?: string;
  tipo_logradouro?: string;
  latitude?: number;
  longitude?: number;
  transaction_count?: number;
  nome_condominio?: string;
  microbairro?: string;
}

/**
 * Hook unificado que busca sugestões de endereços da API oficial da Prefeitura
 * e combina com dados ITBI locais para fornecer autocomplete enriquecido
 */
export function useOfficialStreetSuggestions(query: string, bairro: string = 'BARRA DA TIJUCA') {
  return useQuery<OfficialStreetSuggestion[]>({
    queryKey: ['official-street-suggestions', query, bairro],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      try {
        // Buscar em paralelo: API oficial + dados ITBI locais
        const [officialResult, itbiResult] = await Promise.all([
          // 1. API oficial da Prefeitura (via edge function)
          supabase.functions.invoke('geo-logradouro', {
            body: {
              action: 'search',
              term: query,
              bairro,
            }
          }),
          // 2. Dados ITBI locais
          fetchITBISuggestions(query, bairro)
        ]);

        const officialSuggestions: OfficialStreetSuggestion[] = [];
        const combinedMap = new Map<string, OfficialStreetSuggestion>();

        // Processar resultados oficiais
        if (officialResult.data?.results) {
          for (const result of officialResult.data.results) {
            const normalized = normalizeStreetForITBI(result.logradouro);
            combinedMap.set(normalized.toUpperCase(), {
              logradouro: result.logradouro,
              logradouro_itbi: normalized,
              fonte: 'oficial',
              cod_trecho: result.cod_trecho,
              hierarquia: result.hierarquia,
              tipo_logradouro: result.tipo_logradouro,
              latitude: result.latitude,
              longitude: result.longitude,
            });
          }
        }

        // Processar resultados ITBI e combinar/enriquecer
        for (const itbi of itbiResult) {
          const key = itbi.logradouro.toUpperCase();
          const existing = combinedMap.get(key);
          
          if (existing) {
            // Combina: mantém dados oficiais + adiciona dados ITBI
            existing.fonte = 'combinado';
            existing.transaction_count = itbi.transaction_count;
            existing.nome_condominio = itbi.nome_condominio;
            existing.microbairro = itbi.microbairro;
          } else {
            // Só tem no ITBI
            combinedMap.set(key, {
              logradouro: itbi.logradouro,
              logradouro_itbi: itbi.logradouro,
              fonte: 'itbi',
              transaction_count: itbi.transaction_count,
              nome_condominio: itbi.nome_condominio,
              microbairro: itbi.microbairro,
            });
          }
        }

        // Ordenar: primeiro combinados, depois oficial, depois só ITBI
        // Dentro de cada grupo, ordenar por transaction_count
        const results = Array.from(combinedMap.values()).sort((a, b) => {
          // Prioridade de fonte
          const fontePriority = { combinado: 0, oficial: 1, itbi: 2 };
          const fonteDiff = fontePriority[a.fonte] - fontePriority[b.fonte];
          if (fonteDiff !== 0) return fonteDiff;
          
          // Depois por transaction_count
          return (b.transaction_count || 0) - (a.transaction_count || 0);
        });

        return results.slice(0, 12);
      } catch (error) {
        console.error('Error fetching official suggestions:', error);
        // Fallback: retornar apenas dados ITBI
        return fetchITBISuggestions(query, bairro);
      }
    },
    enabled: query.length >= 2,
    staleTime: 30000,
  });
}

/**
 * Busca sugestões apenas na base ITBI local (fallback)
 */
async function fetchITBISuggestions(query: string, bairro: string): Promise<OfficialStreetSuggestion[]> {
  const normalizedTerm = normalizeStreetSearchTerm(query);
  const normalizedNoAccents = normalizeAccents(normalizedTerm);

  // Buscar transações ITBI
  const { data, error } = await supabase
    .from("itbi_transactions")
    .select("logradouro, total_transacoes")
    .eq("bairro", bairro.toUpperCase())
    .gte("percentual_transferido", 90)
    .not("valor_m2", "is", null)
    .or(`logradouro.ilike.%${normalizedTerm}%,logradouro.ilike.%${normalizedNoAccents}%`)
    .order("total_transacoes", { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching ITBI suggestions:', error);
    return [];
  }

  // Buscar mapeamento de condomínios
  const { data: condominios } = await supabase
    .from("condominios_mapeamento")
    .select("logradouro_padrao, nome_condominio, microbairro")
    .or(`logradouro_padrao.ilike.%${normalizedTerm}%,nome_condominio.ilike.%${normalizedTerm}%`);

  const condominioMap = new Map<string, { nome: string; microbairro?: string }>();
  condominios?.forEach((c) => {
    condominioMap.set(c.logradouro_padrao, {
      nome: c.nome_condominio,
      microbairro: c.microbairro || undefined,
    });
  });

  // Agrupar por logradouro
  const grouped = new Map<string, number>();
  data?.forEach((item) => {
    const key = item.logradouro;
    grouped.set(key, (grouped.get(key) || 0) + (item.total_transacoes || 1));
  });

  // Construir resultados
  return Array.from(grouped.entries())
    .map(([logradouro, count]) => {
      const condo = condominioMap.get(logradouro);
      return {
        logradouro,
        logradouro_itbi: logradouro,
        fonte: 'itbi' as const,
        transaction_count: count,
        nome_condominio: condo?.nome,
        microbairro: condo?.microbairro,
      };
    })
    .sort((a, b) => (b.transaction_count || 0) - (a.transaction_count || 0))
    .slice(0, 12);
}

/**
 * Normaliza nome de logradouro oficial para formato compatível com ITBI
 * Ex: "AVENIDA DAS AMÉRICAS" → "AVN DAS AMERICAS"
 */
export function normalizeStreetForITBI(officialName: string): string {
  if (!officialName) return officialName;
  
  return officialName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toUpperCase()
    .replace(/^AVENIDA\s+/, 'AVN ')
    .replace(/^ESTRADA\s+/, 'EST ')
    .replace(/^TRAVESSA\s+/, 'TV ')
    .replace(/^ALAMEDA\s+/, 'AL ')
    .replace(/^PRAÇA\s+/, 'PRC ')
    .replace(/^LARGO\s+/, 'LGO ')
    .replace(/^LADEIRA\s+/, 'LAD ')
    .replace(/^BECO\s+/, 'BCO ')
    .replace(/^RODOVIA\s+/, 'ROD ')
    .trim();
}
