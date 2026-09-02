// Estatística de mercado ITBI para o motor de avaliação.
//
// Funções puras, sem React e sem Supabase, para que possam ser testadas com
// amostras fixas (src/utils/__tests__/itbiMarketStats.test.ts) e reutilizadas
// por outros consumidores (site público, parecer, painel) na Fase 2.
//
// Cada linha de `itbi_transactions` é o agregado mensal da Prefeitura por
// logradouro × mês × uso × tipologia: `valor_m2` é a razão entre a média do
// valor e a média da área do grupo, e `total_transacoes` é o número de
// escrituras do grupo. Toda estatística abaixo pondera por `total_transacoes`.

import type { ITBIData, ITBIMarketMeta } from "../types/valuation";

export const ENGINE_VERSION = 2;

/** Anos fechados considerados na janela padrão (CONTEXT.md §5.1). */
export const WINDOW_YEARS = 5;
/** Abaixo destes mínimos nos anos fechados, o ano corrente entra na amostra. */
export const MIN_ROWS_CLOSED_WINDOW = 30;
export const MIN_TX_CLOSED_WINDOW = 100;
/** Abaixo deste número de linhas, o filtro de tipologia é relaxado. */
export const MIN_ROWS_FOR_TIPOLOGIA = 8;
/** Limite de linhas por consulta (CONTEXT.md §6). */
export const MAX_ROWS = 5000;

export type OutlierMethod = "iqr" | "percentile";

export interface MarketRow {
  valor_m2: number | null;
  valor_transacao: number | null;
  total_transacoes: number | null;
  data_transacao: string;
  bairro?: string | null;
  tipologia?: string | null;
}

export interface MarketWindow {
  /** Primeiro dia do primeiro ano fechado da janela (YYYY-MM-DD). */
  start: string;
  /** Último dia do último ano fechado (YYYY-MM-DD). */
  closedEnd: string;
  /** Hoje (YYYY-MM-DD): limite superior quando o ano corrente é incluído. */
  end: string;
  currentYear: number;
}

const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10);

export const buildMarketWindow = (today: Date = new Date()): MarketWindow => {
  const currentYear = today.getFullYear();
  const endYear = currentYear - 1;
  const startYear = endYear - (WINDOW_YEARS - 1);
  return {
    start: `${startYear}-01-01`,
    closedEnd: `${endYear}-12-31`,
    end: toIsoDate(today),
    currentYear,
  };
};

/**
 * Mapeia o tipo de imóvel escolhido no Step 0 para a tipologia gravada pelo
 * importador (`classificarTipologia` em sync-itbi-prefeitura): a Prefeitura
 * agrega coberturas junto com apartamentos.
 */
export const mapTipoImovelToTipologia = (tipoImovel: string | null | undefined): "Casa" | "Apartamento" | null => {
  const t = (tipoImovel || "").toLowerCase();
  if (!t) return null;
  if (t.includes("casa")) return "Casa";
  if (t.includes("apartamento") || t.includes("cobertura") || t.includes("flat")) return "Apartamento";
  return null;
};

export interface WindowSelection {
  rows: MarketRow[];
  anoCorrenteIncluido: boolean;
  janelaInicio: string;
  janelaFim: string;
}

/**
 * Aplica a regra de janela: usa só anos fechados quando a amostra é
 * suficiente; caso contrário, inclui o ano corrente (expansão explícita).
 */
export const selectWindowRows = (rows: MarketRow[], window: MarketWindow): WindowSelection => {
  const closed = rows.filter((r) => r.data_transacao <= window.closedEnd);
  const closedTx = sumTransacoes(closed);
  const sufficient = closed.length >= MIN_ROWS_CLOSED_WINDOW && closedTx >= MIN_TX_CLOSED_WINDOW;
  if (sufficient || closed.length === rows.length) {
    return { rows: closed, anoCorrenteIncluido: false, janelaInicio: window.start, janelaFim: window.closedEnd };
  }
  return { rows, anoCorrenteIncluido: true, janelaInicio: window.start, janelaFim: window.end };
};

export const sumTransacoes = (rows: MarketRow[]): number =>
  rows.reduce((sum, r) => sum + Math.max(1, r.total_transacoes || 1), 0);

/** Quantil simples por posição (mesma convenção usada historicamente no motor). */
const positionalQuantile = (sorted: number[], p: number): number =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)))];

const median = (sorted: number[]): number => {
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Cercas de Tukey (1,5 × IQR) sobre os valores expandidos por peso, com a
 * banda mínima de segurança de 20% da mediana quando o IQR colapsa
 * (CONTEXT.md §5.1). Precisa de pelo menos 4 valores.
 */
export const computeIQRBounds = (values: number[]): { lower: number; upper: number } | null => {
  if (values.length < 4) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = positionalQuantile(sorted, 0.25);
  const q3 = positionalQuantile(sorted, 0.75);
  const iqr = q3 - q1;
  const med = sorted[Math.floor(sorted.length / 2)];
  const effectiveIQR = Math.max(iqr, med * 0.2);
  return { lower: q1 - 1.5 * effectiveIQR, upper: q3 + 1.5 * effectiveIQR };
};

export interface CalculateOptions {
  method: OutlierMethod;
  meta: Omit<
    ITBIMarketMeta,
    "engine_version" | "outlier_method" | "linhas_agregadas" | "linhas_descartadas" | "escrituras_validas" | "calculado_em"
  >;
  now?: Date;
}

/**
 * Calcula mínimo, mediana e máximo de R$/m² ponderados por `total_transacoes`,
 * com corte de outliers pelo método configurado, e devolve os metadados que
 * tornam o cálculo reprodutível.
 */
export const calculateITBIData = (rows: MarketRow[], options: CalculateOptions): ITBIData | null => {
  if (!rows || rows.length === 0) return null;

  const valid = rows.filter((r) => Number.isFinite(Number(r.valor_m2)));
  if (valid.length === 0) return null;

  const weightOf = (r: MarketRow) => Math.max(1, r.total_transacoes || 1);
  const expand = (list: MarketRow[]): number[] => {
    const out: number[] = [];
    for (const r of list) {
      const v = Number(r.valor_m2);
      const w = weightOf(r);
      for (let i = 0; i < w; i++) out.push(v);
    }
    return out.sort((a, b) => a - b);
  };

  const allValues = expand(valid);
  const totalRealTransactions = allValues.length;

  let kept = valid;
  let minValue: number;
  let maxValue: number;
  let medValue: number;

  if (allValues.length >= 4 && options.method === "percentile") {
    minValue = positionalQuantile(allValues, 0.1);
    maxValue = positionalQuantile(allValues, 0.9);
    medValue = median(allValues);
  } else if (allValues.length >= 4) {
    const bounds = computeIQRBounds(allValues)!;
    const filtered = valid.filter((r) => {
      const v = Number(r.valor_m2);
      return v >= bounds.lower && v <= bounds.upper;
    });
    const filteredValues = expand(filtered);
    if (filteredValues.length >= 3) {
      kept = filtered;
      minValue = filteredValues[0];
      maxValue = filteredValues[filteredValues.length - 1];
      medValue = median(filteredValues);
    } else {
      minValue = allValues[0];
      maxValue = allValues[allValues.length - 1];
      medValue = median(allValues);
    }
  } else {
    minValue = allValues[0];
    maxValue = allValues[allValues.length - 1];
    medValue = median(allValues);
  }

  // Média ponderada do valor de transação (todas as linhas válidas)
  let somaValorPonderado = 0;
  let somaPesos = 0;
  for (const r of valid) {
    const peso = weightOf(r);
    somaValorPonderado += (Number(r.valor_transacao) || 0) * peso;
    somaPesos += peso;
  }
  const avgValorTransacao = somaPesos > 0 ? somaValorPonderado / somaPesos : 0;

  const meta: ITBIMarketMeta = {
    ...options.meta,
    engine_version: ENGINE_VERSION,
    outlier_method: allValues.length >= 4 ? options.method : "none",
    linhas_agregadas: valid.length,
    linhas_descartadas: valid.length - kept.length,
    escrituras_validas: sumTransacoes(kept),
    calculado_em: (options.now ?? new Date()).toISOString(),
  };

  return {
    min_m2: Math.round(minValue),
    med_m2: Math.round(medValue),
    max_m2: Math.round(maxValue),
    transaction_count: totalRealTransactions,
    avg_valor_transacao: Math.round(avgValorTransacao),
    meta,
  };
};

/** Bairros distintos presentes na amostra, normalizados. */
export const collectBairros = (rows: MarketRow[]): string[] =>
  Array.from(new Set(rows.map((r) => (r.bairro || "").toUpperCase().trim()).filter(Boolean))).sort();
