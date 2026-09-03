import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isTechnicalCode } from '@/lib/utils';
import { useDemo } from '@/contexts/DemoContext';
import { DEMO_MICROBAIRRO_RANKING } from '@/data/demoData';
import { getOutlierLimit } from '@/lib/outlierLimits';

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

/**
 * Agregação ponderada por escrituras (total_transacoes).
 * Cada linha do ITBI representa N escrituras: contar linhas subestima o mercado.
 */
type GrupoPonderado = { amostra: { valor: number; peso: number }[]; total: number };

function medianaPonderada(amostra: { valor: number; peso: number }[]): number {
  if (amostra.length === 0) return 0;
  const ordenada = [...amostra].sort((a, b) => a.valor - b.valor);
  const pesoTotal = ordenada.reduce((s, i) => s + i.peso, 0);
  let acumulado = 0;
  for (const item of ordenada) {
    acumulado += item.peso;
    if (acumulado >= pesoTotal / 2) return item.valor;
  }
  return ordenada[ordenada.length - 1].valor;
}

function resumoPonderado(nome: string, data: GrupoPonderado): MicrobairroRanking {
  const pesoTotal = data.amostra.reduce((s, i) => s + i.peso, 0);
  const media = pesoTotal > 0
    ? data.amostra.reduce((s, i) => s + i.valor * i.peso, 0) / pesoTotal
    : 0;
  const valores = data.amostra.map(i => i.valor);

  return {
    microbairro: nome,
    total_transacoes: data.total,
    preco_medio_m2: Math.round(media),
    preco_min_m2: valores.length ? Math.min(...valores) : 0,
    preco_max_m2: valores.length ? Math.max(...valores) : 0,
    mediana_m2: Math.round(medianaPonderada(data.amostra)),
  };
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
  const { isDemo } = useDemo();
  
  return useQuery<MicrobairroRanking[]>({
    queryKey: ['microbairro-ranking-v6', bairro, isDemo],
    queryFn: async () => {
      if (isDemo) return DEMO_MICROBAIRRO_RANKING;
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
        .limit(5000);

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
            acc[micro] = { amostra: [], total: 0 };
          }
          acc[micro].amostra.push({ valor: t.valor_m2!, peso: t.total_transacoes || 1 });
          acc[micro].total += t.total_transacoes || 1;
          return acc;
        }, {} as Record<string, GrupoPonderado>);

        const result = Object.entries(grouped).map(([microbairro, data]) =>
          resumoPonderado(microbairro, data)
        );

        // Mínimo de 3 transações para aparecer no ranking
        return result
          .filter(r => r.total_transacoes >= 3)
          .sort((a, b) => b.preco_medio_m2 - a.preco_medio_m2);
      }
      
      // Para bairros SEM microbairros configurados, agrupar por logradouro
      const grouped = (transactions || []).reduce((acc, t) => {
        const key = t.logradouro;
        if (!acc[key]) {
          acc[key] = { amostra: [], total: 0 };
        }
        acc[key].amostra.push({ valor: t.valor_m2!, peso: t.total_transacoes || 1 });
        acc[key].total += t.total_transacoes || 1;
        return acc;
      }, {} as Record<string, GrupoPonderado>);

      const result = Object.entries(grouped).map(([logradouro, data]) =>
        resumoPonderado(logradouro, data)
      );

      return result
        .filter(r => r.total_transacoes >= 3)
        .sort((a, b) => b.preco_medio_m2 - a.preco_medio_m2)
        .slice(0, 10);

    },
  });
}

export function useMicrobairroDetalhado(bairro: string = 'BARRA DA TIJUCA') {
  return useQuery<MicrobairroDetalhado[]>({
    queryKey: ['microbairro-detalhado-v7', bairro],
    queryFn: async () => {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const startDate = twelveMonthsAgo.toISOString().split('T')[0];
      
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
        .limit(5000);

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

      type Acc = { valor: number; peso: number };
      const novoAcc = (): Acc => ({ valor: 0, peso: 0 });
      const somar = (a: Acc, valor: number, peso: number) => {
        a.valor += valor * peso;
        a.peso += peso;
      };
      const media = (a: Acc) => (a.peso > 0 ? Math.round(a.valor / a.peso) : 0);

      const grouped = (transactions || []).reduce((acc, t) => {
        const micro = t.logradouro;
        const transCount = t.total_transacoes || 1;

        if (!acc[micro]) {
          acc[micro] = {
            total: novoAcc(),
            apartamentos: novoAcc(),
            casas: novoAcc(),
            totalTransacoes: 0,
          };
        }

        somar(acc[micro].total, t.valor_m2!, transCount);
        acc[micro].totalTransacoes += transCount;

        if (t.tipologia?.toLowerCase().includes('apartamento')) {
          somar(acc[micro].apartamentos, t.valor_m2!, transCount);
        } else if (t.tipologia?.toLowerCase().includes('casa')) {
          somar(acc[micro].casas, t.valor_m2!, transCount);
        }

        return acc;
      }, {} as Record<string, { total: Acc; apartamentos: Acc; casas: Acc; totalTransacoes: number }>);

      const result = Object.entries(grouped).map(([microbairro, dados]) => {
        const valor_m2_apt = media(dados.apartamentos);
        const valor_m2_casa = media(dados.casas);

        // Valor geral: média ponderada por escrituras de TODAS as tipologias
        // (nunca a média aritmética entre apartamento e casa, que ignora o peso de cada amostra)
        const valor_m2 = media(dados.total);

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
        .limit(5000);

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
        .limit(5000);

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
