import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KPIStatsData {
  precoMedio: number;
  precoMedioApt: number;
  precoMedioCasa: number;
  liquidez: number;
  liquidezApt: number;
  liquidezCasa: number;
  variacaoAnual: string;
  variacaoAnualApt: string;
  variacaoAnualCasa: string;
  bairroMaisValorizado: string;
  precoMedioBairro: number;
  precoMedioBairroApt: number;
  precoMedioBairroCasa: number;
  variacaoMensal: string;
}

interface TransactionData {
  valor_m2: number | null;
  tipologia: string | null;
}

export function useKPIStats() {
  return useQuery<KPIStatsData>({
    queryKey: ['kpi-stats-detailed'],
    queryFn: async () => {
      // Dados desde 2020 para KPIs (ajustado para dados históricos disponíveis)
      const startDate24Months = '2020-01-01';
      const startDate12Months = '2020-07-01'; // Meio de 2020 para dividir períodos

      // Último mês para variação mensal
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const startDateLastMonth = oneMonthAgo.toISOString().split('T')[0];

      // Dois meses atrás
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const startDateTwoMonths = twoMonthsAgo.toISOString().split('T')[0];

      // Buscar transações dos últimos 12 meses (período atual)
      const { data: currentPeriodData, error: currentError } = await supabase
        .from('itbi_transactions')
        .select('valor_m2, tipologia, data_transacao')
        .eq('uso', 'Residencial')
        .eq('bairro', 'BARRA DA TIJUCA')
        .gte('data_transacao', startDate12Months)
        .limit(10000);

      if (currentError) throw currentError;

      // Buscar transações dos 12 meses anteriores (para comparação YoY)
      const { data: previousPeriodData, error: previousError } = await supabase
        .from('itbi_transactions')
        .select('valor_m2, tipologia')
        .eq('uso', 'Residencial')
        .eq('bairro', 'BARRA DA TIJUCA')
        .gte('data_transacao', startDate24Months)
        .lt('data_transacao', startDate12Months)
        .limit(10000);

      if (previousError) throw previousError;

      const currentTransactions = currentPeriodData || [];
      const previousTransactions = previousPeriodData || [];

      // Separar por tipologia - current
      const currentApt = currentTransactions.filter(t => 
        t.tipologia?.toLowerCase().includes('apartamento')
      );
      const currentCasa = currentTransactions.filter(t => 
        t.tipologia?.toLowerCase().includes('casa')
      );
      
      // Separar por tipologia - previous
      const previousApt = previousTransactions.filter(t => 
        t.tipologia?.toLowerCase().includes('apartamento')
      );
      const previousCasa = previousTransactions.filter(t => 
        t.tipologia?.toLowerCase().includes('casa')
      );

      // Transações do último mês
      const lastMonthTransactions = currentTransactions.filter(t => 
        t.data_transacao >= startDateLastMonth
      );
      const previousMonthTransactions = currentTransactions.filter(t => 
        t.data_transacao >= startDateTwoMonths && t.data_transacao < startDateLastMonth
      );

      // Calcular médias
      const calcMedia = (arr: TransactionData[]) => 
        arr.length > 0 
          ? arr.reduce((sum, t) => sum + (t.valor_m2 || 0), 0) / arr.length 
          : 0;

      const precoMedio = calcMedia(currentTransactions);
      const precoMedioApt = calcMedia(currentApt);
      const precoMedioCasa = calcMedia(currentCasa);
      
      const precoMedioAnterior = calcMedia(previousTransactions);
      const precoMedioAptAnterior = calcMedia(previousApt);
      const precoMedioCasaAnterior = calcMedia(previousCasa);

      const precoMedioLastMonth = calcMedia(lastMonthTransactions);
      const precoMedioPrevMonth = calcMedia(previousMonthTransactions);

      // Calcular variações
      const calcVariacao = (atual: number, anterior: number) => 
        anterior > 0 ? ((atual - anterior) / anterior) * 100 : 0;

      const variacaoAnual = calcVariacao(precoMedio, precoMedioAnterior);
      const variacaoAnualApt = calcVariacao(precoMedioApt, precoMedioAptAnterior);
      const variacaoAnualCasa = calcVariacao(precoMedioCasa, precoMedioCasaAnterior);
      const variacaoMensal = calcVariacao(precoMedioLastMonth, precoMedioPrevMonth);

      // Buscar microbairro mais valorizado com breakdown
      const { data: rankingData } = await supabase
        .from('view_ranking_microbairros')
        .select('microbairro, preco_medio_m2')
        .order('preco_medio_m2', { ascending: false })
        .limit(1)
        .single();

      // Buscar breakdown do bairro mais valorizado
      let precoMedioBairroApt = rankingData?.preco_medio_m2 || 0;
      let precoMedioBairroCasa = (rankingData?.preco_medio_m2 || 0) * 0.9;

      if (rankingData?.microbairro) {
        const { data: bairroTransactions } = await supabase
          .from('itbi_transactions')
          .select('valor_m2, tipologia')
          .eq('uso', 'Residencial')
          .eq('bairro', 'BARRA DA TIJUCA')
          .ilike('logradouro', `%${rankingData.microbairro}%`)
          .gte('data_transacao', startDate12Months);

        if (bairroTransactions && bairroTransactions.length > 0) {
          const bairroApt = bairroTransactions.filter(t => 
            t.tipologia?.toLowerCase().includes('apartamento')
          );
          const bairroCasa = bairroTransactions.filter(t => 
            t.tipologia?.toLowerCase().includes('casa')
          );
          
          if (bairroApt.length > 0) {
            precoMedioBairroApt = calcMedia(bairroApt);
          }
          if (bairroCasa.length > 0) {
            precoMedioBairroCasa = calcMedia(bairroCasa);
          }
        }
      }

      return {
        precoMedio: Math.round(precoMedio),
        precoMedioApt: Math.round(precoMedioApt || precoMedio),
        precoMedioCasa: Math.round(precoMedioCasa || precoMedio * 0.85),
        liquidez: currentTransactions.length,
        liquidezApt: currentApt.length,
        liquidezCasa: currentCasa.length,
        variacaoAnual: variacaoAnual.toFixed(2),
        variacaoAnualApt: variacaoAnualApt.toFixed(1),
        variacaoAnualCasa: variacaoAnualCasa.toFixed(1),
        bairroMaisValorizado: rankingData?.microbairro || 'N/A',
        precoMedioBairro: rankingData?.preco_medio_m2 || 0,
        precoMedioBairroApt: Math.round(precoMedioBairroApt),
        precoMedioBairroCasa: Math.round(precoMedioBairroCasa),
        variacaoMensal: variacaoMensal.toFixed(2),
      };
    },
  });
}
