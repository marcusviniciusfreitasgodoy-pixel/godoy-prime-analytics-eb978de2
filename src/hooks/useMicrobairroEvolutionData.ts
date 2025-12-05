import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type GranularityType = 'semester' | 'annual';
export type MetricType = 'valorization' | 'liquidity';

export interface MicrobairroEvolutionData {
  periodo: string;
  [microbairro: string]: string | number;
}

// Classificação específica para Barra da Tijuca
const classificarMicrobairroBarra = (logradouro: string): string | null => {
  const log = logradouro.toUpperCase();
  
  if (log.includes('LUCIO COSTA') || log.includes('LÚCIO COSTA') || 
      log.includes('SERNAMBETIBA') || log.includes('PEPE') || log.includes('PEPÊ')) {
    return 'Orla';
  }
  if (log.includes('PENINSULA') || log.includes('PENÍNSULA')) {
    return 'Península';
  }
  if (log.includes('ABELARDO BUENO') || log.includes('EMBAIXADOR')) {
    return 'Centro Metropolitano';
  }
  if (log.includes('AYRTON SENNA') || log.includes('VIA PARQUE') || log.includes('ALFA BARRA')) {
    return 'Ayrton Senna';
  }
  if (log.includes('OLEGARIO') || log.includes('OLEGÁRIO') || 
      log.includes('ERICO') || log.includes('ÉRICO') || log.includes('VERÍSSIMO')) {
    return 'Jardim Oceânico';
  }
  if (log.includes('DULCIDIO') || log.includes('DULCÍDIO') || log.includes('CARDOSO')) {
    return 'ABM';
  }
  if (log.includes('MARIO COVAS') || log.includes('MÁRIO COVAS') ||
      log.includes('CESAR LATTES') || log.includes('CÉSAR LATTES') ||
      log.includes('HENRIQUE CORDEIRO')) {
    return 'Parque das Rosas';
  }
  if (log.includes('AMERICAS') || log.includes('AMÉRICAS')) {
    return 'Eixo Américas';
  }
  
  return null;
};

// Para outros bairros, usar logradouro simplificado como região
const simplificarLogradouro = (logradouro: string): string => {
  // Remove prefixos comuns e simplifica o nome
  let nome = logradouro.toUpperCase()
    .replace(/^(AVENIDA|AVN|AV\.?|RUA|R\.?|ESTRADA|EST\.?|TRAVESSA|TV\.?|PRACA|PCA\.?|PRAÇA|ALAMEDA|AL\.?)\s+/i, '')
    .trim();
  
  // Limita o tamanho para melhor visualização
  if (nome.length > 25) {
    nome = nome.substring(0, 22) + '...';
  }
  
  return nome;
};

export const useMicrobairroEvolutionData = (
  bairro: string = 'BARRA DA TIJUCA',
  granularity: GranularityType = 'semester',
  metric: MetricType = 'valorization'
) => {
  return useQuery({
    queryKey: ['microbairro-evolution', bairro, granularity, metric],
    queryFn: async () => {
      // Para liquidez acumulada, buscar desde 2020
      const startDate = new Date('2020-01-01');
      
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('itbi_transactions')
          .select('logradouro, valor_m2, data_transacao, total_transacoes')
          .eq('bairro', bairro)
          .eq('uso', 'Residencial')
          .gte('percentual_transferido', 90)
          .not('valor_m2', 'is', null)
          .gte('data_transacao', startDate.toISOString().split('T')[0])
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      // Para bairros que não são Barra, primeiro identificar os logradouros mais frequentes
      const isBarra = bairro.toUpperCase().includes('BARRA DA TIJUCA');
      
      // Contar transações por logradouro para encontrar os top 8
      const logradouroCount: Record<string, number> = {};
      if (!isBarra) {
        allData.forEach(item => {
          const nome = simplificarLogradouro(item.logradouro);
          logradouroCount[nome] = (logradouroCount[nome] || 0) + (item.total_transacoes || 1);
        });
      }
      
      // Pegar os 8 logradouros com mais transações para não-Barra
      const topLogradouros = !isBarra 
        ? Object.entries(logradouroCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([nome]) => nome)
        : [];
      
      // Agrupar por período e microbairro/logradouro
      const grouped: Record<string, Record<string, { sum: number; count: number; transactions: number }>> = {};
      
      allData.forEach(item => {
        let regiao: string | null;
        
        if (isBarra) {
          regiao = classificarMicrobairroBarra(item.logradouro);
        } else {
          const nome = simplificarLogradouro(item.logradouro);
          regiao = topLogradouros.includes(nome) ? nome : null;
        }
        
        if (!regiao) return;
        
        const date = new Date(item.data_transacao);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        let periodo: string;
        if (granularity === 'semester') {
          const semester = month <= 6 ? 'S1' : 'S2';
          periodo = `${semester}/${year.toString().slice(-2)}`;
        } else {
          periodo = year.toString();
        }
        
        if (!grouped[periodo]) {
          grouped[periodo] = {};
        }
        
        if (!grouped[periodo][regiao]) {
          grouped[periodo][regiao] = { sum: 0, count: 0, transactions: 0 };
        }
        
        const transacoes = item.total_transacoes || 1;
        grouped[periodo][regiao].sum += Number(item.valor_m2) * transacoes;
        grouped[periodo][regiao].count += transacoes;
        grouped[periodo][regiao].transactions += transacoes;
      });
      
      // Converter para array ordenado
      const sortedPeriods = Object.keys(grouped).sort((a, b) => {
        if (granularity === 'semester') {
          const [semA, yearA] = a.split('/');
          const [semB, yearB] = b.split('/');
          const numA = parseInt(yearA) * 10 + (semA === 'S1' ? 1 : 2);
          const numB = parseInt(yearB) * 10 + (semB === 'S1' ? 1 : 2);
          return numA - numB;
        }
        return parseInt(a) - parseInt(b);
      });
      
      // Identificar todos os microbairros presentes
      const allMicrobairros = new Set<string>();
      Object.values(grouped).forEach(periodData => {
        Object.keys(periodData).forEach(mb => allMicrobairros.add(mb));
      });
      
      // Calcular valores acumulados para liquidez
      const cumulativeTransactions: Record<string, number> = {};
      allMicrobairros.forEach(mb => {
        cumulativeTransactions[mb] = 0;
      });
      
      const result: MicrobairroEvolutionData[] = sortedPeriods.map(periodo => {
        const entry: MicrobairroEvolutionData = { periodo };
        
        allMicrobairros.forEach(microbairro => {
          const data = grouped[periodo][microbairro];
          if (metric === 'valorization') {
            if (data && data.count > 0) {
              entry[microbairro] = Math.round(data.sum / data.count);
            }
          } else {
            // Liquidez acumulada
            if (data) {
              cumulativeTransactions[microbairro] += data.transactions;
            }
            entry[microbairro] = cumulativeTransactions[microbairro];
          }
        });
        
        return entry;
      });
      
      return {
        data: result,
        microbairros: Array.from(allMicrobairros).sort()
      };
    },
    staleTime: 1000 * 60 * 30,
  });
};
