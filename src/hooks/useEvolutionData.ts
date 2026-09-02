import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDemo } from '@/contexts/DemoContext';
import { DEMO_EVOLUTION_DATA } from '@/data/demoData';
import { getOutlierLimit } from '@/lib/outlierLimits';

export interface EvolutionData {
  mes: string;
  geral: number;
  apartamento: number;
  casa: number;
  variacao: number;
}

export type GranularityType = 'semester' | 'annual';

export function useEvolutionData(bairro: string = 'BARRA DA TIJUCA', granularity: GranularityType = 'semester') {
  const { isDemo } = useDemo();
  
  return useQuery<EvolutionData[]>({
    queryKey: ['evolution-data-v8', bairro, granularity, isDemo],
    staleTime: isDemo ? Infinity : 0,
    refetchOnMount: isDemo ? false : 'always',
    queryFn: async () => {
      if (isDemo) return DEMO_EVOLUTION_DATA;
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
          acc[key] = { geral: [] as { valor: number; peso: number }[], apartamento: [] as { valor: number; peso: number }[], casa: [] as { valor: number; peso: number }[] };
        }
        
        const peso = t.total_transacoes || 1;
        
        acc[key].geral.push({ valor: t.valor_m2!, peso });
        
        if (t.tipologia?.toLowerCase().includes('apartamento')) {
          acc[key].apartamento.push({ valor: t.valor_m2!, peso });
        } else if (t.tipologia?.toLowerCase().includes('casa')) {
          acc[key].casa.push({ valor: t.valor_m2!, peso });
        }
        
        return acc;
      }, {} as Record<string, { geral: { valor: number; peso: number }[], apartamento: { valor: number; peso: number }[], casa: { valor: number; peso: number }[] }>);

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
        
        // Média ponderada por total_transacoes
        const weightedAvg = (arr: { valor: number; peso: number }[]) => {
          if (arr.length === 0) return 0;
          const somaPonderada = arr.reduce((sum, item) => sum + item.valor * item.peso, 0);
          const somaPesos = arr.reduce((sum, item) => sum + item.peso, 0);
          return somaPesos > 0 ? somaPonderada / somaPesos : 0;
        };
        
        const geralAvg = weightedAvg(grouped[key].geral);
        const aptAvg = weightedAvg(grouped[key].apartamento);
        const casaAvg = weightedAvg(grouped[key].casa);
        
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
