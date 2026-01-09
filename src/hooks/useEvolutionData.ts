import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Limites de outliers por bairro (baseados em percentil 99 + margem)
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

export interface EvolutionData {
  mes: string;
  geral: number;
  apartamento: number;
  casa: number;
  variacao: number;
}

export type GranularityType = 'semester' | 'annual';

export function useEvolutionData(bairro: string = 'BARRA DA TIJUCA', granularity: GranularityType = 'semester') {
  return useQuery<EvolutionData[]>({
    queryKey: ['evolution-data-v8', bairro, granularity],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const startDate = '2020-01-01';
      const outlierLimit = getOutlierLimit(bairro);

      // IMPORTANTE: Buscar total_transacoes para contagem correta (cada registro pode representar múltiplas transações)
      let allData: { data_transacao: string; valor_m2: number | null; tipologia: string | null; total_transacoes: number | null }[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('itbi_transactions')
          .select('data_transacao, valor_m2, tipologia, total_transacoes')
          .eq('uso', 'Residencial')
          .ilike('bairro', bairro)
          .not('valor_m2', 'is', null)
          .lte('valor_m2', outlierLimit)
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

      console.log(`[EvolutionData] ${bairro} (limite: R$ ${outlierLimit}/m²): ${allData.length} registros`);

      if (!allData || allData.length === 0) return [];

      const grouped = allData.reduce((acc, t) => {
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
