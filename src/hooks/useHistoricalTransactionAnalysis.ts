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

export interface YearlyData {
  ano: number;
  transacoes: number;
  valorMedioM2: number;
  valorMinM2: number;
  valorMaxM2: number;
}

export interface HistoricalAnalysis {
  yearlyData: YearlyData[];
  transactionTrend: 'crescente' | 'estavel' | 'decrescente';
  priceTrend: 'alta' | 'estavel' | 'baixa';
  liquidityScore: number; // 0-100
  liquidityLevel: 'alta' | 'media' | 'baixa';
  transactionGrowth: number; // % crescimento médio anual de transações
  priceGrowth: number; // % crescimento médio anual de preços
  diagnostico: string;
  alertas: string[];
}

export function useHistoricalTransactionAnalysis(logradouro: string, bairro: string, enabled: boolean = true) {
  return useQuery<HistoricalAnalysis | null>({
    queryKey: ['historical-analysis-5y', logradouro, bairro],
    queryFn: async () => {
      if (!logradouro || !bairro) return null;
      
      const outlierLimit = getOutlierLimit(bairro);
      
      // Buscar transações dos últimos 5 anos
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      const startDate = fiveYearsAgo.toISOString().split('T')[0];
      
      // Primeiro buscar por logradouro específico
      let { data: transactions, error } = await supabase
        .from('itbi_transactions')
        .select('data_transacao, valor_m2')
        .ilike('logradouro', `%${logradouro}%`)
        .ilike('bairro', bairro)
        .eq('uso', 'Residencial')
        .not('valor_m2', 'is', null)
        .lte('valor_m2', outlierLimit)
        .gte('data_transacao', startDate)
        .order('data_transacao', { ascending: true });
      
      if (error) throw error;
      
      // Se poucos dados do logradouro, buscar do bairro todo
      if (!transactions || transactions.length < 20) {
        const { data: bairroTransactions, error: bairroError } = await supabase
          .from('itbi_transactions')
          .select('data_transacao, valor_m2')
          .ilike('bairro', bairro)
          .eq('uso', 'Residencial')
          .not('valor_m2', 'is', null)
          .lte('valor_m2', outlierLimit)
          .gte('data_transacao', startDate)
          .order('data_transacao', { ascending: true });
        
        if (bairroError) throw bairroError;
        transactions = bairroTransactions;
      }
      
      if (!transactions || transactions.length === 0) return null;
      
      // Agrupar por ano
      const currentYear = new Date().getFullYear();
      const yearlyMap: Record<number, { valores: number[], count: number }> = {};
      
      // Inicializar últimos 5 anos
      for (let i = 0; i < 5; i++) {
        yearlyMap[currentYear - i] = { valores: [], count: 0 };
      }
      
      transactions.forEach(t => {
        const year = new Date(t.data_transacao).getFullYear();
        if (yearlyMap[year]) {
          yearlyMap[year].valores.push(t.valor_m2!);
          yearlyMap[year].count++;
        }
      });
      
      // Calcular estatísticas por ano
      const yearlyData: YearlyData[] = Object.entries(yearlyMap)
        .map(([ano, data]) => {
          const valores = data.valores;
          const valorMedioM2 = valores.length > 0 
            ? valores.reduce((a, b) => a + b, 0) / valores.length 
            : 0;
          const valorMinM2 = valores.length > 0 ? Math.min(...valores) : 0;
          const valorMaxM2 = valores.length > 0 ? Math.max(...valores) : 0;
          
          return {
            ano: parseInt(ano),
            transacoes: data.count,
            valorMedioM2: Math.round(valorMedioM2),
            valorMinM2: Math.round(valorMinM2),
            valorMaxM2: Math.round(valorMaxM2),
          };
        })
        .sort((a, b) => a.ano - b.ano);
      
      // Calcular tendências (últimos 5 anos)
      const yearsWithData = yearlyData.filter(y => y.transacoes > 0);
      
      if (yearsWithData.length < 2) {
        return {
          yearlyData,
          transactionTrend: 'estavel' as const,
          priceTrend: 'estavel' as const,
          liquidityScore: 30,
          liquidityLevel: 'baixa' as const,
          transactionGrowth: 0,
          priceGrowth: 0,
          diagnostico: 'Dados insuficientes para análise de tendência. Região com poucas transações registradas.',
          alertas: ['⚠️ Poucos dados históricos disponíveis'],
        };
      }
      
      // Calcular crescimento médio de transações
      const firstYear = yearsWithData[0];
      const lastYear = yearsWithData[yearsWithData.length - 1];
      const yearDiff = lastYear.ano - firstYear.ano;
      
      let transactionGrowth = 0;
      if (yearDiff > 0 && firstYear.transacoes > 0) {
        const totalGrowth = ((lastYear.transacoes - firstYear.transacoes) / firstYear.transacoes) * 100;
        transactionGrowth = totalGrowth / yearDiff;
      }
      
      // Calcular crescimento médio de preços
      let priceGrowth = 0;
      if (yearDiff > 0 && firstYear.valorMedioM2 > 0) {
        const totalPriceGrowth = ((lastYear.valorMedioM2 - firstYear.valorMedioM2) / firstYear.valorMedioM2) * 100;
        priceGrowth = totalPriceGrowth / yearDiff;
      }
      
      // Determinar tendência de transações
      const transactionTrend: 'crescente' | 'estavel' | 'decrescente' = 
        transactionGrowth > 5 ? 'crescente' :
        transactionGrowth < -5 ? 'decrescente' : 'estavel';
      
      // Determinar tendência de preços
      const priceTrend: 'alta' | 'estavel' | 'baixa' = 
        priceGrowth > 3 ? 'alta' :
        priceGrowth < -3 ? 'baixa' : 'estavel';
      
      // Calcular score de liquidez
      const totalTransactions = yearsWithData.reduce((sum, y) => sum + y.transacoes, 0);
      const avgTransactionsPerYear = totalTransactions / yearsWithData.length;
      
      // Score baseado em volume e tendência
      let liquidityScore = Math.min(100, avgTransactionsPerYear * 2);
      if (transactionTrend === 'crescente') liquidityScore += 15;
      if (transactionTrend === 'decrescente') liquidityScore -= 15;
      liquidityScore = Math.max(0, Math.min(100, liquidityScore));
      
      const liquidityLevel: 'alta' | 'media' | 'baixa' = 
        liquidityScore >= 70 ? 'alta' :
        liquidityScore >= 40 ? 'media' : 'baixa';
      
      // Gerar diagnóstico
      const diagnostico = generateDiagnostico(
        transactionTrend, 
        priceTrend, 
        liquidityLevel,
        transactionGrowth,
        priceGrowth,
        totalTransactions
      );
      
      // Gerar alertas
      const alertas = generateAlertas(
        transactionTrend,
        priceTrend,
        liquidityLevel,
        yearsWithData
      );
      
      return {
        yearlyData,
        transactionTrend,
        priceTrend,
        liquidityScore: Math.round(liquidityScore),
        liquidityLevel,
        transactionGrowth: Math.round(transactionGrowth * 10) / 10,
        priceGrowth: Math.round(priceGrowth * 10) / 10,
        diagnostico,
        alertas,
      };
    },
    enabled: enabled && !!logradouro && !!bairro,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

function generateDiagnostico(
  transactionTrend: string,
  priceTrend: string,
  liquidityLevel: string,
  transactionGrowth: number,
  priceGrowth: number,
  totalTransactions: number
): string {
  const parts: string[] = [];
  
  // Liquidez
  if (liquidityLevel === 'alta') {
    parts.push(`Região com alta liquidez (${totalTransactions} transações em 5 anos).`);
  } else if (liquidityLevel === 'media') {
    parts.push(`Região com liquidez moderada (${totalTransactions} transações em 5 anos).`);
  } else {
    parts.push(`Região com baixa liquidez (${totalTransactions} transações em 5 anos), o que pode dificultar a venda.`);
  }
  
  // Tendência de transações
  if (transactionTrend === 'crescente') {
    parts.push(`O volume de negócios está crescendo (${transactionGrowth > 0 ? '+' : ''}${transactionGrowth.toFixed(1)}% a.a.), indicando aumento de interesse na região.`);
  } else if (transactionTrend === 'decrescente') {
    parts.push(`O volume de negócios está caindo (${transactionGrowth.toFixed(1)}% a.a.), sugerindo menor demanda.`);
  } else {
    parts.push(`O volume de transações está estável.`);
  }
  
  // Tendência de preços
  if (priceTrend === 'alta') {
    parts.push(`Os preços apresentam tendência de alta (+${priceGrowth.toFixed(1)}% a.a.), valorizando o investimento.`);
  } else if (priceTrend === 'baixa') {
    parts.push(`Os preços estão em queda (${priceGrowth.toFixed(1)}% a.a.), indicando possível desvalorização.`);
  } else {
    parts.push(`Os preços estão estáveis no período analisado.`);
  }
  
  return parts.join(' ');
}

function generateAlertas(
  transactionTrend: string,
  priceTrend: string,
  liquidityLevel: string,
  yearsWithData: YearlyData[]
): string[] {
  const alertas: string[] = [];
  
  if (liquidityLevel === 'baixa') {
    alertas.push('⚠️ Baixa liquidez pode exigir maior tempo de comercialização');
  }
  
  if (transactionTrend === 'decrescente') {
    alertas.push('📉 Volume de transações em queda - avaliar estratégia de precificação');
  }
  
  if (priceTrend === 'baixa') {
    alertas.push('📉 Tendência de queda nos preços - considerar precificação competitiva');
  }
  
  if (priceTrend === 'alta' && transactionTrend === 'crescente') {
    alertas.push('✅ Mercado aquecido - momento favorável para comercialização');
  }
  
  // Verificar se último ano tem poucos dados
  const lastYear = yearsWithData[yearsWithData.length - 1];
  const currentYear = new Date().getFullYear();
  if (lastYear && lastYear.ano === currentYear && lastYear.transacoes < 5) {
    alertas.push('ℹ️ Ano corrente com dados parciais');
  }
  
  return alertas;
}
