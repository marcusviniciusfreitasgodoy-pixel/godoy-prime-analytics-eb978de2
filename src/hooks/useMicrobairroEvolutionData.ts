import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type GranularityType = 'semester' | 'annual';

export interface MicrobairroEvolutionData {
  periodo: string;
  [microbairro: string]: string | number;
}

const classificarMicrobairro = (logradouro: string): string | null => {
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
  // Parque das Rosas (próximo ao Barra Shopping)
  if (log.includes('MARIO COVAS') || log.includes('MÁRIO COVAS') ||
      log.includes('CESAR LATTES') || log.includes('CÉSAR LATTES') ||
      log.includes('HENRIQUE CORDEIRO')) {
    return 'Parque das Rosas';
  }
  // Eixo Américas (outros condomínios da Av. das Américas)
  if (log.includes('AMERICAS') || log.includes('AMÉRICAS')) {
    return 'Eixo Américas';
  }
  
  return null; // Ignorar "Outros"
};

export const useMicrobairroEvolutionData = (
  bairro: string = 'BARRA DA TIJUCA',
  granularity: GranularityType = 'semester'
) => {
  return useQuery({
    queryKey: ['microbairro-evolution', bairro, granularity],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 5);
      
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
      
      // Agrupar por período e microbairro
      const grouped: Record<string, Record<string, { sum: number; count: number }>> = {};
      
      allData.forEach(item => {
        const microbairro = classificarMicrobairro(item.logradouro);
        if (!microbairro) return; // Ignorar "Outros"
        
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
        
        if (!grouped[periodo][microbairro]) {
          grouped[periodo][microbairro] = { sum: 0, count: 0 };
        }
        
        const transacoes = item.total_transacoes || 1;
        grouped[periodo][microbairro].sum += Number(item.valor_m2) * transacoes;
        grouped[periodo][microbairro].count += transacoes;
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
      
      const result: MicrobairroEvolutionData[] = sortedPeriods.map(periodo => {
        const entry: MicrobairroEvolutionData = { periodo };
        
        allMicrobairros.forEach(microbairro => {
          const data = grouped[periodo][microbairro];
          if (data && data.count > 0) {
            entry[microbairro] = Math.round(data.sum / data.count);
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
