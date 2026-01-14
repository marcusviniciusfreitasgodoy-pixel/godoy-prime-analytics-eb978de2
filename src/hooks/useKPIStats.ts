import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Limites de outliers por bairro (baseados em percentil 99 + margem de segurança)
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
  // Limite padrão para outros bairros
  'DEFAULT': 60000,
};

const getOutlierLimit = (bairro: string): number => {
  const normalizedBairro = bairro.toUpperCase();
  return OUTLIER_LIMITS[normalizedBairro] || OUTLIER_LIMITS['DEFAULT'];
};

// Classificar logradouros em microbairros da Barra da Tijuca
const classificarMicrobairroBarra = (logradouro: string): string | null => {
  const log = logradouro.toUpperCase();
  
  if (log.includes('LUCIO COSTA') || log.includes('LÚCIO COSTA') || 
      log.includes('SERNAMBETIBA') || log.includes('PEPE') || log.includes('PEPÊ')) {
    return 'Orla';
  }
  if (log.includes('PENINSULA') || log.includes('PENÍNSULA')) {
    return 'Península';
  }
  if (log.includes('ABELARDO BUENO') || log.includes('EMBAIXADOR')) {
    return 'Centro Metropolitano';
  }
  if (log.includes('AYRTON SENNA') || log.includes('VIA PARQUE') || log.includes('ALFA BARRA')) {
    return 'Ayrton Senna';
  }
  if (log.includes('OLEGARIO') || log.includes('OLEGÁRIO') || 
      log.includes('ERICO') || log.includes('ÉRICO') || log.includes('VERÍSSIMO') || log.includes('VERISSIMO')) {
    return 'Jardim Oceânico';
  }
  if (log.includes('DULCIDIO') || log.includes('DULCÍDIO') || log.includes('CARDOSO')) {
    return 'ABM';
  }
  if (log.includes('MARIO COVAS') || log.includes('MÁRIO COVAS') ||
      log.includes('CESAR LATTES') || log.includes('CÉSAR LATTES') ||
      log.includes('HENRIQUE CORDEIRO')) {
    return 'Parque das Rosas';
  }
  if (log.includes('AMERICAS') || log.includes('AMÉRICAS')) {
    return 'Eixo Américas';
  }
  
  return null;
};

const MIN_REGISTROS_ANO_ATUAL = 30;
const MIN_TRANSACOES_REAIS = 100;

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
  mesReferencia: string;
  usandoDadosHistoricos?: boolean;
}

interface TransactionData {
  valor_m2: number | null;
  tipologia: string | null;
  total_transacoes: number | null;
  data_transacao?: string;
  logradouro?: string;
}

const agruparPorMes = (transactions: TransactionData[]) => {
  const grupos: Record<string, TransactionData[]> = {};
  
  for (const t of transactions) {
    if (t.data_transacao) {
      const mesAno = t.data_transacao.substring(0, 7);
      if (!grupos[mesAno]) grupos[mesAno] = [];
      grupos[mesAno].push(t);
    }
  }
  
  return grupos;
};

export function useKPIStats(bairro: string = 'BARRA DA TIJUCA') {
  return useQuery<KPIStatsData>({
    queryKey: ['kpi-stats-detailed-v5', bairro],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      
      // Limite de outliers dinâmico por bairro
      const outlierLimit = getOutlierLimit(bairro);
      
      const { data: currentYearData, error: currentYearError } = await supabase
        .from('itbi_transactions')
        .select('valor_m2, tipologia, data_transacao, total_transacoes, logradouro')
        .eq('uso', 'Residencial')
        .ilike('bairro', bairro)
        .not('valor_m2', 'is', null)
        .lte('valor_m2', outlierLimit)
        .gte('percentual_transferido', 90)
        .gte('data_transacao', startOfYear)
        .limit(10000);

      if (currentYearError) throw currentYearError;

      const currentYearTransactions = currentYearData || [];
      const totalTransacoesAnoAtual = currentYearTransactions.reduce((sum, t) => sum + (t.total_transacoes || 1), 0);
      
      const amostragemSuficiente = 
        currentYearTransactions.length >= MIN_REGISTROS_ANO_ATUAL || 
        totalTransacoesAnoAtual >= MIN_TRANSACOES_REAIS;

      console.log(`[KPI] ${bairro} - Limite outlier: R$ ${outlierLimit}/m²`);
      console.log(`[KPI] Ano atual ${currentYear}: ${currentYearTransactions.length} registros, ${totalTransacoesAnoAtual} transações`);

      let usandoDadosHistoricos = false;
      let currentTransactions = currentYearTransactions;

      if (!amostragemSuficiente) {
        usandoDadosHistoricos = true;
        const twelveMonthsAgo = new Date(now);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const startDate12Months = twelveMonthsAgo.toISOString().split('T')[0];

        const { data: extendedData, error: extendedError } = await supabase
          .from('itbi_transactions')
          .select('valor_m2, tipologia, data_transacao, total_transacoes, logradouro')
          .eq('uso', 'Residencial')
          .ilike('bairro', bairro)
          .not('valor_m2', 'is', null)
          .lte('valor_m2', outlierLimit)
          .gte('percentual_transferido', 90)
          .gte('data_transacao', startDate12Months)
          .limit(10000);

        if (extendedError) throw extendedError;
        currentTransactions = extendedData || [];
        console.log(`[KPI] Usando fallback 12 meses: ${currentTransactions.length} registros`);
      }

      const twelveMonthsAgo = new Date(now);
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const startDate12Months = twelveMonthsAgo.toISOString().split('T')[0];

      const twentyFourMonthsAgo = new Date(now);
      twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);
      const startDate24Months = twentyFourMonthsAgo.toISOString().split('T')[0];

      const { data: previousPeriodData, error: previousError } = await supabase
        .from('itbi_transactions')
        .select('valor_m2, tipologia, total_transacoes')
        .eq('uso', 'Residencial')
        .ilike('bairro', bairro)
        .not('valor_m2', 'is', null)
        .lte('valor_m2', outlierLimit)
        .gte('percentual_transferido', 90)
        .gte('data_transacao', startDate24Months)
        .lt('data_transacao', startDate12Months)
        .limit(10000);

      if (previousError) throw previousError;

      const previousTransactions = previousPeriodData || [];

      const currentApt = currentTransactions.filter(t => 
        t.tipologia?.toLowerCase().includes('apartamento')
      );
      const currentCasa = currentTransactions.filter(t => 
        t.tipologia?.toLowerCase().includes('casa')
      );
      
      const previousApt = previousTransactions.filter(t => 
        t.tipologia?.toLowerCase().includes('apartamento')
      );
      const previousCasa = previousTransactions.filter(t => 
        t.tipologia?.toLowerCase().includes('casa')
      );

      const transacoesPorMes = agruparPorMes(currentTransactions);
      const mesesComDados = Object.keys(transacoesPorMes).sort().reverse();

      const ultimoMes = mesesComDados[0] || null;
      const penultimoMes = mesesComDados[1] || null;

      const lastMonthTransactions = ultimoMes ? transacoesPorMes[ultimoMes] : [];
      const previousMonthTransactions = penultimoMes ? transacoesPorMes[penultimoMes] : [];

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

      const liquidez = calcLiquidez(currentTransactions);
      const liquidezApt = calcLiquidez(currentApt);
      const liquidezCasa = calcLiquidez(currentCasa);

      const calcVariacao = (atual: number, anterior: number): number | null => {
        if (atual === 0 && anterior === 0) return null;
        if (anterior === 0) return null;
        return ((atual - anterior) / anterior) * 100;
      };

      const variacaoAnual = calcVariacao(precoMedio, precoMedioAnterior);
      const variacaoAnualApt = calcVariacao(precoMedioApt, precoMedioAptAnterior);
      const variacaoAnualCasa = calcVariacao(precoMedioCasa, precoMedioCasaAnterior);
      
      const variacaoMensal = (lastMonthTransactions.length > 0 && previousMonthTransactions.length > 0)
        ? calcVariacao(precoMedioLastMonth, precoMedioPrevMonth)
        : null;

      const formatarMesReferencia = (mesAno: string | null) => {
        if (!mesAno) return 'N/A';
        const [ano, mes] = mesAno.split('-');
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${meses[parseInt(mes) - 1]}/${ano}`;
      };

      const mesReferencia = ultimoMes ? formatarMesReferencia(ultimoMes) : 'N/A';

      let regiaoMaisValorizada = 'N/A';
      let precoMedioBairro = 0;
      let precoMedioBairroApt = 0;
      let precoMedioBairroCasa = 0;

      if (bairro.toUpperCase() === 'BARRA DA TIJUCA') {
        // Calcular microbairro mais valorizado dinamicamente usando classificação
        const microbairroStats: Record<string, { somaValores: number; somaTransacoes: number; transacoes: TransactionData[] }> = {};
        
        for (const t of currentTransactions as any[]) {
          const micro = classificarMicrobairroBarra(t.logradouro || '');
          if (micro) {
            if (!microbairroStats[micro]) {
              microbairroStats[micro] = { somaValores: 0, somaTransacoes: 0, transacoes: [] };
            }
            const peso = t.total_transacoes || 1;
            microbairroStats[micro].somaValores += (t.valor_m2 || 0) * peso;
            microbairroStats[micro].somaTransacoes += peso;
            microbairroStats[micro].transacoes.push(t);
          }
        }

        let maxPreco = 0;
        let melhorMicrobairro = 'N/A';
        let melhorTransacoes: TransactionData[] = [];

        for (const [micro, stats] of Object.entries(microbairroStats)) {
          if (stats.somaTransacoes >= 3) { // Mínimo 3 transações
            const mediaMicro = stats.somaValores / stats.somaTransacoes;
            if (mediaMicro > maxPreco) {
              maxPreco = mediaMicro;
              melhorMicrobairro = micro;
              melhorTransacoes = stats.transacoes;
            }
          }
        }

        regiaoMaisValorizada = melhorMicrobairro;
        precoMedioBairro = Math.round(maxPreco);

        const microApt = melhorTransacoes.filter(t => t.tipologia?.toLowerCase().includes('apartamento'));
        const microCasa = melhorTransacoes.filter(t => t.tipologia?.toLowerCase().includes('casa'));
        
        precoMedioBairroApt = microApt.length > 0 ? calcMediaPonderada(microApt) : maxPreco;
        precoMedioBairroCasa = microCasa.length > 0 ? calcMediaPonderada(microCasa) : maxPreco * 0.9;
      } else {
        // Para outros bairros, usar os dados já carregados (currentTransactions)
        // que já aplicam fallback de 12 meses quando ano atual não tem dados suficientes
        const logradouroStats: Record<string, { somaValores: number; somaTransacoes: number; transacoes: TransactionData[] }> = {};
        
        for (const t of currentTransactions as any[]) {
          const log = t.logradouro || 'N/A';
          if (!logradouroStats[log]) {
            logradouroStats[log] = { somaValores: 0, somaTransacoes: 0, transacoes: [] };
          }
          const peso = t.total_transacoes || 1;
          logradouroStats[log].somaValores += (t.valor_m2 || 0) * peso;
          logradouroStats[log].somaTransacoes += peso;
          logradouroStats[log].transacoes.push(t);
        }

        let maxPreco = 0;
        let melhorLogradouro = 'N/A';
        let melhorTransacoes: TransactionData[] = [];

        // Requer mínimo de 3 transações para identificar o logradouro mais valorizado
        for (const [log, stats] of Object.entries(logradouroStats)) {
          if (stats.somaTransacoes >= 3) {
            const mediaLog = stats.somaValores / stats.somaTransacoes;
            if (mediaLog > maxPreco) {
              maxPreco = mediaLog;
              melhorLogradouro = log;
              melhorTransacoes = stats.transacoes;
            }
          }
        }

        regiaoMaisValorizada = melhorLogradouro;
        precoMedioBairro = Math.round(maxPreco);

        const logApt = melhorTransacoes.filter(t => t.tipologia?.toLowerCase().includes('apartamento'));
        const logCasa = melhorTransacoes.filter(t => t.tipologia?.toLowerCase().includes('casa'));
        
        precoMedioBairroApt = logApt.length > 0 ? calcMediaPonderada(logApt) : maxPreco;
        precoMedioBairroCasa = logCasa.length > 0 ? calcMediaPonderada(logCasa) : maxPreco * 0.9;
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
        bairroMaisValorizado: regiaoMaisValorizada,
        precoMedioBairro,
        precoMedioBairroApt: Math.round(precoMedioBairroApt),
        precoMedioBairroCasa: Math.round(precoMedioBairroCasa),
        variacaoMensal: variacaoMensal !== null ? variacaoMensal.toFixed(2) : 'N/A',
        mesReferencia,
        usandoDadosHistoricos,
      };
    },
  });
}
