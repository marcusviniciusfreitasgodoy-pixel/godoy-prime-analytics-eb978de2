import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ITBITransaction {
  id: string;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  valor_transacao: number;
  area_m2: number;
  valor_m2: number | null;
  data_transacao: string;
  uso: 'Residencial' | 'Comercial';
  tipologia: string | null;
  created_at: string;
  updated_at: string;
}

export interface MicrobairroRanking {
  microbairro: string;
  total_transacoes: number;
  preco_medio_m2: number;
  preco_min_m2: number;
  preco_max_m2: number;
  mediana_m2: number;
}

export function useITBITransactions() {
  return useQuery<ITBITransaction[]>({
    queryKey: ['itbi-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itbi_transactions')
        .select('*')
        .order('data_transacao', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ITBITransaction[];
    },
  });
}

export function useMicrobairroRanking() {
  return useQuery<MicrobairroRanking[]>({
    queryKey: ['microbairro-ranking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_ranking_microbairros')
        .select('*');

      if (error) throw error;
      return data as MicrobairroRanking[];
    },
  });
}

export function useKPIStats() {
  return useQuery({
    queryKey: ['kpi-stats'],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;

      // Buscar transações do ano corrente
      const { data: currentYearData, error: currentError } = await supabase
        .from('itbi_transactions')
        .select('valor_m2, tipologia, uso')
        .eq('uso', 'Residencial')
        .gte('data_transacao', startOfYear);

      if (currentError) throw currentError;

      // Buscar transações do ano anterior para comparação
      const lastYear = currentYear - 1;
      const startOfLastYear = `${lastYear}-01-01`;
      const endOfLastYear = `${lastYear}-12-31`;

      const { data: lastYearData, error: lastError } = await supabase
        .from('itbi_transactions')
        .select('valor_m2')
        .eq('uso', 'Residencial')
        .gte('data_transacao', startOfLastYear)
        .lte('data_transacao', endOfLastYear);

      if (lastError) throw lastError;

      // Calcular KPIs
      const currentTransactions = currentYearData || [];
      const lastYearTransactions = lastYearData || [];

      const precoMedio = currentTransactions.length > 0
        ? currentTransactions.reduce((sum, t) => sum + (t.valor_m2 || 0), 0) / currentTransactions.length
        : 0;

      const precoMedioAnterior = lastYearTransactions.length > 0
        ? lastYearTransactions.reduce((sum, t) => sum + (t.valor_m2 || 0), 0) / lastYearTransactions.length
        : 0;

      const variacaoAnual = precoMedioAnterior > 0
        ? ((precoMedio - precoMedioAnterior) / precoMedioAnterior) * 100
        : 0;

      // Buscar microbairro mais valorizado
      const { data: rankingData } = await supabase
        .from('view_ranking_microbairros')
        .select('microbairro, preco_medio_m2')
        .order('preco_medio_m2', { ascending: false })
        .limit(1)
        .single();

      return {
        precoMedio: Math.round(precoMedio),
        liquidez: currentTransactions.length,
        variacaoAnual: variacaoAnual.toFixed(1),
        bairroMaisValorizado: rankingData?.microbairro || 'N/A',
        precoMedioBairro: rankingData?.preco_medio_m2 || 0,
      };
    },
  });
}
