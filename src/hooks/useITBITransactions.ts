import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isTechnicalCode } from '@/lib/utils';

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
  'VILA ISABEL': 25000,
  'GRAJAU': 20000,
  'GRAJAÚ': 20000,
  'MEIER': 20000,
  'MÉIER': 20000,
  'JACAREPAGUA': 25000,
  'JACAREPAGUÁ': 25000,
  'FREGUESIA (JACAREPAGUÁ)': 25000,
  'TAQUARA': 20000,
  'PECHINCHA': 20000,
  'DEFAULT': 60000,
};

const getOutlierLimit = (bairro: string): number => {
  const normalizedBairro = bairro.toUpperCase();
  return OUTLIER_LIMITS[normalizedBairro] || OUTLIER_LIMITS['DEFAULT'];
};

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
  microbairro: string | null;
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
  condominioNome?: string;
  isTechnicalCode?: boolean;
}

export function useITBITransactions() {
  return useQuery<ITBITransaction[]>({
    queryKey: ['itbi-transactions'],
    queryFn: async () => {
      const outlierLimit = getOutlierLimit('BARRA DA TIJUCA');
      
      const { data, error } = await supabase
        .from('itbi_transactions')
        .select('*')
        .ilike('bairro', 'BARRA DA TIJUCA')
        .lte('valor_m2', outlierLimit)
        .order('data_transacao', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ITBITransaction[];
    },
  });
}

export function useMicrobairroRanking(bairro: string = 'BARRA DA TIJUCA') {
  return useQuery<MicrobairroRanking[]>({
    queryKey: ['microbairro-ranking-v6', bairro],
    queryFn: async () => {
      const outlierLimit = getOutlierLimit(bairro);
      const normalizedBairro = bairro.toUpperCase();
      
      // Buscar transações dos últimos 12 meses
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const startDate = twelveMonthsAgo.toISOString().split('T')[0];
      
      // Verificar se o bairro tem microbairros configurados
      const { data: microbairrosGeo } = await supabase
        .from('microbairros_geo')
        .select('nome, keywords')
        .eq('bairro', normalizedBairro);
      
      const hasMicrobairrosConfig = (microbairrosGeo?.length || 0) > 0;
      
      // Buscar transações
      const { data: transactions, error } = await supabase
        .from('itbi_transactions')
        .select('logradouro, valor_m2, total_transacoes, microbairro')
        .ilike('bairro', bairro)
        .eq('uso', 'Residencial')
        .not('valor_m2', 'is', null)
        .lte('valor_m2', outlierLimit)
        .gte('percentual_transferido', 90)
        .gte('data_transacao', startDate)
        .limit(10000);

      if (error) throw error;
      
      // Se o bairro tem microbairros configurados, agrupar por microbairro
      if (hasMicrobairrosConfig) {
        // Função para classificar usando keywords do banco (fallback para não classificados)
        const classifyByKeywords = (logradouro: string): string | null => {
          const log = logradouro.toUpperCase();
          for (const micro of microbairrosGeo || []) {
            for (const keyword of micro.keywords || []) {
              if (log.includes(keyword.toUpperCase())) {
                return micro.nome;
              }
            }
          }
          return null;
        };
        
        const grouped = (transactions || []).reduce((acc, t) => {
          // Usar microbairro do banco se disponível, senão classificar dinamicamente por keywords
          const micro = t.microbairro || classifyByKeywords(t.logradouro);
          if (!micro) return acc; // Ignorar logradouros não classificados
          
          if (!acc[micro]) {
            acc[micro] = { valores: [], total: 0 };
          }
          acc[micro].valores.push(t.valor_m2!);
          acc[micro].total += t.total_transacoes || 1;
          return acc;
        }, {} as Record<string, { valores: number[], total: number }>);

        const result = Object.entries(grouped).map(([microbairro, data]) => {
          const sorted = [...data.valores].sort((a, b) => a - b);
          const mediana = sorted.length > 0 
            ? sorted[Math.floor(sorted.length / 2)] 
            : 0;
          const media = sorted.length > 0 
            ? sorted.reduce((a, b) => a + b, 0) / sorted.length 
            : 0;
          
          return {
            microbairro,
            total_transacoes: data.total,
            preco_medio_m2: Math.round(media),
            preco_min_m2: Math.min(...data.valores),
            preco_max_m2: Math.max(...data.valores),
            mediana_m2: Math.round(mediana),
          };
        });

        // Mínimo de 3 transações para aparecer no ranking
        return result
          .filter(r => r.total_transacoes >= 3)
          .sort((a, b) => b.preco_medio_m2 - a.preco_medio_m2);
      }
      
      // Para bairros SEM microbairros configurados, agrupar por logradouro
      const grouped = (transactions || []).reduce((acc, t) => {
        const key = t.logradouro;
        if (!acc[key]) {
          acc[key] = { valores: [], total: 0 };
        }
        acc[key].valores.push(t.valor_m2!);
        acc[key].total += t.total_transacoes || 1;
        return acc;
      }, {} as Record<string, { valores: number[], total: number }>);

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
        .filter(r => r.total_transacoes >= 3)
        .sort((a, b) => b.preco_medio_m2 - a.preco_medio_m2)
        .slice(0, 10);
    },
  });
}

export function useMicrobairroDetalhado(bairro: string = 'BARRA DA TIJUCA') {
  return useQuery<MicrobairroDetalhado[]>({
    queryKey: ['microbairro-detalhado-v4', bairro],
    queryFn: async () => {
      const twentyFourMonthsAgo = new Date();
      twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);
      const startDate = twentyFourMonthsAgo.toISOString().split('T')[0];
      
      const outlierLimit = getOutlierLimit(bairro);

      // Buscar transações - IMPORTANTE: incluir total_transacoes para contagem correta
      const { data: transactions, error } = await supabase
        .from('itbi_transactions')
        .select('logradouro, valor_m2, tipologia, total_transacoes')
        .eq('uso', 'Residencial')
        .ilike('bairro', bairro)
        .not('valor_m2', 'is', null)
        .lte('valor_m2', outlierLimit)
        .not('logradouro', 'is', null)
        .gte('data_transacao', startDate)
        .limit(10000);

      if (error) throw error;

      // Buscar mapeamento de condomínios
      const { data: condominios } = await supabase
        .from('condominios_mapeamento')
        .select('logradouro_padrao, nome_condominio');

      // Criar mapa de logradouro -> nome condomínio
      const condominioMap = new Map<string, string>();
      (condominios || []).forEach(c => {
        if (c.logradouro_padrao && c.nome_condominio) {
          condominioMap.set(c.logradouro_padrao.toUpperCase(), c.nome_condominio);
        }
      });

      const grouped = (transactions || []).reduce((acc, t) => {
        const micro = t.logradouro;
        const transCount = t.total_transacoes || 1;
        
        if (!acc[micro]) {
          acc[micro] = {
            total: [],
            apartamentos: [],
            casas: [],
            totalTransacoes: 0,
          };
        }
        
        acc[micro].total.push(t.valor_m2!);
        acc[micro].totalTransacoes += transCount;
        
        if (t.tipologia?.toLowerCase().includes('apartamento')) {
          acc[micro].apartamentos.push(t.valor_m2!);
        } else if (t.tipologia?.toLowerCase().includes('casa')) {
          acc[micro].casas.push(t.valor_m2!);
        }
        
        return acc;
      }, {} as Record<string, { total: number[], apartamentos: number[], casas: number[], totalTransacoes: number }>);

      const result = Object.entries(grouped).map(([microbairro, dados]) => {
        const valor_m2_apt = dados.apartamentos.length > 0
          ? Math.round(dados.apartamentos.reduce((sum, v) => sum + v, 0) / dados.apartamentos.length)
          : 0;
        
        const valor_m2_casa = dados.casas.length > 0
          ? Math.round(dados.casas.reduce((sum, v) => sum + v, 0) / dados.casas.length)
          : 0;

        let valor_m2: number;
        if (valor_m2_apt > 0 && valor_m2_casa > 0) {
          valor_m2 = Math.round((valor_m2_apt + valor_m2_casa) / 2);
        } else if (valor_m2_apt > 0) {
          valor_m2 = valor_m2_apt;
        } else if (valor_m2_casa > 0) {
          valor_m2 = valor_m2_casa;
        } else {
          valor_m2 = Math.round(
            dados.total.reduce((sum, v) => sum + v, 0) / dados.total.length
          );
        }

        // Verificar se é código técnico e buscar nome do condomínio
        const isTechCode = isTechnicalCode(microbairro);
        const condominioNome = condominioMap.get(microbairro.toUpperCase());

        return {
          microbairro,
          valor_m2,
          total_transacoes: dados.totalTransacoes,
          valor_m2_apt: valor_m2_apt || valor_m2,
          valor_m2_casa: valor_m2_casa || Math.round(valor_m2 * 0.92),
          rank: 0,
          trend: "stable" as const,
          condominioNome,
          isTechnicalCode: isTechCode,
        };
      });

      result.sort((a, b) => b.valor_m2 - a.valor_m2);
      
      return result.map((item, index) => ({
        ...item,
        rank: index + 1,
        trend: index < 3 ? "high" : "stable",
      }));
    },
  });
}

export function useKPIStats(bairro: string = 'BARRA DA TIJUCA') {
  return useQuery({
    queryKey: ['kpi-stats-v5', bairro],
    queryFn: async () => {
      const outlierLimit = getOutlierLimit(bairro);
      const normalizedBairro = bairro.toUpperCase();
      
      // Verificar se o bairro tem microbairros configurados
      const { data: microbairrosGeo } = await supabase
        .from('microbairros_geo')
        .select('nome, keywords')
        .eq('bairro', normalizedBairro);
      
      const hasMicrobairrosConfig = (microbairrosGeo?.length || 0) > 0;
      
      const twentyFourMonthsAgo = new Date();
      twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);
      const startDate24Months = twentyFourMonthsAgo.toISOString().split('T')[0];

      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const startDate12Months = twelveMonthsAgo.toISOString().split('T')[0];

      const { data: currentPeriodData, error: currentError } = await supabase
        .from('itbi_transactions')
        .select('logradouro, valor_m2, tipologia, uso, total_transacoes, microbairro')
        .eq('uso', 'Residencial')
        .ilike('bairro', bairro)
        .not('valor_m2', 'is', null)
        .lte('valor_m2', outlierLimit)
        .gte('data_transacao', startDate12Months)
        .limit(10000);

      if (currentError) throw currentError;

      const { data: previousPeriodData, error: previousError } = await supabase
        .from('itbi_transactions')
        .select('valor_m2')
        .eq('uso', 'Residencial')
        .ilike('bairro', bairro)
        .not('valor_m2', 'is', null)
        .lte('valor_m2', outlierLimit)
        .gte('data_transacao', startDate24Months)
        .lt('data_transacao', startDate12Months)
        .limit(10000);

      if (previousError) throw previousError;

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

      // Calcular microbairro mais valorizado dinamicamente
      let bairroMaisValorizado = 'N/A';
      let precoMedioBairro = 0;

      if (hasMicrobairrosConfig) {
        // Para bairros com microbairros configurados, classificar por microbairro
        const classifyByKeywords = (logradouro: string): string | null => {
          const log = logradouro.toUpperCase();
          for (const micro of microbairrosGeo || []) {
            for (const keyword of micro.keywords || []) {
              if (log.includes(keyword.toUpperCase())) {
                return micro.nome;
              }
            }
          }
          return null;
        };

        const microbairroStats: Record<string, { sum: number; count: number }> = {};
        
        currentTransactions.forEach((t: any) => {
          const micro = t.microbairro || classifyByKeywords(t.logradouro);
          if (micro) {
            if (!microbairroStats[micro]) {
              microbairroStats[micro] = { sum: 0, count: 0 };
            }
            const transCount = t.total_transacoes || 1;
            microbairroStats[micro].sum += (t.valor_m2 || 0) * transCount;
            microbairroStats[micro].count += transCount;
          }
        });

        // Encontrar o mais valorizado com pelo menos 3 transações
        let maxAvg = 0;
        Object.entries(microbairroStats).forEach(([micro, stats]) => {
          if (stats.count >= 3) {
            const avg = stats.sum / stats.count;
            if (avg > maxAvg) {
              maxAvg = avg;
              bairroMaisValorizado = micro;
              precoMedioBairro = Math.round(avg);
            }
          }
        });
      } else {
        // Para outros bairros, usar o logradouro mais valorizado
        const logradouroStats: Record<string, { sum: number; count: number }> = {};
        
        currentTransactions.forEach((t: any) => {
          const log = t.logradouro;
          if (!logradouroStats[log]) {
            logradouroStats[log] = { sum: 0, count: 0 };
          }
          const transCount = t.total_transacoes || 1;
          logradouroStats[log].sum += (t.valor_m2 || 0) * transCount;
          logradouroStats[log].count += transCount;
        });

        let maxAvg = 0;
        Object.entries(logradouroStats).forEach(([log, stats]) => {
          if (stats.count >= 3) {
            const avg = stats.sum / stats.count;
            if (avg > maxAvg) {
              maxAvg = avg;
              // Simplificar nome do logradouro
              bairroMaisValorizado = log.replace(/^(AVN?|RUA|EST|TV|PCA|AL)\s+/i, '').substring(0, 25);
              precoMedioBairro = Math.round(avg);
            }
          }
        });
      }

      // Somar total_transacoes ao invés de contar registros
      const liquidez = currentTransactions.reduce((sum, t) => sum + ((t as any).total_transacoes || 1), 0);

      return {
        precoMedio: Math.round(precoMedio),
        liquidez,
        variacaoAnual: variacaoAnual.toFixed(1),
        bairroMaisValorizado,
        precoMedioBairro,
      };
    },
  });
}
