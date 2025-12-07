import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Constante para filtro de outliers
const OUTLIER_MAX_M2 = 40000;

export interface StreetComparisonData {
  logradouro: string;
  mediana_m2: number;
  media_m2: number;
  total_transacoes: number;
  variacao_periodo: number | null;
  dados_mensais: {
    mes: string;
    media_m2: number;
    transacoes: number;
  }[];
}

export function useStreetComparison(logradouros: string[], periodoMeses: number = 12) {
  return useQuery<StreetComparisonData[]>({
    queryKey: ['street-comparison-v2', logradouros, periodoMeses],
    queryFn: async () => {
      if (logradouros.length === 0) return [];

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - periodoMeses);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Data for previous period comparison
      const previousStartDate = new Date();
      previousStartDate.setMonth(previousStartDate.getMonth() - (periodoMeses * 2));
      const previousEndDate = new Date();
      previousEndDate.setMonth(previousEndDate.getMonth() - periodoMeses);

      const results: StreetComparisonData[] = [];

      for (const logradouro of logradouros) {
        if (!logradouro) continue;

        // Current period data
        const { data: currentData, error: currentError } = await supabase
          .from('itbi_transactions')
          .select('valor_m2, total_transacoes, data_transacao')
          .eq('uso', 'Residencial')
          .ilike('logradouro', `%${logradouro}%`)
          .gte('percentual_transferido', 90)
          .gte('data_transacao', startDateStr)
          .not('valor_m2', 'is', null)
          .lte('valor_m2', OUTLIER_MAX_M2); // Filtro de outliers

        if (currentError) {
          console.error('Erro ao buscar dados:', currentError);
          continue;
        }

        if (!currentData || currentData.length === 0) continue;

        // Calculate current period stats
        let somaValoresPonderados = 0;
        let somaPesos = 0;
        const valores: number[] = [];

        for (const t of currentData) {
          const peso = t.total_transacoes || 1;
          somaValoresPonderados += (t.valor_m2 || 0) * peso;
          somaPesos += peso;
          valores.push(t.valor_m2!);
        }

        const media_m2 = somaPesos > 0 ? Math.round(somaValoresPonderados / somaPesos) : 0;
        valores.sort((a, b) => a - b);
        const mediana_m2 = valores.length % 2 === 0
          ? Math.round((valores[valores.length / 2 - 1] + valores[valores.length / 2]) / 2)
          : Math.round(valores[Math.floor(valores.length / 2)]);

        // Previous period for variation calculation
        const { data: previousData } = await supabase
          .from('itbi_transactions')
          .select('valor_m2, total_transacoes')
          .eq('uso', 'Residencial')
          .ilike('logradouro', `%${logradouro}%`)
          .gte('percentual_transferido', 90)
          .gte('data_transacao', previousStartDate.toISOString().split('T')[0])
          .lt('data_transacao', previousEndDate.toISOString().split('T')[0])
          .not('valor_m2', 'is', null)
          .lte('valor_m2', OUTLIER_MAX_M2); // Filtro de outliers

        let variacao_periodo: number | null = null;
        if (previousData && previousData.length > 0) {
          let somaPrevPonderados = 0;
          let somaPrevPesos = 0;
          for (const t of previousData) {
            const peso = t.total_transacoes || 1;
            somaPrevPonderados += (t.valor_m2 || 0) * peso;
            somaPrevPesos += peso;
          }
          const mediaPrev = somaPrevPesos > 0 ? somaPrevPonderados / somaPrevPesos : 0;
          if (mediaPrev > 0) {
            variacao_periodo = ((media_m2 - mediaPrev) / mediaPrev) * 100;
          }
        }

        // Monthly breakdown
        const mensalMap = new Map<string, { soma: number; peso: number; count: number }>();
        for (const t of currentData) {
          const mes = t.data_transacao.substring(0, 7);
          const entry = mensalMap.get(mes) || { soma: 0, peso: 0, count: 0 };
          const peso = t.total_transacoes || 1;
          entry.soma += (t.valor_m2 || 0) * peso;
          entry.peso += peso;
          entry.count++;
          mensalMap.set(mes, entry);
        }

        const dados_mensais = Array.from(mensalMap.entries())
          .map(([mes, data]) => ({
            mes,
            media_m2: Math.round(data.soma / data.peso),
            transacoes: data.peso,
          }))
          .sort((a, b) => a.mes.localeCompare(b.mes));

        results.push({
          logradouro: currentData[0]?.data_transacao ? logradouro : logradouro,
          mediana_m2,
          media_m2,
          total_transacoes: somaPesos,
          variacao_periodo: variacao_periodo !== null ? Math.round(variacao_periodo * 100) / 100 : null,
          dados_mensais,
        });
      }

      return results;
    },
    enabled: logradouros.length > 0 && logradouros.some(l => l && l.length > 0),
  });
}
