import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export interface StreetSuggestion {
  logradouro: string;
  total_transacoes: number;
  nome_condominio?: string;
  microbairro?: string;
  padrao_construtivo?: string;
  ruas_internas?: string[];
}

/**
 * Hook para debounce de valores
 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useStreetSuggestions(query: string, bairro: string = 'BARRA DA TIJUCA') {
  // Debounce de 400ms para evitar queries excessivas durante digitação
  const debouncedQuery = useDebouncedValue(query, 400);
  const debouncedBairro = useDebouncedValue(bairro, 400);

  return useQuery<StreetSuggestion[]>({
    queryKey: ['street-suggestions', debouncedQuery, debouncedBairro],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];

      const searchTerm = debouncedQuery.toUpperCase().trim();
      
      // Remove prefixos comuns para buscar pelo nome
      let cleanedSearch = searchTerm
        .replace(/^(AVENIDA|AVN|AV|AV\.|AVENUE)\s*/i, '')
        .replace(/^(RUA|R|R\.)\s*/i, '')
        .replace(/^(PRAÇA|PRC|PRACA)\s*/i, '')
        .replace(/^(ESTRADA|EST|EST\.)\s*/i, '')
        .replace(/^(ALAMEDA|AL|AL\.)\s*/i, '')
        .replace(/^(TRAVESSA|TV|TV\.)\s*/i, '')
        .trim();

      // Primeiro: verificar tabela de normalização para obter match direto
      const { data: normalizedMatches } = await supabase
        .from('logradouros_normalizacao')
        .select('logradouro_original, logradouro_normalizado')
        .or(`logradouro_original.ilike.%${cleanedSearch}%,logradouro_normalizado.ilike.%${cleanedSearch}%`)
        .eq('bairro', debouncedBairro)
        .limit(20);

      const normalizedLogradouros = (normalizedMatches || []).map(m => m.logradouro_original);

      // Expandir abreviações comuns para busca
      const abbreviationMap: Record<string, string[]> = {
        'DESENHISTA': ['DESEN', 'DESENHISTA'],
        'DESEN': ['DESEN', 'DESENHISTA'],
        'ALMIRANTE': ['ALMTE', 'ALM', 'ALMIRANTE'],
        'ALMTE': ['ALMTE', 'ALM', 'ALMIRANTE'],
        'DOUTOR': ['DR', 'DOUTOR'],
        'DR': ['DR', 'DOUTOR'],
        'ENGENHEIRO': ['ENG', 'ENGENHEIRO'],
        'ENG': ['ENG', 'ENGENHEIRO'],
        'PROFESSOR': ['PROF', 'PROFESSOR'],
        'PROF': ['PROF', 'PROFESSOR'],
        'GENERAL': ['GEN', 'GENERAL'],
        'GEN': ['GEN', 'GENERAL'],
        'CORONEL': ['CEL', 'CORONEL'],
        'CEL': ['CEL', 'CORONEL'],
        'TENENTE': ['TEN', 'TENENTE'],
        'TEN': ['TEN', 'TENENTE'],
        'CAPITAO': ['CAP', 'CAPITAO'],
        'CAP': ['CAP', 'CAPITAO'],
        'DEPUTADO': ['DEP', 'DEPUTADO'],
        'DEP': ['DEP', 'DEPUTADO'],
        'SENADOR': ['SEN', 'SENADOR'],
        'SEN': ['SEN', 'SENADOR'],
        'PREFEITO': ['PREF', 'PREFEITO'],
        'PREF': ['PREF', 'PREFEITO'],
        'MARECHAL': ['MAL', 'MARECHAL'],
        'MAL': ['MAL', 'MARECHAL'],
      };

      // Corrigir erros de digitação comuns
      const typoCorrections: Record<string, string> = {
        'GUMARAES': 'GUIMARAES',
        'GUIMARAIS': 'GUIMARAES',
        'GIMARAES': 'GUIMARAES',
        'GUIMARÃES': 'GUIMARAES',
        'AMERICAS': 'AMERICAS',
        'AMERCIAS': 'AMERICAS',
        'AMÉRICAS': 'AMERICAS',
        'SERNANBETIBA': 'SERNAMBETIBA',
        'SERNABETIBA': 'SERNAMBETIBA',
        'PENINSULA': 'PENINSULA',
        'PENNINSULA': 'PENINSULA',
        'BANDEIRANTES': 'BANDEIRANTES',
        'BANDIERANTES': 'BANDEIRANTES',
        'ESTELITA': 'ESTELLITA',
        'ESTELLITA': 'ESTELLITA',
        'AYRTON': 'AYRTON',
        'AIRTON': 'AYRTON',
        'SENNA': 'SENNA',
        'SENA': 'SENNA',
      };

      // Aplicar correções
      let correctedSearch = cleanedSearch;
      Object.entries(typoCorrections).forEach(([typo, correction]) => {
        correctedSearch = correctedSearch.replace(new RegExp(typo, 'gi'), correction);
      });

      // Gerar variações de busca
      const searchVariations: string[] = [cleanedSearch, correctedSearch];
      
      // Adicionar logradouros normalizados encontrados
      normalizedLogradouros.forEach(l => {
        if (!searchVariations.includes(l)) searchVariations.push(l);
      });
      
      const words = cleanedSearch.split(/\s+/);
      words.forEach(word => {
        const variations = abbreviationMap[word];
        if (variations) {
          variations.forEach(variation => {
            const newSearch = cleanedSearch.replace(new RegExp(`\\b${word}\\b`, 'gi'), variation);
            if (!searchVariations.includes(newSearch)) {
              searchVariations.push(newSearch);
            }
          });
        }
      });

      // 1. Buscar condomínios (incluindo ruas internas)
      // IMPORTANTE (performance): para termos muito curtos (ex: "am"), a busca por condomínio
      // pode retornar muitos registros e gerar OR conditions gigantes, causando travamentos.
      // Mantemos a busca por condomínio apenas a partir de 3 caracteres e com limite.
      const shouldSearchCondominios = cleanedSearch.length >= 3;

      const condominioOrConditions = [
        ...searchVariations.map(v => `nome_condominio.ilike.%${v}%`),
        ...searchVariations.map(v => `logradouro_padrao.ilike.%${v}%`),
        ...searchVariations.map(v => `logradouro_itbi_normalizado.ilike.%${v}%`),
      ].join(',');

      const { data: condominios } = shouldSearchCondominios
        ? await supabase
            .from('condominios_mapeamento')
            .select('logradouro_padrao, nome_condominio, microbairro, padrao_construtivo, ruas_internas, logradouro_itbi_normalizado')
            .or(condominioOrConditions)
            .limit(80)
        : { data: [] as any[] };

      // Criar mapa de logradouros para dados do condomínio
      const condominioMap = new Map<string, { nome: string; microbairro?: string; padrao?: string; ruasInternas?: string[] }>();
      (condominios || []).forEach(c => {
        // Mapear logradouro principal
        condominioMap.set(c.logradouro_padrao, {
          nome: c.nome_condominio,
          microbairro: c.microbairro || undefined,
          padrao: c.padrao_construtivo || undefined,
          ruasInternas: c.ruas_internas || undefined,
        });
        
        // Também mapear ruas internas para o mesmo condomínio
        if (c.ruas_internas && Array.isArray(c.ruas_internas)) {
          c.ruas_internas.forEach((rua: string) => {
            condominioMap.set(rua, {
              nome: c.nome_condominio,
              microbairro: c.microbairro || undefined,
              padrao: c.padrao_construtivo || undefined,
              ruasInternas: c.ruas_internas || undefined,
            });
          });
        }
      });

      // 2. Buscar transações
      const condominioLogradouros = (condominios || []).flatMap(c => {
        const streets = [c.logradouro_padrao];
        if (c.ruas_internas && Array.isArray(c.ruas_internas)) {
          streets.push(...c.ruas_internas);
        }
        return streets;
      });

      // Deduplicar para evitar OR conditions repetidas
      const uniqueCondominioLogradouros = Array.from(new Set(condominioLogradouros));
      
      // Construir condições OR
      let orConditions = searchVariations.map(v => `logradouro.ilike.%${v}%`).join(',');
      
      // Adicionar logradouros dos condomínios
      if (uniqueCondominioLogradouros.length > 0) {
        const condLogConditions = uniqueCondominioLogradouros.slice(0, 20).map(l => `logradouro.eq.${l}`).join(',');
        orConditions += `,${condLogConditions}`;
      }

      const { data, error } = await supabase
        .from('itbi_transactions')
        .select('logradouro')
        .eq('uso', 'Residencial')
        .ilike('bairro', debouncedBairro)
        .or(orConditions)
        .limit(500);

      if (error) throw error;

      // Agrupar por logradouro
      const grouped = (data || []).reduce((acc, t) => {
        if (!acc[t.logradouro]) {
          acc[t.logradouro] = 0;
        }
        acc[t.logradouro]++;
        return acc;
      }, {} as Record<string, number>);

      // Criar sugestões
      const suggestions: StreetSuggestion[] = Object.entries(grouped)
        .map(([logradouro, total_transacoes]) => {
          const condInfo = condominioMap.get(logradouro);
          return {
            logradouro,
            total_transacoes,
            nome_condominio: condInfo?.nome,
            microbairro: condInfo?.microbairro,
            padrao_construtivo: condInfo?.padrao,
            ruas_internas: condInfo?.ruasInternas,
          };
        })
        .sort((a, b) => {
          // Priorizar resultados com nome de condomínio
          if (a.nome_condominio && !b.nome_condominio) return -1;
          if (!a.nome_condominio && b.nome_condominio) return 1;
          return b.total_transacoes - a.total_transacoes;
        })
        .slice(0, 10);

      // Adicionar condomínios sem transações
      const suggestedLogradouros = new Set(suggestions.map(s => s.logradouro));
      (condominios || []).forEach(c => {
        if (!suggestedLogradouros.has(c.logradouro_padrao) && suggestions.length < 12) {
          suggestions.push({
            logradouro: c.logradouro_padrao,
            total_transacoes: 0,
            nome_condominio: c.nome_condominio,
            microbairro: c.microbairro || undefined,
            padrao_construtivo: c.padrao_construtivo || undefined,
            ruas_internas: c.ruas_internas || undefined,
          });
        }
      });

      return suggestions;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });
}
