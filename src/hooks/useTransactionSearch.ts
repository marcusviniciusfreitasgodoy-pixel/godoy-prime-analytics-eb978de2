import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export interface TransactionSearchParams {
  valorMin?: number;
  valorMax?: number;
  bairro?: string;
  tipologia?: string;
  periodoMeses?: number;
  areaMin?: number;
  areaMax?: number;
  apenasIndividuais?: boolean;
  valorM2Min?: number;
  valorM2Max?: number;
  logradouros?: string[];
}

export interface MicrobairroLiquidez {
  microbairro: string;
  total_transacoes: number;
  preco_medio_m2: number;
}

export function useTransactionSearch(params: TransactionSearchParams, enabled: boolean = false) {
  return useQuery<MicrobairroLiquidez[]>({
    queryKey: ['transaction-search-v4', params.valorMin, params.valorMax, params.bairro, params.tipologia, params.periodoMeses, params.areaMin, params.areaMax, params.apenasIndividuais, params.valorM2Min, params.valorM2Max, params.logradouros],
    queryFn: async () => {
      const meses = params.periodoMeses || 12;
      const startDateCalc = new Date();
      startDateCalc.setMonth(startDateCalc.getMonth() - meses);
      const startDate = startDateCalc.toISOString().split('T')[0];
      
      const outlierLimit = params.bairro ? getOutlierLimit(params.bairro) : OUTLIER_LIMITS['DEFAULT'];

      // Determina o uso baseado na tipologia selecionada
      const isComercial = params.tipologia?.toLowerCase() === 'comercial';
      
      let query = supabase
        .from('itbi_transactions')
        .select('logradouro, valor_transacao, valor_m2, total_transacoes, data_transacao, tipologia')
        .eq('uso', isComercial ? 'Comercial' : 'Residencial')
        .not('valor_m2', 'is', null)
        .lte('valor_m2', outlierLimit)
        .gte('percentual_transferido', 90)
        .gte('data_transacao', startDate);

      if (params.bairro) {
        query = query.ilike('bairro', params.bairro);
      }

      // Para tipologia residencial (casa/apartamento), aplica o filtro
      if (params.tipologia && !isComercial) {
        query = query.ilike('tipologia', `%${params.tipologia}%`);
      }

      if (params.valorMin) {
        query = query.gte('valor_transacao', params.valorMin);
      }

      if (params.valorMax) {
        query = query.lte('valor_transacao', params.valorMax);
      }

      if (params.areaMin) {
        query = query.gte('area_m2', params.areaMin);
      }

      if (params.areaMax) {
        query = query.lte('area_m2', params.areaMax);
      }

      if (params.apenasIndividuais) {
        query = query.eq('total_transacoes', 1);
      }

      if (params.valorM2Min) {
        query = query.gte('valor_m2', params.valorM2Min);
      }

      if (params.valorM2Max) {
        query = query.lte('valor_m2', params.valorM2Max);
      }

      const { data, error } = await query.limit(5000);

      if (error) throw error;

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

      const totalGeralTransacoes = allResults.reduce((sum, r) => sum + r.total_transacoes, 0);
      
      // Sort by transactions and return ALL results
      const sortedResults = allResults.sort((a, b) => b.total_transacoes - a.total_transacoes);
      
      if (sortedResults.length > 0) {
        (sortedResults as any).__totalGeral = totalGeralTransacoes;
        (sortedResults as any).__totalLogradouros = allResults.length;
      }
      
      return sortedResults;
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
