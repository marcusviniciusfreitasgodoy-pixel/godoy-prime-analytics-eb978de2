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
  mesReferencia: string; // Mês de referência para a variação mensal
}

interface TransactionData {
  valor_m2: number | null;
  tipologia: string | null;
  total_transacoes: number | null;
  data_transacao?: string;
}

// Função para agrupar transações por mês (YYYY-MM)
const agruparPorMes = (transactions: TransactionData[]) => {
  const grupos: Record<string, TransactionData[]> = {};
  
  for (const t of transactions) {
    if (t.data_transacao) {
      const mesAno = t.data_transacao.substring(0, 7); // YYYY-MM
      if (!grupos[mesAno]) grupos[mesAno] = [];
      grupos[mesAno].push(t);
    }
  }
  
  return grupos;
};

export function useKPIStats(bairro: string = 'BARRA DA TIJUCA') {
  return useQuery<KPIStatsData>({
    queryKey: ['kpi-stats-detailed-v3', bairro],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      // Datas dinâmicas baseadas na data atual
      const now = new Date();
      
      // Últimos 12 meses (período atual)
      const twelveMonthsAgo = new Date(now);
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const startDate12Months = twelveMonthsAgo.toISOString().split('T')[0];
      
      // 24 meses atrás (para período anterior de comparação YoY)
      const twentyFourMonthsAgo = new Date(now);
      twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);
      const startDate24Months = twentyFourMonthsAgo.toISOString().split('T')[0];

      // Último mês para variação mensal
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const startDateLastMonth = oneMonthAgo.toISOString().split('T')[0];

      // Dois meses atrás
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const startDateTwoMonths = twoMonthsAgo.toISOString().split('T')[0];

      console.log('[KPI] Período atual:', startDate12Months, 'até hoje');
      console.log('[KPI] Período anterior:', startDate24Months, 'até', startDate12Months);

      // Buscar transações dos últimos 12 meses (período atual) - SOMENTE RESIDENCIAL
      // METODOLOGIA PREFEITURA: Filtrar percentual_transferido >= 90%
      const { data: currentPeriodData, error: currentError } = await supabase
        .from('itbi_transactions')
        .select('valor_m2, tipologia, data_transacao, total_transacoes')
        .eq('uso', 'Residencial')
        .eq('bairro', bairro)
        .not('valor_m2', 'is', null)
        .gte('percentual_transferido', 90)
        .gte('data_transacao', startDate12Months)
        .limit(10000);

      if (currentError) throw currentError;

      // Buscar transações dos 12 meses anteriores (para comparação YoY) - SOMENTE RESIDENCIAL
      const { data: previousPeriodData, error: previousError } = await supabase
        .from('itbi_transactions')
        .select('valor_m2, tipologia, total_transacoes')
        .eq('uso', 'Residencial')
        .eq('bairro', bairro)
        .not('valor_m2', 'is', null)
        .gte('percentual_transferido', 90)
        .gte('data_transacao', startDate24Months)
        .lt('data_transacao', startDate12Months)
        .limit(10000);

      if (previousError) throw previousError;

      const currentTransactions = currentPeriodData || [];
      const previousTransactions = previousPeriodData || [];

      console.log('[KPI] Registros período atual:', currentTransactions.length);
      console.log('[KPI] Registros período anterior:', previousTransactions.length);

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

      // Transações agrupadas por mês para encontrar os últimos 2 meses com dados
      const transacoesPorMes = agruparPorMes(currentTransactions);
      const mesesComDados = Object.keys(transacoesPorMes).sort().reverse(); // Mais recente primeiro
      
      console.log('[KPI] Meses com dados:', mesesComDados);

      // Pegar os dois últimos meses com dados
      const ultimoMes = mesesComDados[0] || null;
      const penultimoMes = mesesComDados[1] || null;

      const lastMonthTransactions = ultimoMes ? transacoesPorMes[ultimoMes] : [];
      const previousMonthTransactions = penultimoMes ? transacoesPorMes[penultimoMes] : [];

      // METODOLOGIA PREFEITURA: Calcular médias ponderadas por total_transacoes
      const calcMediaPonderada = (arr: TransactionData[]) => {
        if (arr.length === 0) return 0;
        
        let somaValoresPonderados = 0;
        let somaTransacoes = 0;
        
        for (const t of arr) {
          const peso = t.total_transacoes || 1;
          somaValoresPonderados += (t.valor_m2 || 0) * peso;
          somaTransacoes += peso;
        }
        
        return somaTransacoes > 0 ? somaValoresPonderados / somaTransacoes : 0;
      };

      // METODOLOGIA PREFEITURA: Calcular liquidez como soma de total_transacoes
      const calcLiquidez = (arr: TransactionData[]) => {
        return arr.reduce((sum, t) => sum + (t.total_transacoes || 1), 0);
      };

      const precoMedio = calcMediaPonderada(currentTransactions);
      const precoMedioApt = calcMediaPonderada(currentApt);
      const precoMedioCasa = calcMediaPonderada(currentCasa);
      
      const precoMedioAnterior = calcMediaPonderada(previousTransactions);
      const precoMedioAptAnterior = calcMediaPonderada(previousApt);
      const precoMedioCasaAnterior = calcMediaPonderada(previousCasa);

      const precoMedioLastMonth = calcMediaPonderada(lastMonthTransactions);
      const precoMedioPrevMonth = calcMediaPonderada(previousMonthTransactions);

      // Calcular liquidez real usando total_transacoes
      const liquidez = calcLiquidez(currentTransactions);
      const liquidezApt = calcLiquidez(currentApt);
      const liquidezCasa = calcLiquidez(currentCasa);

      console.log('[KPI] Liquidez real (total_transacoes):', liquidez);
      console.log('[KPI] Preço médio ponderado:', precoMedio);
      console.log('[KPI] Último mês com dados:', ultimoMes, '- Transações:', lastMonthTransactions.length);
      console.log('[KPI] Penúltimo mês com dados:', penultimoMes, '- Transações:', previousMonthTransactions.length);

      // Calcular variações - retorna null se não houver dados suficientes
      const calcVariacao = (atual: number, anterior: number): number | null => {
        if (atual === 0 && anterior === 0) return null;
        if (anterior === 0) return null;
        return ((atual - anterior) / anterior) * 100;
      };

      const variacaoAnual = calcVariacao(precoMedio, precoMedioAnterior);
      const variacaoAnualApt = calcVariacao(precoMedioApt, precoMedioAptAnterior);
      const variacaoAnualCasa = calcVariacao(precoMedioCasa, precoMedioCasaAnterior);
      
      // Variação mensal: compara os dois últimos meses com dados
      const variacaoMensal = (lastMonthTransactions.length > 0 && previousMonthTransactions.length > 0)
        ? calcVariacao(precoMedioLastMonth, precoMedioPrevMonth)
        : null;

      // Formatar nome do mês de referência
      const formatarMesReferencia = (mesAno: string | null) => {
        if (!mesAno) return 'N/A';
        const [ano, mes] = mesAno.split('-');
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${meses[parseInt(mes) - 1]}/${ano}`;
      };

      const mesReferencia = ultimoMes ? formatarMesReferencia(ultimoMes) : 'N/A';

      // Buscar microbairro mais valorizado com breakdown
      const { data: rankingData } = await supabase
        .from('view_ranking_microbairros')
        .select('microbairro, preco_medio_m2')
        .order('preco_medio_m2', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Buscar breakdown do bairro mais valorizado
      let precoMedioBairroApt = rankingData?.preco_medio_m2 || 0;
      let precoMedioBairroCasa = (rankingData?.preco_medio_m2 || 0) * 0.9;

      if (rankingData?.microbairro) {
        const { data: bairroTransactions } = await supabase
          .from('itbi_transactions')
          .select('valor_m2, tipologia, total_transacoes')
          .eq('uso', 'Residencial')
          .eq('bairro', bairro)
          .gte('percentual_transferido', 90)
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
            precoMedioBairroApt = calcMediaPonderada(bairroApt);
          }
          if (bairroCasa.length > 0) {
            precoMedioBairroCasa = calcMediaPonderada(bairroCasa);
          }
        }
      }

      return {
        precoMedio: Math.round(precoMedio),
        precoMedioApt: Math.round(precoMedioApt || precoMedio),
        precoMedioCasa: Math.round(precoMedioCasa || precoMedio * 0.85),
        liquidez,
        liquidezApt,
        liquidezCasa,
        variacaoAnual: variacaoAnual !== null ? variacaoAnual.toFixed(2) : 'N/A',
        variacaoAnualApt: variacaoAnualApt !== null ? variacaoAnualApt.toFixed(1) : 'N/A',
        variacaoAnualCasa: variacaoAnualCasa !== null ? variacaoAnualCasa.toFixed(1) : 'N/A',
        bairroMaisValorizado: rankingData?.microbairro || 'N/A',
        precoMedioBairro: rankingData?.preco_medio_m2 || 0,
        precoMedioBairroApt: Math.round(precoMedioBairroApt),
        precoMedioBairroCasa: Math.round(precoMedioBairroCasa),
        variacaoMensal: variacaoMensal !== null ? variacaoMensal.toFixed(2) : 'N/A',
        mesReferencia,
      };
    },
  });
}
