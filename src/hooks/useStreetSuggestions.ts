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
      let cleanedSearch = searchTerm
        .replace(/^(AVENIDA|AVN|AV|AV\.|AVENUE)\s*/i, '')
        .replace(/^(RUA|R|R\.)\s*/i, '')
        .replace(/^(PRAÇA|PRC|PRACA)\s*/i, '')
        .replace(/^(ESTRADA|EST|EST\.)\s*/i, '')
        .replace(/^(ALAMEDA|AL|AL\.)\s*/i, '')
        .replace(/^(TRAVESSA|TV|TV\.)\s*/i, '')
        .trim();

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
        'PROCURADOR': ['PROCUR', 'PROCURADOR'],
        'PROCUR': ['PROCUR', 'PROCURADOR'],
        'MARECHAL': ['MAL', 'MARECHAL'],
        'MAL': ['MAL', 'MARECHAL'],
        'COMENDADOR': ['COM', 'COMENDADOR'],
        'COM': ['COM', 'COMENDADOR'],
      };

      // Corrigir erros de digitação comuns e acentuação
      const typoCorrections: Record<string, string> = {
        // Sobrenomes comuns
        'GUMARAES': 'GUIMARAES',
        'GUIMARAIS': 'GUIMARAES',
        'GIMARAES': 'GUIMARAES',
        'GUIMARÃES': 'GUIMARAES',
        'GUIMARAES': 'GUIMARAES',
        'MACHADO': 'MACHADO',
        'MACHDO': 'MACHADO',
        'PEREIRA': 'PEREIRA',
        'PERIERA': 'PEREIRA',
        'PERERIRA': 'PEREIRA',
        'FERREIRA': 'FERREIRA',
        'FEREIRA': 'FERREIRA',
        'FERRIERA': 'FERREIRA',
        'CARDOSO': 'CARDOSO',
        'CARDOZO': 'CARDOSO',
        'OLIVEIRA': 'OLIVEIRA',
        'OLIVIERA': 'OLIVEIRA',
        'RODRIGUES': 'RODRIGUES',
        'RODRIGEZ': 'RODRIGUES',
        'ALMEIDA': 'ALMEIDA',
        'ALMEYDA': 'ALMEIDA',
        'ALMEÍDA': 'ALMEIDA',
        'RIBEIRO': 'RIBEIRO',
        'RIBERO': 'RIBEIRO',
        'PINHEIRO': 'PINHEIRO',
        'PINHERO': 'PINHEIRO',
        
        // Locais específicos Barra/RJ
        'AMERICAS': 'AMERICAS',
        'AMERCIAS': 'AMERICAS',
        'AMÉRICAS': 'AMERICAS',
        'TIJUCA': 'TIJUCA',
        'TIJUICA': 'TIJUCA',
        'SERNANBETIBA': 'SERNAMBETIBA',
        'SERNABETIBA': 'SERNAMBETIBA',
        'SERNAMETIBA': 'SERNAMBETIBA',
        'SERNANBITIBA': 'SERNAMBETIBA',
        'PENINSULA': 'PENINSULA',
        'PENNINSULA': 'PENINSULA',
        'OCEÂNICO': 'OCEANICO',
        'OCEANICO': 'OCEANICO',
        'OCÊANICO': 'OCEANICO',
        'RECREIO': 'RECREIO',
        'RECREIU': 'RECREIO',
        'BANDEIRANTES': 'BANDEIRANTES',
        'BANDIERANTES': 'BANDEIRANTES',
        'BANDEIRANTE': 'BANDEIRANTES',
        
        // Nomes próprios com acentuação
        'LUCIO': 'LUCIO',
        'LÚCIO': 'LUCIO',
        'OLEGARIO': 'OLEGARIO',
        'OLEGÁRIO': 'OLEGARIO',
        'DULCIDIO': 'DULCIDIO',
        'DULCÍDIO': 'DULCIDIO',
        'ERICO': 'ERICO',
        'ÉRICO': 'ERICO',
        'VERISSIMO': 'VERISSIMO',
        'VERÍSSIMO': 'VERISSIMO',
        'VERISIMO': 'VERISSIMO',
        'JOSE': 'JOSE',
        'JOSÉ': 'JOSE',
        'JOAO': 'JOAO',
        'JOÃO': 'JOAO',
        'PAULO': 'PAULO',
        'PÓLO': 'POLO',
        'POLO': 'POLO',
        'MARIA': 'MARIA',
        'ANTONIO': 'ANTONIO',
        'ANTÔNIO': 'ANTONIO',
        'FRANCISCO': 'FRANCISCO',
        'FRANCISO': 'FRANCISCO',
        'MANUEL': 'MANUEL',
        'MANOEL': 'MANOEL',
        'NELSON': 'NELSON',
        'NIELSON': 'NELSON',
        'AYRTON': 'AYRTON',
        'AIRTON': 'AYRTON',
        'SENNA': 'SENNA',
        'SENA': 'SENNA',
        
        // Palavras comuns em logradouros
        'PRACA': 'PRACA',
        'PRAÇA': 'PRACA',
        'ESTACAO': 'ESTACAO',
        'ESTAÇÃO': 'ESTACAO',
        'JARDIM': 'JARDIM',
        'JARDIN': 'JARDIM',
        'PARQUE': 'PARQUE',
        'PARKE': 'PARQUE',
        'CONDOMINIO': 'CONDOMINIO',
        'CONDOMÍNIO': 'CONDOMINIO',
        'CONDMINIO': 'CONDOMINIO',
        'RESIDENCIAL': 'RESIDENCIAL',
        'REZIDENCIAL': 'RESIDENCIAL',
        'EDIFICIO': 'EDIFICIO',
        'EDIFÍCIO': 'EDIFICIO',
        'PREDÍO': 'PREDIO',
        'PREDIO': 'PREDIO',
        'SHOPPING': 'SHOPPING',
        'SHOOPING': 'SHOPPING',
        'SHOPING': 'SHOPPING',
        'METROPOLITANO': 'METROPOLITANO',
        'METROPLITANO': 'METROPOLITANO',
        'ABELARDO': 'ABELARDO',
        'ABELRDO': 'ABELARDO',
        'BUENO': 'BUENO',
        'BUEÑO': 'BUENO',
      };

      // Aplicar correções de digitação
      let correctedSearch = cleanedSearch;
      Object.entries(typoCorrections).forEach(([typo, correction]) => {
        correctedSearch = correctedSearch.replace(new RegExp(typo, 'gi'), correction);
      });

      // Gerar variações de busca baseadas em abreviações
      const searchVariations: string[] = [cleanedSearch, correctedSearch];
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

      // Também aplicar correções nas variações
      const correctedWords = correctedSearch.split(/\s+/);
      correctedWords.forEach(word => {
        const variations = abbreviationMap[word];
        if (variations) {
          variations.forEach(variation => {
            const newSearch = correctedSearch.replace(new RegExp(`\\b${word}\\b`, 'gi'), variation);
            if (!searchVariations.includes(newSearch)) {
              searchVariations.push(newSearch);
            }
          });
        }
      });

      // 1. Buscar na tabela de mapeamento de condomínios por nome
      const condominioOrConditions = [
        ...searchVariations.map(v => `nome_condominio.ilike.%${v}%`),
        ...searchVariations.map(v => `logradouro_padrao.ilike.%${v}%`),
      ].join(',');

      const { data: condominios } = await supabase
        .from('condominios_mapeamento')
        .select('logradouro_padrao, nome_condominio, microbairro, padrao_construtivo')
        .or(condominioOrConditions);

      // Criar mapa de logradouros para dados do condomínio
      const condominioMap = new Map<string, { nome: string; microbairro?: string; padrao?: string }>();
      (condominios || []).forEach(c => {
        condominioMap.set(c.logradouro_padrao, {
          nome: c.nome_condominio,
          microbairro: c.microbairro || undefined,
          padrao: c.padrao_construtivo || undefined,
        });
      });

      // 2. Buscar transações por logradouro usando todas as variações
      const condominioLogradouros = (condominios || []).map(c => c.logradouro_padrao);
      
      // Construir condições OR para todas as variações de busca
      let orConditions = searchVariations.map(v => `logradouro.ilike.%${v}%`).join(',');
      
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
