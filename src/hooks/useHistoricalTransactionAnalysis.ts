import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  getCachedAnalysis, 
  setCachedAnalysis 
} from '@/utils/historicalAnalysisCache';
import { buildLogradouroOrConditions, expandLogradouroSearchTerms } from '@/lib/logradouroSearch';

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
  // Ano corrente/incompleto: comparação por período equivalente
  parcial?: boolean;                 // true quando o ano não está fechado
  mesesCobertos?: number;            // meses com dados considerados no ano
  transacoesProjetadas?: number | null; // projeção anualizada (média mensal x 12)
  baseComparacao?: 'ano_completo' | 'periodo_equivalente';
  // Variações alternativas para auditoria
  variacaoPeriodoEquivalente?: number | null; // média mensal / mesmo período do ano anterior
  variacaoAnualizada?: number | null;         // volume anualizado vs ano anterior fechado
  variacaoBruta?: number | null;              // total bruto vs total bruto (pode ser injusto)
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

// Raio padrão de fallback (em metros). O raio de 1 km só é usado quando o de
// 500 m não retorna amostra e, nesse caso, a composição da amostra é exposta.
export const RAIO_FALLBACK_PADRAO_M = 500;
export const RAIO_FALLBACK_AMPLIADO_M = 1000;

export interface AmostraComposicaoItem {
  logradouro: string;
  transacoes: number;
  percentual: number;
  distanciaM: number;
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
  dataSource: 'logradouro' | 'raio_500m' | 'raio_1km' | 'bairro';
  logradouroUsado: string; // Logradouro usado na busca
  bairroUsado: string; // Bairro usado na busca
  // Fallback por raio
  raioMetros?: number;
  amostraComposicao?: AmostraComposicaoItem[];
  amostraLogradouroDominante?: AmostraComposicaoItem;
  // Fallback cross-bairro: quando a rua está cadastrada em outro(s) bairro(s) no ITBI
  crossBairro?: boolean;
  bairrosEncontrados?: string[];
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

// Composição da amostra por logradouro: essencial para o usuário entender que
// uma análise por raio mistura vias diferentes (ex.: uma avenida de orla pode
// dominar o entorno e puxar o preço médio para cima).
function buildAmostraComposicao(
  rows: { logradouro: string | null; total_transacoes: number | null; distancia_m: number | null }[]
): AmostraComposicaoItem[] {
  const mapa = new Map<string, { transacoes: number; distanciaM: number }>();

  rows.forEach((r) => {
    const nome = (r.logradouro || 'Não informado').trim();
    const peso = r.total_transacoes || 1;
    const dist = Math.round(r.distancia_m || 0);
    const atual = mapa.get(nome);
    if (atual) {
      atual.transacoes += peso;
      atual.distanciaM = Math.min(atual.distanciaM, dist);
    } else {
      mapa.set(nome, { transacoes: peso, distanciaM: dist });
    }
  });

  const total = Array.from(mapa.values()).reduce((s, v) => s + v.transacoes, 0) || 1;

  return Array.from(mapa.entries())
    .map(([logradouro, v]) => ({
      logradouro,
      transacoes: v.transacoes,
      percentual: Math.round((v.transacoes / total) * 1000) / 10,
      distanciaM: v.distanciaM,
    }))
    .sort((a, b) => b.transacoes - a.transacoes);
}

export function useHistoricalTransactionAnalysis(logradouro: string, bairro: string, enabled: boolean = true, ruasInternas?: string[]) {
  const normalizedBairro = (bairro || '').toUpperCase().trim();
  const normalizedLogradouro = (logradouro || '').trim();

  return useQuery<HistoricalAnalysis | null>({
    queryKey: ['historical-analysis-5y-v7', normalizedLogradouro.toUpperCase(), normalizedBairro, ruasInternas?.join(',') || ''],
    queryFn: async () => {
      if (!normalizedLogradouro || !normalizedBairro) return null;

      // CACHE: Verificar se há dados em cache válidos
      const cachedData = getCachedAnalysis(normalizedBairro, normalizedLogradouro, ruasInternas);
      if (cachedData) {
        return cachedData;
      }

      const outlierLimit = getOutlierLimit(normalizedBairro);
      const outlierMinLimit = getOutlierMinLimit(normalizedBairro);
      
      // Para condomínios (ruas internas), aceitar valores mais baixos — dados já filtrados por ruas específicas
      const effectiveMinLimit = (ruasInternas && ruasInternas.length > 0) 
        ? Math.min(outlierMinLimit * 0.5, 3000)
        : outlierMinLimit;

      // Buscar transações dos últimos 5 anos FECHADOS (ex.: 2021-2025)
      // Evita “ano corrente” parcial (ex.: janeiro) distorcer tendência/projeção.
      const currentYear = new Date().getFullYear();
      const endYear = currentYear - 1;
      const startYear = endYear - 4;
      const startDate = `${startYear}-01-01`;
      // O ano corrente (parcial) continua sendo exibido: a comparação por período
      // equivalente já garante que ele não distorça as variações.
      const endDate = `${currentYear}-12-31`;

      // Primeiro buscar por logradouro específico (com fallback de normalização)
      // IMPORTANTE: Usar total_transacoes para contagem correta (cada registro pode representar múltiplas transações)
      // IMPORTANTE (contagem): NÃO filtrar por valor_m2 aqui, pois muitos registros
      // podem não ter valor_m2 calculado. A filtragem por outliers é aplicada apenas
      // para estatísticas de preço.
      let transactions: { data_transacao: string; valor_m2: number | null; total_transacoes: number | null; bairro?: string | null }[] | null = null;
      let error: unknown = null;
      let crossBairro = false;
      let bairrosEncontrados: string[] = [];

      // Se temos ruas internas do condomínio, buscar em todas elas
      // IMPORTANTE: Normalizar acentos das ruas internas para match com banco (ex: "Nélson" → "Nelson")
      if (ruasInternas && ruasInternas.length > 0) {
        const normalizedRuas = ruasInternas.map(rua => 
          rua.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        );
        const orFilter = normalizedRuas.map(rua => `logradouro.ilike.%${rua}%`).join(',');
        // Para condomínios, incluir ano corrente na busca (dados parciais são valiosos)
        const condoEndDate = endDate;
        const { data, error: e } = await supabase
          .from('itbi_transactions')
          .select('data_transacao, valor_m2, total_transacoes')
          .or(orFilter)
          .ilike('bairro', normalizedBairro)
          .eq('uso', 'Residencial')
          .gte('data_transacao', startDate)
          .lte('data_transacao', condoEndDate)
           .order('data_transacao', { ascending: true })
           .limit(5000);

        if (e) throw e;
        transactions = data || [];
      } else {
        // Usa a normalização centralizada, incluindo número do imóvel, prefixos,
        // patentes abreviadas e grafias conhecidas da base oficial.
        const streetFilter = buildLogradouroOrConditions([normalizedLogradouro]);
        const { data, error: e } = await supabase
          .from('itbi_transactions')
          .select('data_transacao, valor_m2, total_transacoes, bairro')
          .or(streetFilter)
          .eq('uso', 'Residencial')
          .gte('data_transacao', startDate)
          .lte('data_transacao', endDate)
          .order('data_transacao', { ascending: true })
          .limit(5000);

        if (e) {
          error = e;
        } else if (data && data.length > 0) {
          transactions = data;
          bairrosEncontrados = Array.from(
            new Set(
              data
                .map((r) => (r.bairro || '').toUpperCase().trim())
                .filter((b) => b && b !== normalizedBairro)
            )
          );
          crossBairro = bairrosEncontrados.length > 0;
          if (crossBairro) {
            console.log(
              `[HistoricalAnalysis] União cross-bairro para ${normalizedLogradouro}: ` +
              `também encontrado em ${bairrosEncontrados.join(', ')}`
            );
          }
        }
      }

      const streetFilter = buildLogradouroOrConditions([normalizedLogradouro]);

      if (error) throw error;

      if (!transactions) {
        // Se não achou nada para o logradouro, segue com a lógica de fallback para o bairro
        transactions = [];
      }

      // Rastrear fonte dos dados e quantidade encontrada
      let dataSource: 'logradouro' | 'raio_500m' | 'raio_1km' | 'bairro' = 'logradouro';
      const logradouroTransactionCount = transactions?.length || 0;
      let raioMetros: number | undefined;
      let amostraComposicao: AmostraComposicaoItem[] | undefined;

      // Amostra mínima da rua para sustentar uma série histórica de 5 anos.
      // Abaixo disso a série fica cheia de anos zerados e as variações perdem
      // sentido, então enriquecemos com o entorno (500 m e, se preciso, 1 km).
      const MIN_TRANSACOES_LOGRADOURO = 12;
      const totalTransacoesLogradouro = (transactions || []).reduce(
        (s, t) => s + (t.total_transacoes || 1),
        0
      );
      const amostraInsuficiente =
        !transactions ||
        transactions.length === 0 ||
        totalTransacoesLogradouro < MIN_TRANSACOES_LOGRADOURO;

      if (amostraInsuficiente) {
        // 1) Fallback padrão: entorno de 500 m do logradouro pesquisado.
        //    O bairro inteiro só é usado quando nem o raio ampliado (1 km) retorna amostra.
        const referencia = ruasInternas && ruasInternas.length > 0
          ? ruasInternas[0]
          : normalizedLogradouro;

        // Testa as variantes conhecidas do nome (abreviações e grafias oficiais)
        // até encontrar uma coordenada de referência para o raio.
        let ponto: { lat: number | null; lng: number | null } | null = null;
        const termos = [referencia, ...expandLogradouroSearchTerms(referencia)];
        for (const termo of Array.from(new Set(termos))) {
          const { data: pontoData } = await supabase.rpc('itbi_ponto_logradouro', {
            p_logradouro: termo,
            p_bairro: normalizedBairro,
          });
          const candidato = Array.isArray(pontoData) ? pontoData[0] : pontoData;
          if (candidato?.lat && candidato?.lng) {
            ponto = candidato;
            break;
          }
        }

        if (ponto?.lat && ponto?.lng) {
          for (const raio of [RAIO_FALLBACK_PADRAO_M, RAIO_FALLBACK_AMPLIADO_M]) {
            const { data: raioData, error: raioError } = await supabase.rpc('itbi_transacoes_raio', {
              p_lat: ponto.lat,
              p_lng: ponto.lng,
              p_raio_m: raio,
              p_inicio: startDate,
              p_fim: endDate,
            });

            if (raioError) {
              console.warn('[HistoricalAnalysis] Falha na análise por raio:', raioError.message);
              break;
            }

            const totalRaio = (raioData || []).reduce(
              (s: number, r: { total_transacoes: number | null }) => s + (r.total_transacoes || 1),
              0
            );

            // Só substitui a amostra da rua se o entorno for de fato mais rico.
            if (raioData && raioData.length > 0 && totalRaio > totalTransacoesLogradouro) {
              transactions = raioData.map((r) => ({
                data_transacao: r.data_transacao as string,
                valor_m2: r.valor_m2 !== null ? Number(r.valor_m2) : null,
                total_transacoes: r.total_transacoes ?? 1,
                bairro: r.bairro,
              }));
              raioMetros = raio;
              dataSource = raio === RAIO_FALLBACK_PADRAO_M ? 'raio_500m' : 'raio_1km';
              amostraComposicao = buildAmostraComposicao(raioData);
              break;
            }
          }
        }
      }

      if (!transactions || transactions.length === 0) {
        const { data: bairroTransactions, error: bairroError } = await supabase
          .from('itbi_transactions')
          .select('data_transacao, valor_m2, total_transacoes')
          .ilike('bairro', normalizedBairro)
          .eq('uso', 'Residencial')
          .gte('data_transacao', startDate)
          .lte('data_transacao', endDate)
           .order('data_transacao', { ascending: true })
           .limit(5000);

        if (bairroError) throw bairroError;
        transactions = bairroTransactions;
        dataSource = 'bairro'; // Mudou para bairro
        raioMetros = undefined;
        amostraComposicao = undefined;
      }

      if (!transactions || transactions.length === 0) return null;

      // Agrupar por ano (de startYear até endYear, incluindo ano corrente se condomínio)
      const effectiveEndYear = currentYear;
      const yearlyMap: Record<number, { valores: number[]; totalTransacoes: number; porMes: number[] }> = {};

      for (let year = startYear; year <= effectiveEndYear; year++) {
        yearlyMap[year] = { valores: [], totalTransacoes: 0, porMes: new Array(12).fill(0) };
      }

      transactions.forEach((t) => {
        const dt = new Date(t.data_transacao);
        const year = dt.getFullYear();
        if (!yearlyMap[year]) return;

        const peso = t.total_transacoes || 1;

        // Contagem: sempre soma total_transacoes (mesmo se valor_m2 estiver ausente)
        yearlyMap[year].totalTransacoes += peso;
        yearlyMap[year].porMes[dt.getMonth()] += peso;

        // Preço: só entra nas estatísticas se houver valor_m2 e estiver dentro dos limites
        // Expandir pelo peso para mediana/média ponderada
        const v = t.valor_m2;
        if (typeof v === 'number' && v >= effectiveMinLimit && v <= outlierLimit) {
          for (let i = 0; i < peso; i++) {
            yearlyMap[year].valores.push(v);
          }
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
            porMes: data.porMes,
          };
        })
        .filter((y) => y.ano <= effectiveEndYear)
        .sort((a, b) => a.ano - b.ano);

      // Meses cobertos do ano corrente (base para comparação justa de período)
      // Usa o último mês com dados registrados, evitando penalizar o defasamento do ITBI.
      const anoCorrenteRow = yearlyDataRaw.find((y) => y.ano === currentYear);
      let mesesCorrente = 0;
      if (anoCorrenteRow) {
        for (let m = 11; m >= 0; m--) {
          if (anoCorrenteRow.porMes[m] > 0) { mesesCorrente = m + 1; break; }
        }
      }

      // Calcular variações ano a ano
      const yearlyData: YearlyData[] = yearlyDataRaw.map((y, index) => {
        const prevYear = index > 0 ? yearlyDataRaw[index - 1] : null;

        const parcial = y.ano === currentYear && mesesCorrente > 0 && mesesCorrente < 12;
        const mesesCobertos = parcial ? mesesCorrente : 12;

        // Variação de transações
        // Ano parcial: compara com o MESMO período (Jan..N) do ano anterior,
        // evitando falsa queda ao confrontar ano incompleto com ano fechado.
        let variacaoTransacoes: number | null = null;
        let baseComparacao: 'ano_completo' | 'periodo_equivalente' = 'ano_completo';
        let variacaoPeriodoEquivalente: number | null = null;
        let variacaoAnualizada: number | null = null;
        let variacaoBruta: number | null = null;

        const projetadas = parcial ? (y.transacoes / mesesCobertos) * 12 : y.transacoes;

        if (prevYear) {
          const prevMesmoPeriodo = prevYear.porMes
            .slice(0, mesesCobertos)
            .reduce((a: number, b: number) => a + b, 0);
          if (prevMesmoPeriodo > 0) {
            variacaoPeriodoEquivalente = ((y.transacoes - prevMesmoPeriodo) / prevMesmoPeriodo) * 100;
          }
          if (prevYear.transacoes > 0) {
            variacaoAnualizada = ((projetadas - prevYear.transacoes) / prevYear.transacoes) * 100;
            variacaoBruta = ((y.transacoes - prevYear.transacoes) / prevYear.transacoes) * 100;
          }
        }

        if (prevYear && parcial) {
          const prevMesmoPeriodo = prevYear.porMes
            .slice(0, mesesCobertos)
            .reduce((a: number, b: number) => a + b, 0);
          baseComparacao = 'periodo_equivalente';
          if (prevMesmoPeriodo > 0) {
            variacaoTransacoes = ((y.transacoes - prevMesmoPeriodo) / prevMesmoPeriodo) * 100;
          }
        } else if (prevYear && prevYear.transacoes > 0) {
          variacaoTransacoes = ((y.transacoes - prevYear.transacoes) / prevYear.transacoes) * 100;
        }

        // Variação de preço/m²
        let variacaoPrecoM2: number | null = null;
        if (prevYear && prevYear.valorMedioM2 > 0 && y.valorMedioM2 > 0) {
          variacaoPrecoM2 = ((y.valorMedioM2 - prevYear.valorMedioM2) / prevYear.valorMedioM2) * 100;
        }

        const { porMes: _porMes, ...rest } = y;

        return {
          ...rest,
          parcial,
          mesesCobertos,
          transacoesProjetadas: parcial
            ? Math.round((y.transacoes / mesesCobertos) * 12)
            : null,
          baseComparacao,
          variacaoPeriodoEquivalente: variacaoPeriodoEquivalente !== null ? Math.round(variacaoPeriodoEquivalente * 10) / 10 : null,
          variacaoAnualizada: variacaoAnualizada !== null ? Math.round(variacaoAnualizada * 10) / 10 : null,
          variacaoBruta: variacaoBruta !== null ? Math.round(variacaoBruta * 10) / 10 : null,
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
          raioMetros,
          amostraComposicao,
          logradouroUsado: normalizedLogradouro,
          bairroUsado: normalizedBairro,
        };
      }
      
      // Calcular crescimento médio de transações
      const firstYear = yearsWithData[0];
      const lastYear = yearsWithData[yearsWithData.length - 1];
      const yearDiff = lastYear.ano - firstYear.ano;
      // Ano parcial entra no crescimento com volume anualizado (média mensal x 12)
      const lastYearTransacoes = lastYear.parcial && lastYear.transacoesProjetadas
        ? lastYear.transacoesProjetadas
        : lastYear.transacoes;

      // Total de transações e média por ano
      const totalTransactions = yearsWithData.reduce((sum, y) => sum + y.transacoes, 0);
      const avgTransactionsPerYear = totalTransactions / yearsWithData.length;

      // Crescimento de transações: só calcula se base >= 3 (evita distorções 1→3 = +200%)
      let transactionGrowth = 0;
      let transactionGrowthReliable = false;
      if (yearDiff > 0 && firstYear.transacoes >= 3) {
        const totalGrowth = ((lastYearTransacoes - firstYear.transacoes) / firstYear.transacoes) * 100;
        transactionGrowth = totalGrowth / yearDiff;
        transactionGrowthReliable = true;
      } else if (yearDiff > 0 && firstYear.transacoes > 0) {
        // Calcula mas marca como não confiável (base muito pequena)
        const totalGrowth = ((lastYearTransacoes - firstYear.transacoes) / firstYear.transacoes) * 100;
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

      if (dataSource !== 'logradouro' && logradouroTransactionCount === 0) {
        const currentYearStart = `${currentYear}-01-01`;
        const currentYearEnd = `${currentYear}-12-31`;

        const { data: cyData } = await supabase
          .from('itbi_transactions')
          .select('valor_m2, total_transacoes')
          .or(streetFilter)
          .ilike('bairro', normalizedBairro)
          .eq('uso', 'Residencial')
          .gte('data_transacao', currentYearStart)
          .lte('data_transacao', currentYearEnd)
          .limit(2000);

        if (cyData && cyData.length > 0) {
          hasCurrentYearData = true;
          currentYearCount = cyData.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);
          const validValues = cyData
            .filter(r => typeof r.valor_m2 === 'number' && r.valor_m2 >= outlierMinLimit && r.valor_m2 <= outlierLimit)
            .map(r => r.valor_m2 as number);
          if (validValues.length > 0) {
            currentYearAvgM2 = Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length);
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
        alertas: (() => {
          const base = [...alertas];
          if (dataSource === 'raio_500m') {
            base.unshift('📍 Amostra do entorno (500 m)');
          }
          if (dataSource === 'raio_1km' && amostraComposicao?.length) {
            const dominante = amostraComposicao[0];
            base.unshift(
              `⚠️ Amostra ampliada para 1 km: ${dominante.percentual}% das transações vêm de ${dominante.logradouro}`
            );
          }
          return base;
        })(),
        futureProjection,
        dataSource,
        raioMetros,
        amostraComposicao,
        logradouroUsado: normalizedLogradouro,
        bairroUsado: normalizedBairro,
        crossBairro,
        bairrosEncontrados,
        hasCurrentYearData,
        currentYearCount,
        currentYearAvgM2,
      };

      const alertasCrossBairro = crossBairro
          ? [
              `ℹ️ Esta rua possui transações registradas no ITBI sob ${
                bairrosEncontrados.length === 1
                  ? `o bairro ${bairrosEncontrados[0]}`
                  : `os bairros ${bairrosEncontrados.join(', ')}`
              } (limite entre bairros). Os dados foram consolidados para refletir o histórico completo da via.`,
              ...result.alertas,
            ]
        : result.alertas;
      result.alertas = alertasCrossBairro;

      // SALVAGUARDA: se houver anos zerados no meio de uma série com volume,
      // não cachear — força refetch e loga aviso para investigação.
      const totalAcrossYears = yearlyData.reduce((s, y) => s + y.transacoes, 0);
      const zeroedRecentYears = yearlyData.filter(
        (y) => y.ano >= currentYear - 3 && y.transacoes === 0
      ).length;
      const inconsistent = totalAcrossYears > 200 && zeroedRecentYears >= 2;
      if (inconsistent) {
        console.warn(
          `[HistoricalAnalysis] Inconsistência detectada (${normalizedLogradouro}/${normalizedBairro}): ` +
          `${zeroedRecentYears} anos recentes zerados com volume total de ${totalAcrossYears}. ` +
          `Resultado NÃO será cacheado.`
        );
      } else {
        // CACHE: Salvar resultado no cache persistente
        setCachedAnalysis(normalizedBairro, normalizedLogradouro, result, ruasInternas);
      }

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
