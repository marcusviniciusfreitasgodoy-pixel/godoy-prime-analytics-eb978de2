import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Constante para filtro de outliers
const OUTLIER_MAX_M2 = 40000;

export interface EvolutionData {
  mes: string;
  geral: number;
  apartamento: number;
  casa: number;
  variacao: number;
}

export type GranularityType = 'semester' | 'annual';

// Hook para dados de evolução com granularidade configurável
export function useEvolutionData(bairro: string = 'BARRA DA TIJUCA', granularity: GranularityType = 'semester') {
  return useQuery<EvolutionData[]>({
    queryKey: ['evolution-data-v7', bairro, granularity],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const startDate = '2020-01-01';

      let allData: { data_transacao: string; valor_m2: number | null; tipologia: string | null }[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('itbi_transactions')
          .select('data_transacao, valor_m2, tipologia')
          .eq('uso', 'Residencial')
          .ilike('bairro', bairro)
          .not('valor_m2', 'is', null)
          .lte('valor_m2', OUTLIER_MAX_M2) // Filtro de outliers
          .gte('percentual_transferido', 90)
          .gte('data_transacao', startDate)
          .order('data_transacao', { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`[EvolutionData] Total registros para ${bairro}: ${allData.length}`);
      const data = allData;

      if (!data || data.length === 0) return [];

      // Agrupar por período (semestre ou ano)
      const grouped = (data || []).reduce((acc, t) => {
        const date = new Date(t.data_transacao);
        const year = date.getFullYear();
        
        let key: string;
        if (granularity === 'annual') {
          key = `${year}`;
        } else {
          const month = date.getMonth() + 1;
          const semester = month <= 6 ? 'S1' : 'S2';
          key = `${year}-${semester}`;
        }
        
        if (!acc[key]) {
          acc[key] = { geral: [], apartamento: [], casa: [] };
        }
        
        acc[key].geral.push(t.valor_m2!);
        
        if (t.tipologia?.toLowerCase().includes('apartamento')) {
          acc[key].apartamento.push(t.valor_m2!);
        } else if (t.tipologia?.toLowerCase().includes('casa')) {
          acc[key].casa.push(t.valor_m2!);
        }
        
        return acc;
      }, {} as Record<string, { geral: number[], apartamento: number[], casa: number[] }>);

      // Ordenar períodos cronologicamente
      const periods = Object.keys(grouped).sort((a, b) => {
        if (granularity === 'annual') {
          return parseInt(a) - parseInt(b);
        }
        const [yearA, semA] = a.split('-');
        const [yearB, semB] = b.split('-');
        if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
        return semA === 'S1' ? -1 : 1;
      });

      let previousGeral = 0;

      return periods.map((key, index) => {
        let mesFormatted: string;
        if (granularity === 'annual') {
          mesFormatted = key;
        } else {
          const [year, semester] = key.split('-');
          mesFormatted = `${semester}/${year.slice(2)}`;
        }
        
        const avg = (arr: number[]) => arr.length > 0 
          ? arr.reduce((sum, v) => sum + v, 0) / arr.length 
          : 0;
        
        const geralAvg = avg(grouped[key].geral);
        const aptAvg = avg(grouped[key].apartamento);
        const casaAvg = avg(grouped[key].casa);
        
        const variacao = index > 0 && previousGeral > 0
          ? ((geralAvg - previousGeral) / previousGeral) * 100
          : 0;
        
        previousGeral = geralAvg;
        
        return {
          mes: mesFormatted,
          geral: Math.round(geralAvg),
          apartamento: aptAvg > 0 ? Math.round(aptAvg) : Math.round(geralAvg),
          casa: casaAvg > 0 ? Math.round(casaAvg) : Math.round(geralAvg * 0.85),
          variacao: parseFloat(variacao.toFixed(2)),
        };
      });
    },
  });
}
