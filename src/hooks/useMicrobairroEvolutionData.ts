import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDemo } from '@/contexts/DemoContext';
import { DEMO_MICROBAIRRO_EVOLUTION } from '@/data/demoData';

// Limites de outliers por bairro
const OUTLIER_LIMITS: Record<string, number> = {
  'BARRA DA TIJUCA': 40000,
  'RECREIO DOS BANDEIRANTES': 35000,
  'LEBLON': 80000,
  'IPANEMA': 70000,
  'LAGOA': 50000,
  'JARDIM BOTANICO': 50000,
  'GAVEA': 50000,
  'COPACABANA': 40000,
  'BOTAFOGO': 40000,
  'FLAMENGO': 35000,
  'LARANJEIRAS': 35000,
  'HUMAITA': 40000,
  'TIJUCA': 30000,
  'DEFAULT': 60000,
};

const getOutlierLimit = (bairro: string): number => {
  const normalizedBairro = bairro.toUpperCase();
  return OUTLIER_LIMITS[normalizedBairro] || OUTLIER_LIMITS['DEFAULT'];
};

export type GranularityType = 'semester' | 'annual';
export type MetricType = 'valorization' | 'liquidity';

export interface MicrobairroEvolutionData {
  periodo: string;
  [microbairro: string]: string | number;
}

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

const simplificarLogradouro = (logradouro: string): string => {
  let nome = logradouro.toUpperCase()
    .replace(/^(AVENIDA|AVN|AV\.?|RUA|R\.?|ESTRADA|EST\.?|TRAVESSA|TV\.?|PRACA|PCA\.?|PRAÇA|ALAMEDA|AL\.?)\s+/i, '')
    .trim();
  
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
  const { isDemo } = useDemo();
  
  return useQuery({
    queryKey: ['microbairro-evolution-v3', bairro, granularity, metric, isDemo],
    queryFn: async () => {
      if (isDemo) return DEMO_MICROBAIRRO_EVOLUTION;
      const startDate = new Date('2020-01-01');
      const outlierLimit = getOutlierLimit(bairro);
      
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
          .lte('valor_m2', outlierLimit)
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
      
      const isBarra = bairro.toUpperCase().includes('BARRA DA TIJUCA');
      
      const logradouroCount: Record<string, number> = {};
      if (!isBarra) {
        allData.forEach(item => {
          const nome = simplificarLogradouro(item.logradouro);
          logradouroCount[nome] = (logradouroCount[nome] || 0) + (item.total_transacoes || 1);
        });
      }
      
      const topLogradouros = !isBarra 
        ? Object.entries(logradouroCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([nome]) => nome)
        : [];
      
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
      
      const allMicrobairros = new Set<string>();
      Object.values(grouped).forEach(periodData => {
        Object.keys(periodData).forEach(mb => allMicrobairros.add(mb));
      });
      
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
