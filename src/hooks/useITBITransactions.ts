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


/**
 * Estatística ponderada por escrituras (total_transacoes) de um grupo de linhas
 * agregadas: média = Σ v·w / Σ w; mediana = valor onde a soma acumulada dos
 * pesos atinge metade do total (equivale a expandir cada linha pelo peso).
 */
const weightedGroupStats = (items: { valor: number; peso: number }[]) => {
  const sorted = [...items].sort((a, b) => a.valor - b.valor);
  const total = sorted.reduce((s, x) => s + x.peso, 0);
  if (sorted.length === 0 || total <= 0) return { media: 0, mediana: 0, min: 0, max: 0, escrituras: 0 };
  const media = sorted.reduce((s, x) => s + x.valor * x.peso, 0) / total;
  let acc = 0;
  let mediana = sorted[sorted.length - 1].valor;
  for (const x of sorted) {
    acc += x.peso;
    if (acc >= total / 2) {
      mediana = x.valor;
      break;
    }
  }
  return { media, mediana, min: sorted[0].valor, max: sorted[sorted.length - 1].valor, escrituras: total };
};

export function useMicrobairroRanking(bairro: string = 'BARRA DA TIJUCA') {
  const { isDemo } = useDemo();
  
  return useQuery<MicrobairroRanking[]>({
    queryKey: ['microbairro-ranking-v7', bairro, isDemo],
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
            acc[micro] = { itens: [] };
          }
          acc[micro].itens.push({ valor: t.valor_m2!, peso: t.total_transacoes || 1 });
          return acc;
        }, {} as Record<string, { itens: { valor: number; peso: number }[] }>);

        // Média, mediana, mínimo e máximo ponderados por escrituras (antes: média e
        // mediana simples das linhas agregadas, que davam o mesmo peso a 1 e a 30 escrituras).
        const result = Object.entries(grouped).map(([microbairro, data]) => {
          const st = weightedGroupStats(data.itens);
          return {
            microbairro,
            total_transacoes: st.escrituras,
            preco_medio_m2: Math.round(st.media),
            preco_min_m2: st.min,
            preco_max_m2: st.max,
            mediana_m2: Math.round(st.mediana),
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
          acc[key] = { itens: [] };
        }
        acc[key].itens.push({ valor: t.valor_m2!, peso: t.total_transacoes || 1 });
        return acc;
      }, {} as Record<string, { itens: { valor: number; peso: number }[] }>);

      const result = Object.entries(grouped).map(([logradouro, data]) => {
        const st = weightedGroupStats(data.itens);
        return {
          microbairro: logradouro,
          total_transacoes: st.escrituras,
          preco_medio_m2: Math.round(st.media),
          preco_min_m2: st.min,
          preco_max_m2: st.max,
          mediana_m2: Math.round(st.mediana),
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
    queryKey: ['microbairro-detalhado-v8', bairro],
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
        .gte('percentual_transferido', 90)
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
