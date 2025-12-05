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

export interface MicrobairroDetalhado {
  microbairro: string;
  valor_m2: number;
  total_transacoes: number;
  valor_m2_apt: number;
  valor_m2_casa: number;
  rank: number;
  trend: "high" | "stable";
}

export function useITBITransactions() {
  return useQuery<ITBITransaction[]>({
    queryKey: ['itbi-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itbi_transactions')
        .select('*')
        .ilike('bairro', 'BARRA DA TIJUCA')
        .order('data_transacao', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ITBITransaction[];
    },
  });
}

export function useMicrobairroRanking(bairro: string = 'BARRA DA TIJUCA') {
  return useQuery<MicrobairroRanking[]>({
    queryKey: ['microbairro-ranking', bairro],
    queryFn: async () => {
      // Para Barra da Tijuca, usar a view otimizada
      if (bairro.toUpperCase() === 'BARRA DA TIJUCA') {
        const { data, error } = await supabase
          .from('view_ranking_microbairros')
          .select('*');

        if (error) throw error;
        return data as MicrobairroRanking[];
      }
      
      // Para outros bairros, calcular dinamicamente por logradouro
      const { data: transactions, error } = await supabase
        .from('itbi_transactions')
        .select('logradouro, valor_m2, total_transacoes')
        .ilike('bairro', bairro)
        .eq('uso', 'Residencial')
        .not('valor_m2', 'is', null)
        .gte('percentual_transferido', 90)
        .limit(5000);

      if (error) throw error;

      // Agrupar por logradouro
      const grouped = (transactions || []).reduce((acc, t) => {
        const key = t.logradouro;
        if (!acc[key]) {
          acc[key] = { valores: [], total: 0 };
        }
        acc[key].valores.push(t.valor_m2!);
        acc[key].total += t.total_transacoes || 1;
        return acc;
      }, {} as Record<string, { valores: number[], total: number }>);

      // Calcular métricas
      const result = Object.entries(grouped).map(([logradouro, data]) => {
        const sorted = [...data.valores].sort((a, b) => a - b);
        const mediana = sorted.length > 0 
          ? sorted[Math.floor(sorted.length / 2)] 
          : 0;
        const media = sorted.length > 0 
          ? sorted.reduce((a, b) => a + b, 0) / sorted.length 
          : 0;
        
        return {
          microbairro: logradouro,
          total_transacoes: data.total,
          preco_medio_m2: Math.round(media),
          preco_min_m2: Math.min(...data.valores),
          preco_max_m2: Math.max(...data.valores),
          mediana_m2: Math.round(mediana),
        };
      });

      return result
        .filter(r => r.total_transacoes >= 3) // Mínimo de 3 transações
        .sort((a, b) => b.preco_medio_m2 - a.preco_medio_m2)
        .slice(0, 10); // Top 10
    },
  });
}

export function useMicrobairroDetalhado() {
  return useQuery<MicrobairroDetalhado[]>({
    queryKey: ['microbairro-detalhado'],
    queryFn: async () => {
      // Últimos 24 meses para rankings e detalhes
      const twentyFourMonthsAgo = new Date();
      twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);
      const startDate = twentyFourMonthsAgo.toISOString().split('T')[0];

      // Buscar transações residenciais dos últimos 24 meses
      const { data: transactions, error } = await supabase
        .from('itbi_transactions')
        .select('logradouro, valor_m2, tipologia')
        .eq('uso', 'Residencial')
        .ilike('bairro', 'BARRA DA TIJUCA')
        .not('valor_m2', 'is', null)
        .not('logradouro', 'is', null)
        .gte('data_transacao', startDate)
        .limit(10000);

      if (error) throw error;

      // Agrupar dados por microbairro
      const grouped = (transactions || []).reduce((acc, t) => {
        const micro = t.logradouro;
        if (!acc[micro]) {
          acc[micro] = {
            total: [],
            apartamentos: [],
            casas: [],
          };
        }
        
        acc[micro].total.push(t.valor_m2!);
        
        if (t.tipologia?.toLowerCase().includes('apartamento')) {
          acc[micro].apartamentos.push(t.valor_m2!);
        } else if (t.tipologia?.toLowerCase().includes('casa')) {
          acc[micro].casas.push(t.valor_m2!);
        }
        
        return acc;
      }, {} as Record<string, { total: number[], apartamentos: number[], casas: number[] }>);

      // Calcular médias e criar array de resultados
      const result = Object.entries(grouped).map(([microbairro, dados]) => {
        // Calcular média de apartamentos
        const valor_m2_apt = dados.apartamentos.length > 0
          ? Math.round(dados.apartamentos.reduce((sum, v) => sum + v, 0) / dados.apartamentos.length)
          : 0;
        
        // Calcular média de casas
        const valor_m2_casa = dados.casas.length > 0
          ? Math.round(dados.casas.reduce((sum, v) => sum + v, 0) / dados.casas.length)
          : 0;

        // Preço médio = média entre apartamentos e casas (quando ambos existem)
        let valor_m2: number;
        if (valor_m2_apt > 0 && valor_m2_casa > 0) {
          // Média entre apartamentos e casas
          valor_m2 = Math.round((valor_m2_apt + valor_m2_casa) / 2);
        } else if (valor_m2_apt > 0) {
          // Apenas apartamentos disponíveis
          valor_m2 = valor_m2_apt;
        } else if (valor_m2_casa > 0) {
          // Apenas casas disponíveis
          valor_m2 = valor_m2_casa;
        } else {
          // Fallback para média geral
          valor_m2 = Math.round(
            dados.total.reduce((sum, v) => sum + v, 0) / dados.total.length
          );
        }

        return {
          microbairro,
          valor_m2,
          total_transacoes: dados.total.length,
          valor_m2_apt: valor_m2_apt || valor_m2,
          valor_m2_casa: valor_m2_casa || Math.round(valor_m2 * 0.92),
          rank: 0, // Será preenchido após ordenação
          trend: "stable" as const,
        };
      });

      // Ordenar por valor_m2 (maior para menor) e adicionar rank e trend
      result.sort((a, b) => b.valor_m2 - a.valor_m2);
      
      return result.map((item, index) => ({
        ...item,
        rank: index + 1,
        trend: index < 3 ? "high" : "stable",
      }));
    },
  });
}

export function useKPIStats() {
  return useQuery({
    queryKey: ['kpi-stats'],
    queryFn: async () => {
      // Últimos 24 meses para KPIs
      const twentyFourMonthsAgo = new Date();
      twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);
      const startDate24Months = twentyFourMonthsAgo.toISOString().split('T')[0];

      // Últimos 12 meses para comparação atual
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const startDate12Months = twelveMonthsAgo.toISOString().split('T')[0];

      // Buscar transações dos últimos 12 meses (período atual)
      const { data: currentPeriodData, error: currentError } = await supabase
        .from('itbi_transactions')
        .select('valor_m2, tipologia, uso')
        .eq('uso', 'Residencial')
        .ilike('bairro', 'BARRA DA TIJUCA')
        .gte('data_transacao', startDate12Months)
        .limit(10000);

      if (currentError) throw currentError;

      // Buscar transações dos 12 meses anteriores (para comparação YoY)
      const { data: previousPeriodData, error: previousError } = await supabase
        .from('itbi_transactions')
        .select('valor_m2')
        .eq('uso', 'Residencial')
        .ilike('bairro', 'BARRA DA TIJUCA')
        .gte('data_transacao', startDate24Months)
        .lt('data_transacao', startDate12Months)
        .limit(10000);

      if (previousError) throw previousError;

      // Calcular KPIs
      const currentTransactions = currentPeriodData || [];
      const previousTransactions = previousPeriodData || [];

      const precoMedio = currentTransactions.length > 0
        ? currentTransactions.reduce((sum, t) => sum + (t.valor_m2 || 0), 0) / currentTransactions.length
        : 0;

      const precoMedioAnterior = previousTransactions.length > 0
        ? previousTransactions.reduce((sum, t) => sum + (t.valor_m2 || 0), 0) / previousTransactions.length
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
