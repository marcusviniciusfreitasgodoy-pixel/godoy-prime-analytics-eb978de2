import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EvolutionData {
  mes: string;
  geral: number;
  apartamento: number;
  casa: number;
  variacao: number;
}

export function useEvolutionData() {
  return useQuery<EvolutionData[]>({
    queryKey: ['evolution-data'],
    queryFn: async () => {
      // Últimos 60 meses para o gráfico de evolução
      const sixtyMonthsAgo = new Date();
      sixtyMonthsAgo.setMonth(sixtyMonthsAgo.getMonth() - 60);
      const startDate = sixtyMonthsAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('itbi_transactions')
        .select('data_transacao, valor_m2, tipologia')
        .eq('uso', 'Residencial')
        .not('valor_m2', 'is', null)
        .gte('data_transacao', startDate)
        .order('data_transacao', { ascending: true });

      if (error) throw error;

      // Group by month
      const grouped = (data || []).reduce((acc, t) => {
        const date = new Date(t.data_transacao);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
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

      // Calculate averages and format
      const months = Object.keys(grouped).sort();
      let previousGeral = 0;

      return months.map((key, index) => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        const mesFormatted = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        
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
