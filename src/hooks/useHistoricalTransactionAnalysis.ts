import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  getCachedAnalysis, 
  setCachedAnalysis 
} from '@/utils/historicalAnalysisCache';

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
  // Variações ano a ano
  variacaoTransacoes: number | null; // % variação transações vs ano anterior
  variacaoPrecoM2: number | null;    // % variação preço/m² vs ano anterior
}

// Projeção de Valor Futuro
export interface FutureProjection {
  oneYear: { optimistic: number; pessimistic: number; probable: number };
  twoYears: { optimistic: number; pessimistic: number; probable: number };
  threeYears: { optimistic: number; pessimistic: number; probable: number };
  optimisticRate: number;  // taxa otimista (% a.a.)
  pessimisticRate: number; // taxa pessimista (% a.a.)
  probableRate: number;    // taxa provável (% a.a.)
  confidence: 'alta' | 'media' | 'baixa';
  disclaimer: string;
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
  futureProjection?: FutureProjection;
  // Fonte dos dados
  dataSource: 'logradouro' | 'bairro'; // Indica se usou logradouro específico ou bairro todo
  logradouroUsado: string; // Logradouro usado na busca
  bairroUsado: string; // Bairro usado na busca
  // Dados do ano corrente (fora da janela histórica)
  hasCurrentYearData?: boolean;
  currentYearCount?: number;
  currentYearAvgM2?: number;
}

// Limites MÍNIMOS de outliers por bairro (valores muito abaixo são suspeitos)
const OUTLIER_MIN_LIMITS: Record<string, number> = {
  'BARRA DA TIJUCA': 8000,
  'RECREIO DOS BANDEIRANTES': 6000,
  'LEBLON': 20000,
  'IPANEMA': 18000,
  'LAGOA': 15000,
  'JARDIM BOTANICO': 12000,
  'GAVEA': 12000,
  'COPACABANA': 10000,
  'BOTAFOGO': 10000,
  'FLAMENGO': 8000,
  'LARANJEIRAS': 8000,
  'HUMAITA': 10000,
  'TIJUCA': 6000,
  'DEFAULT': 5000,
};

const getOutlierMinLimit = (bairro: string): number => {
  const normalizedBairro = bairro.toUpperCase();
  return OUTLIER_MIN_LIMITS[normalizedBairro] || OUTLIER_MIN_LIMITS['DEFAULT'];
};

export function useHistoricalTransactionAnalysis(logradouro: string, bairro: string, enabled: boolean = true, ruasInternas?: string[]) {
  const normalizedBairro = (bairro || '').toUpperCase().trim();
  const normalizedLogradouro = (logradouro || '').trim();

  // Normaliza para aumentar taxa de match com abreviações (ex.: "AVN" vs "Avenida") e acentos
  const normalizeForSearch = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/\bAVENIDA\b|\bRUA\b|\bESTRADA\b|\bAV\b|\bAV\.\b|\bAVN\b|\bAVN\.\b/gi, '')
      .replace(/[^A-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  return useQuery<HistoricalAnalysis | null>({
    queryKey: ['historical-analysis-5y', normalizedLogradouro.toUpperCase(), normalizedBairro, ruasInternas?.join(',') || ''],
    queryFn: async () => {
      if (!normalizedLogradouro || !normalizedBairro) return null;

      // CACHE: Verificar se há dados em cache válidos
      const cachedData = getCachedAnalysis(normalizedBairro, normalizedLogradouro, ruasInternas);
      if (cachedData) {
        return cachedData;
      }

      const outlierLimit = getOutlierLimit(normalizedBairro);
      const outlierMinLimit = getOutlierMinLimit(normalizedBairro);

      // Buscar transações dos últimos 5 anos FECHADOS (ex.: 2021-2025)
      // Evita “ano corrente” parcial (ex.: janeiro) distorcer tendência/projeção.
      const currentYear = new Date().getFullYear();
      const endYear = currentYear - 1;
      const startYear = endYear - 4;
      const startDate = `${startYear}-01-01`;
      const endDate = `${endYear}-12-31`;

      // Primeiro buscar por logradouro específico (com fallback de normalização)
      // IMPORTANTE: Usar total_transacoes para contagem correta (cada registro pode representar múltiplas transações)
      // IMPORTANTE (contagem): NÃO filtrar por valor_m2 aqui, pois muitos registros
      // podem não ter valor_m2 calculado. A filtragem por outliers é aplicada apenas
      // para estatísticas de preço.
      let transactions: { data_transacao: string; valor_m2: number | null; total_transacoes: number | null }[] | null = null;
      let error: unknown = null;

      // Se temos ruas internas do condomínio, buscar em todas elas
      // IMPORTANTE: Normalizar acentos das ruas internas para match com banco (ex: "Nélson" → "Nelson")
      if (ruasInternas && ruasInternas.length > 0) {
        const normalizedRuas = ruasInternas.map(rua => 
          rua.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        );
        const orFilter = normalizedRuas.map(rua => `logradouro.ilike.%${rua}%`).join(',');
        // Para condomínios, incluir ano corrente na busca (dados parciais são valiosos)
        const condoEndDate = `${currentYear}-12-31`;
        const { data, error: e } = await supabase
          .from('itbi_transactions')
          .select('data_transacao, valor_m2, total_transacoes')
          .or(orFilter)
          .ilike('bairro', normalizedBairro)
          .eq('uso', 'Residencial')
          .gte('data_transacao', startDate)
          .lte('data_transacao', condoEndDate)
          .order('data_transacao', { ascending: true });

        if (e) throw e;
        transactions = data || [];
      } else {
        // Busca padrão por logradouro com fallback de normalização
        const searchCandidates = Array.from(
          new Set([
            normalizedLogradouro,
            normalizeForSearch(normalizedLogradouro),
            normalizedLogradouro.replace(/^\s*(Avenida|Av\.?|AVN\.?|Rua|Estrada)\s+/i, ''),
          ])
        ).filter(Boolean);

        for (const candidate of searchCandidates) {
          const { data, error: e } = await supabase
            .from('itbi_transactions')
            .select('data_transacao, valor_m2, total_transacoes')
            .ilike('logradouro', `%${candidate}%`)
            .ilike('bairro', normalizedBairro)
            .eq('uso', 'Residencial')
            .gte('data_transacao', startDate)
            .lte('data_transacao', endDate)
            .order('data_transacao', { ascending: true });

          if (e) {
            error = e;
            break;
          }

          if (data && data.length > 0) {
            transactions = data;
            break;
          }
        }
      }

      // Build searchCandidates for current-year check (used later)
      const searchCandidates = Array.from(
        new Set([
          normalizedLogradouro,
          normalizeForSearch(normalizedLogradouro),
          normalizedLogradouro.replace(/^\s*(Avenida|Av\.?|AVN\.?|Rua|Estrada)\s+/i, ''),
        ])
      ).filter(Boolean);

      if (error) throw error;

      if (!transactions) {
        // Se não achou nada para o logradouro, segue com a lógica de fallback para o bairro
        transactions = [];
      }

      // Rastrear fonte dos dados e quantidade encontrada
      let dataSource: 'logradouro' | 'bairro' = 'logradouro';
      const logradouroTransactionCount = transactions?.length || 0;

      // Se poucos dados do logradouro, buscar do bairro todo
      // Para condomínios com ruas internas, threshold menor (3) pois dados são mais específicos
      const fallbackThreshold = (ruasInternas && ruasInternas.length > 0) ? 3 : 15;
      if (!transactions || transactions.length < fallbackThreshold) {
        const { data: bairroTransactions, error: bairroError } = await supabase
          .from('itbi_transactions')
          .select('data_transacao, valor_m2, total_transacoes')
          .ilike('bairro', normalizedBairro)
          .eq('uso', 'Residencial')
          .gte('data_transacao', startDate)
          .lte('data_transacao', endDate)
          .order('data_transacao', { ascending: true });

        if (bairroError) throw bairroError;
        transactions = bairroTransactions;
        dataSource = 'bairro'; // Mudou para bairro
      }

      if (!transactions || transactions.length === 0) return null;

      // Agrupar por ano (de startYear até endYear, incluindo ano corrente se condomínio)
      const effectiveEndYear = (ruasInternas && ruasInternas.length > 0) ? currentYear : endYear;
      const yearlyMap: Record<number, { valores: number[]; totalTransacoes: number }> = {};

      for (let year = startYear; year <= effectiveEndYear; year++) {
        yearlyMap[year] = { valores: [], totalTransacoes: 0 };
      }

      transactions.forEach((t) => {
        const year = new Date(t.data_transacao).getFullYear();
        if (!yearlyMap[year]) return;

        // Contagem: sempre soma total_transacoes (mesmo se valor_m2 estiver ausente)
        yearlyMap[year].totalTransacoes += (t.total_transacoes || 1);

        // Preço: só entra nas estatísticas se houver valor_m2 e estiver dentro dos limites
        const v = t.valor_m2;
        if (typeof v === 'number' && v >= outlierMinLimit && v <= outlierLimit) {
          yearlyMap[year].valores.push(v);
        }
      });
      
      // Calcular estatísticas por ano com remoção de outliers usando IQR
      const yearlyDataRaw = Object.entries(yearlyMap)
        .map(([ano, data]) => {
          let valores = data.valores;
          
          // Aplicar IQR (Interquartile Range) para remover outliers extremos
          if (valores.length >= 4) {
            valores.sort((a, b) => a - b);
            const q1 = valores[Math.floor(valores.length * 0.25)];
            const q3 = valores[Math.floor(valores.length * 0.75)];
            const iqr = q3 - q1;
            const lowerBound = q1 - 1.5 * iqr;
            const upperBound = q3 + 1.5 * iqr;
            valores = valores.filter(v => v >= lowerBound && v <= upperBound);
          }
          
          const valorMedioM2 = valores.length > 0 
            ? valores.reduce((a, b) => a + b, 0) / valores.length 
            : 0;
          const valorMinM2 = valores.length > 0 ? Math.min(...valores) : 0;
          const valorMaxM2 = valores.length > 0 ? Math.max(...valores) : 0;
          
          return {
            ano: parseInt(ano),
            transacoes: data.totalTransacoes,
            valorMedioM2: Math.round(valorMedioM2),
            valorMinM2: Math.round(valorMinM2),
            valorMaxM2: Math.round(valorMaxM2),
          };
        })
        .filter((y) => y.ano <= effectiveEndYear)
        .sort((a, b) => a.ano - b.ano);

      // Calcular variações ano a ano
      const yearlyData: YearlyData[] = yearlyDataRaw.map((y, index) => {
        const prevYear = index > 0 ? yearlyDataRaw[index - 1] : null;
        
        // Variação de transações
        let variacaoTransacoes: number | null = null;
        if (prevYear && prevYear.transacoes > 0) {
          variacaoTransacoes = ((y.transacoes - prevYear.transacoes) / prevYear.transacoes) * 100;
        }
        
        // Variação de preço/m²
        let variacaoPrecoM2: number | null = null;
        if (prevYear && prevYear.valorMedioM2 > 0 && y.valorMedioM2 > 0) {
          variacaoPrecoM2 = ((y.valorMedioM2 - prevYear.valorMedioM2) / prevYear.valorMedioM2) * 100;
        }
        
        return {
          ...y,
          variacaoTransacoes: variacaoTransacoes !== null ? Math.round(variacaoTransacoes * 10) / 10 : null,
          variacaoPrecoM2: variacaoPrecoM2 !== null ? Math.round(variacaoPrecoM2 * 10) / 10 : null,
        };
      });
      
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
          dataSource,
          logradouroUsado: normalizedLogradouro,
          bairroUsado: normalizedBairro,
        };
      }
      
      // Calcular crescimento médio de transações
      const firstYear = yearsWithData[0];
      const lastYear = yearsWithData[yearsWithData.length - 1];
      const yearDiff = lastYear.ano - firstYear.ano;

      // Total de transações e média por ano
      const totalTransactions = yearsWithData.reduce((sum, y) => sum + y.transacoes, 0);
      const avgTransactionsPerYear = totalTransactions / yearsWithData.length;

      // Crescimento de transações: só calcula se base >= 3 (evita distorções 1→3 = +200%)
      let transactionGrowth = 0;
      let transactionGrowthReliable = false;
      if (yearDiff > 0 && firstYear.transacoes >= 3) {
        const totalGrowth = ((lastYear.transacoes - firstYear.transacoes) / firstYear.transacoes) * 100;
        transactionGrowth = totalGrowth / yearDiff;
        transactionGrowthReliable = true;
      } else if (yearDiff > 0 && firstYear.transacoes > 0) {
        // Calcula mas marca como não confiável (base muito pequena)
        const totalGrowth = ((lastYear.transacoes - firstYear.transacoes) / firstYear.transacoes) * 100;
        transactionGrowth = totalGrowth / yearDiff;
        transactionGrowthReliable = false;
      }

      // Calcular crescimento médio de preços
      let priceGrowth = 0;
      if (yearDiff > 0 && firstYear.valorMedioM2 > 0) {
        const totalPriceGrowth = ((lastYear.valorMedioM2 - firstYear.valorMedioM2) / firstYear.valorMedioM2) * 100;
        priceGrowth = totalPriceGrowth / yearDiff;
      }

      // Determinar tendência de transações
      // CORREÇÃO: Só classifica como "crescente" se volume absoluto também for razoável
      // ou se o crescimento for confiável (base >= 3)
      let transactionTrend: 'crescente' | 'estavel' | 'decrescente' = 'estavel';
      if (transactionGrowthReliable) {
        transactionTrend = 
          transactionGrowth > 10 ? 'crescente' :
          transactionGrowth < -10 ? 'decrescente' : 'estavel';
      } else if (avgTransactionsPerYear >= 10) {
        // Se média é boa, podemos confiar mais na tendência
        transactionTrend = 
          transactionGrowth > 15 ? 'crescente' :
          transactionGrowth < -15 ? 'decrescente' : 'estavel';
      }
      // Se base pequena E média baixa, mantém "estável" (não confiável)

      // Determinar tendência de preços
      const priceTrend: 'alta' | 'estavel' | 'baixa' =
        priceGrowth > 3 ? 'alta' :
        priceGrowth < -3 ? 'baixa' : 'estavel';

      // Calcular score de liquidez (baseado apenas em volume absoluto)
      // Score: média de transações/ano * 3 (escala ajustada)
      // 20+ trans/ano = 60+ score, 30+ trans/ano = 90+ score
      let liquidityScore = Math.min(100, avgTransactionsPerYear * 3);
      // Bônus/penalidade por tendência SÓ se confiável
      if (transactionGrowthReliable) {
        if (transactionTrend === 'crescente') liquidityScore += 10;
        if (transactionTrend === 'decrescente') liquidityScore -= 10;
      }
      liquidityScore = Math.max(0, Math.min(100, liquidityScore));

      const liquidityLevel: 'alta' | 'media' | 'baixa' =
        liquidityScore >= 70 ? 'alta' :
        liquidityScore >= 40 ? 'media' : 'baixa';
      
      // Gerar diagnóstico (passando flag de confiabilidade)
      const diagnostico = generateDiagnostico(
        transactionTrend,
        priceTrend,
        liquidityLevel,
        transactionGrowth,
        priceGrowth,
        totalTransactions,
        transactionGrowthReliable,
        avgTransactionsPerYear
      );
      
      // Gerar alertas
      const alertas = generateAlertas(
        transactionTrend,
        priceTrend,
        liquidityLevel,
        yearsWithData
      );
      
      // Calcular projeção de valor futuro
      const futureProjection = calculateFutureProjection(
        priceGrowth,
        liquidityScore,
        yearsWithData.length
      );
      
      // Consulta leve: verificar se há transações do logradouro no ano corrente
      let hasCurrentYearData = false;
      let currentYearCount = 0;
      let currentYearAvgM2 = 0;

      if (dataSource === 'bairro' && logradouroTransactionCount < fallbackThreshold) {
        const currentYearStart = `${currentYear}-01-01`;
        const currentYearEnd = `${currentYear}-12-31`;

        for (const candidate of searchCandidates) {
          const { data: cyData } = await supabase
            .from('itbi_transactions')
            .select('valor_m2, total_transacoes')
            .ilike('logradouro', `%${candidate}%`)
            .ilike('bairro', normalizedBairro)
            .eq('uso', 'Residencial')
            .gte('data_transacao', currentYearStart)
            .lte('data_transacao', currentYearEnd);

          if (cyData && cyData.length > 0) {
            hasCurrentYearData = true;
            currentYearCount = cyData.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);
            const validValues = cyData
              .filter(r => typeof r.valor_m2 === 'number' && r.valor_m2 >= outlierMinLimit && r.valor_m2 <= outlierLimit)
              .map(r => r.valor_m2 as number);
            if (validValues.length > 0) {
              currentYearAvgM2 = Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length);
            }
            break;
          }
        }
      }

      const result: HistoricalAnalysis = {
        yearlyData,
        transactionTrend,
        priceTrend,
        liquidityScore: Math.round(liquidityScore),
        liquidityLevel,
        transactionGrowth: Math.round(transactionGrowth * 10) / 10,
        priceGrowth: Math.round(priceGrowth * 10) / 10,
        diagnostico,
        alertas,
        futureProjection,
        dataSource,
        logradouroUsado: normalizedLogradouro,
        bairroUsado: normalizedBairro,
        hasCurrentYearData,
        currentYearCount,
        currentYearAvgM2,
      };
      
      // CACHE: Salvar resultado no cache persistente
      setCachedAnalysis(normalizedBairro, normalizedLogradouro, result);

      return result;
    },
    enabled: enabled && !!logradouro && !!bairro,
    staleTime: 30 * 60 * 1000, // 30 minutos (aumentado pois temos cache persistente)
    gcTime: 60 * 60 * 1000, // 1 hora de garbage collection
  });
}

// Calcula projeção de valor futuro baseada na tendência histórica
function calculateFutureProjection(
  priceGrowth: number,
  liquidityScore: number,
  yearsWithData: number
): FutureProjection {
  // Taxa provável: usa a tendência histórica
  const probableRate = priceGrowth;
  
  // Taxa otimista: adiciona 3% ao cenário provável
  const optimisticRate = priceGrowth + 3;
  
  // Taxa pessimista: subtrai 3% ou usa metade (o que for menor)
  const pessimisticRate = Math.min(priceGrowth - 3, priceGrowth * 0.5);
  
  // Função para calcular valor projetado
  const projectValue = (rate: number, years: number): number => {
    // Retorna o multiplicador para aplicar sobre o valor atual
    return Math.pow(1 + rate / 100, years);
  };
  
  // Projeções para 1, 2 e 3 anos (multiplicadores)
  const oneYear = {
    optimistic: projectValue(optimisticRate, 1),
    pessimistic: projectValue(pessimisticRate, 1),
    probable: projectValue(probableRate, 1),
  };
  
  const twoYears = {
    optimistic: projectValue(optimisticRate, 2),
    pessimistic: projectValue(pessimisticRate, 2),
    probable: projectValue(probableRate, 2),
  };
  
  const threeYears = {
    optimistic: projectValue(optimisticRate, 3),
    pessimistic: projectValue(pessimisticRate, 3),
    probable: projectValue(probableRate, 3),
  };
  
  // Confiança da projeção baseada em liquidez e quantidade de dados
  let confidence: 'alta' | 'media' | 'baixa';
  if (liquidityScore >= 70 && yearsWithData >= 4) {
    confidence = 'alta';
  } else if (liquidityScore >= 40 && yearsWithData >= 3) {
    confidence = 'media';
  } else {
    confidence = 'baixa';
  }
  
  // Disclaimer
  const disclaimer = 
    'Projeção baseada na tendência histórica de 5 anos. ' +
    'Valores futuros são estimativas e podem variar conforme condições de mercado, ' +
    'políticas econômicas e fatores locais. Esta projeção não constitui garantia de valorização.';
  
  return {
    oneYear,
    twoYears,
    threeYears,
    optimisticRate: Math.round(optimisticRate * 10) / 10,
    pessimisticRate: Math.round(pessimisticRate * 10) / 10,
    probableRate: Math.round(probableRate * 10) / 10,
    confidence,
    disclaimer,
  };
}

function generateDiagnostico(
  transactionTrend: string,
  priceTrend: string,
  liquidityLevel: string,
  transactionGrowth: number,
  priceGrowth: number,
  totalTransactions: number,
  transactionGrowthReliable: boolean,
  avgTransactionsPerYear: number
): string {
  const parts: string[] = [];

  // Liquidez (volume absoluto)
  if (liquidityLevel === 'alta') {
    parts.push(`Região com alta liquidez (${totalTransactions} transações em 5 anos, média ${avgTransactionsPerYear.toFixed(0)}/ano).`);
  } else if (liquidityLevel === 'media') {
    parts.push(`Região com liquidez moderada (${totalTransactions} transações em 5 anos, média ${avgTransactionsPerYear.toFixed(0)}/ano).`);
  } else {
    parts.push(`Região com baixa liquidez (${totalTransactions} transações em 5 anos, média ${avgTransactionsPerYear.toFixed(0)}/ano), o que pode exigir maior tempo de comercialização.`);
  }

  // Tendência de transações (só exibe % se confiável)
  if (transactionTrend === 'crescente' && transactionGrowthReliable) {
    parts.push(`Volume de negócios em crescimento (${transactionGrowth > 0 ? '+' : ''}${transactionGrowth.toFixed(0)}% a.a.).`);
  } else if (transactionTrend === 'decrescente' && transactionGrowthReliable) {
    parts.push(`Volume de negócios em queda (${transactionGrowth.toFixed(0)}% a.a.).`);
  } else if (!transactionGrowthReliable && totalTransactions < 50) {
    parts.push(`Poucos dados para determinar tendência de volume com precisão.`);
  } else {
    parts.push(`Volume de transações estável no período.`);
  }

  // Tendência de preços
  if (priceTrend === 'alta') {
    parts.push(`Preços em tendência de alta (+${priceGrowth.toFixed(1)}% a.a.).`);
  } else if (priceTrend === 'baixa') {
    parts.push(`Preços em tendência de queda (${priceGrowth.toFixed(1)}% a.a.).`);
  } else {
    parts.push(`Preços estáveis no período analisado.`);
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
  
  if (priceTrend === 'alta' && transactionTrend === 'crescente' && liquidityLevel !== 'baixa') {
    alertas.push('✅ Mercado aquecido - momento favorável para comercialização');
  }

  // Verificar se último ano tem poucos dados
  const lastYear = yearsWithData[yearsWithData.length - 1];
  const endYear = new Date().getFullYear() - 1; // Usamos ano fechado
  if (lastYear && lastYear.ano === endYear && lastYear.transacoes < 5) {
    alertas.push('ℹ️ Último ano com poucos dados registrados');
  }
  
  return alertas;
}
