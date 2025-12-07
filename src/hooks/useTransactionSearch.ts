import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Constante para filtro de outliers
const OUTLIER_MAX_M2 = 40000;

export interface TransactionSearchParams {
  valorMin?: number;
  valorMax?: number;
  bairro?: string;
  tipologia?: string;
  periodoMeses?: number;
  areaMin?: number;
  areaMax?: number;
}

export interface MicrobairroLiquidez {
  microbairro: string;
  total_transacoes: number;
  preco_medio_m2: number;
}

export function useTransactionSearch(params: TransactionSearchParams, enabled: boolean = false) {
  return useQuery<MicrobairroLiquidez[]>({
    queryKey: ['transaction-search-v2', params.valorMin, params.valorMax, params.bairro, params.tipologia, params.periodoMeses, params.areaMin, params.areaMax],
    queryFn: async () => {
      // Período configurável (padrão: 12 meses)
      const meses = params.periodoMeses || 12;
      const startDateCalc = new Date();
      startDateCalc.setMonth(startDateCalc.getMonth() - meses);
      const startDate = startDateCalc.toISOString().split('T')[0];

      let query = supabase
        .from('itbi_transactions')
        .select('logradouro, valor_transacao, valor_m2, total_transacoes, data_transacao')
        .eq('uso', 'Residencial')
        .not('valor_m2', 'is', null)
        .lte('valor_m2', OUTLIER_MAX_M2) // Filtro de outliers
        .gte('percentual_transferido', 90)
        .gte('data_transacao', startDate);

      // Filtro por bairro
      if (params.bairro) {
        query = query.ilike('bairro', params.bairro);
      }

      // Filtro por tipologia
      if (params.tipologia) {
        query = query.ilike('tipologia', `%${params.tipologia}%`);
      }

      // Filtro por valor
      if (params.valorMin) {
        query = query.gte('valor_transacao', params.valorMin);
      }

      if (params.valorMax) {
        query = query.lte('valor_transacao', params.valorMax);
      }

      // Filtro por área
      if (params.areaMin) {
        query = query.gte('area_m2', params.areaMin);
      }

      if (params.areaMax) {
        query = query.lte('area_m2', params.areaMax);
      }

      const { data, error } = await query.limit(5000);

      if (error) throw error;

      // Group by microbairro (logradouro for now)
      const grouped = (data || []).reduce((acc, t) => {
        const micro = t.logradouro;
        if (!acc[micro]) {
          acc[micro] = { valores: [], count: 0 };
        }
        acc[micro].valores.push(t.valor_m2!);
        acc[micro].count += t.total_transacoes || 1;
        return acc;
      }, {} as Record<string, { valores: number[], count: number }>);

      const allResults = Object.entries(grouped).map(([microbairro, data]) => ({
        microbairro,
        total_transacoes: data.count,
        preco_medio_m2: Math.round(data.valores.reduce((sum, v) => sum + v, 0) / data.valores.length),
      }));

      // Calcular total geral de todas as transações
      const totalGeralTransacoes = allResults.reduce((sum, r) => sum + r.total_transacoes, 0);
      
      // Retornar TOP 10 com metadata do total geral
      const top10 = allResults.sort((a, b) => b.total_transacoes - a.total_transacoes).slice(0, 10);
      
      // Adicionar totalGeral ao primeiro item como metadata (workaround)
      if (top10.length > 0) {
        (top10 as any).__totalGeral = totalGeralTransacoes;
        (top10 as any).__totalLogradouros = allResults.length;
      }
      
      return top10;
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
