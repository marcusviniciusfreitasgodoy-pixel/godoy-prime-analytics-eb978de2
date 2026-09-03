// Estatística de mercado ITBI. FONTE ÚNICA para o motor de avaliação
// (src/utils/itbiMarketStats.ts reexporta este arquivo), para o site público
// (public-itbi-stats) e para o parecer (parecer-nucleo). Sem dependências:
// precisa rodar em Deno e no navegador. Coberto por
// src/utils/__tests__/itbiMarketStats.test.ts.
//
// Cada linha de `itbi_transactions` é o agregado mensal da Prefeitura por
// logradouro × mês × uso × tipologia: `valor_m2` é a razão entre a média do
// valor e a média da área do grupo, e `total_transacoes` é o número de
// escrituras do grupo. Toda estatística abaixo pondera por `total_transacoes`
// usando quantis ponderados (equivalentes a expandir cada linha pelo peso).

export const ENGINE_VERSION = 3;

/** Anos fechados considerados na janela padrão (CONTEXT.md §5.1). */
export const WINDOW_YEARS = 5;
/** Abaixo destes mínimos nos anos fechados, o ano corrente entra na amostra. */
export const MIN_ROWS_CLOSED_WINDOW = 30;
export const MIN_TX_CLOSED_WINDOW = 100;
/** Abaixo deste número de linhas, o filtro de tipologia é relaxado. */
export const MIN_ROWS_FOR_TIPOLOGIA = 8;
/** Limite de linhas por consulta (CONTEXT.md §6). */
export const MAX_ROWS = 5000;
/** Mínimo de valores (escrituras) para aplicar cercas de Tukey. */
export const MIN_VALUES_FOR_IQR = 4;
/** Mínimo de linhas agregadas para aplicar o corte por MAD. */
export const MIN_ROWS_FOR_MAD = 8;
/** Cercas do método MAD em escala log (assimétricas; calibrar com a consulta 7.3 da auditoria). */
export const MAD_K_INF = 2.5;
export const MAD_K_SUP = 3.0;
/** Percentis reportados como mínimo e máximo da faixa. */
export const RANGE_LOW_P = 0.1;
export const RANGE_HIGH_P = 0.95;

export type OutlierMethod = "iqr" | "percentile" | "mad";

/**
 * Origem da amostra, em ordem de proximidade. `raio100` e `raio300` são os
 * degraus intermediários do fallback por raio (ativados por configuração);
 * `bairro` continua sendo o último recurso.
 */
export type DataSource = "logradouro" | "raio100" | "raio300" | "bairro";

/** Degraus do fallback por raio, em metros, do mais próximo ao mais largo. */
export const RADIUS_STEPS_M = [100, 300] as const;
export type RadiusStep = (typeof RADIUS_STEPS_M)[number];
export const radiusSource = (raio: RadiusStep): DataSource => (raio === 100 ? "raio100" : "raio300");

/**
 * Linhas agregadas a partir das quais um escopo (rua, raio) é considerado
 * suficiente e o fallback para. Igual ao mínimo do MAD: abaixo disso não há
 * corte de outlier nem mediana estável.
 */
export const MIN_ROWS_SCOPE = 8;
export const isScopeSufficient = (rows: MarketRow[]): boolean => rows.length >= MIN_ROWS_SCOPE;

/**
 * Penalidade de confiança por origem da amostra (auditoria, achado A2 e
 * seção 11): quanto mais longe do imóvel, menor a confiança.
 */
export const SOURCE_PENALTY: Record<DataSource, number> = {
  logradouro: 0,
  raio100: 5,
  raio300: 10,
  bairro: 15,
};

/**
 * Escolhe a amostra entre candidatos ordenados por proximidade (rua, raio
 * 100 m, raio 300 m): o primeiro suficiente; se nenhum for, o que tiver mais
 * linhas (empate favorece o mais próximo); null se todos estiverem vazios.
 * O bairro não entra aqui: ele só substitui quando esta função devolve null.
 */
export const pickFallbackSample = <T extends { rows: MarketRow[] }>(candidates: (T | null | undefined)[]): T | null => {
  const present = candidates.filter((c): c is T => !!c && c.rows.length > 0);
  if (present.length === 0) return null;
  const sufficient = present.find((c) => isScopeSufficient(c.rows));
  if (sufficient) return sufficient;
  return present.reduce((best, c) => (c.rows.length > best.rows.length ? c : best));
};

export interface MarketRow {
  valor_m2: number | null;
  valor_transacao?: number | null;
  total_transacoes: number | null;
  data_transacao: string;
  bairro?: string | null;
  tipologia?: string | null;
}

/**
 * Metadados que tornam o cálculo reprodutível (persistidos em
 * valuations.itbi_metadata). Ver docs/auditoria-motor-avaliacao.md.
 */
export interface ITBIMarketMeta {
  engine_version: number;
  data_source: DataSource;
  /** raio em metros quando data_source é raio100/raio300 */
  raio_m?: number | null;
  /** ponto usado como centro do raio (média das coordenadas do logradouro) */
  ponto_referencia?: { lat: number; lng: number; fonte: string } | null;
  bairros_incluidos: string[];
  janela_inicio: string;
  janela_fim: string;
  ano_corrente_incluido: boolean;
  tipologia_filtro: string | null;
  /** true quando a tipologia do imóvel era conhecida mas a amostra exigiu relaxar o filtro */
  tipologia_fallback: boolean;
  outlier_method: OutlierMethod | "none";
  piso_m2: number;
  teto_m2: number;
  linhas_agregadas: number;
  linhas_descartadas: number;
  escrituras_validas: number;
  /** true quando a consulta bateu no limite de linhas e a amostra é parcial */
  truncado: boolean;
  /** true quando as linhas foram corrigidas pelo índice de preços para o trimestre de referência */
  deflacionado?: boolean;
  /** trimestre de referência do índice (YYYY-MM-01) ou null */
  trimestre_referencia?: string | null;
  calculado_em: string;
}

export interface ITBIStats {
  /** P10 ponderado dos sobreviventes ao corte (R$/m²) */
  min_m2: number;
  /** Mediana ponderada dos sobreviventes (R$/m²) */
  med_m2: number;
  /** P95 ponderado dos sobreviventes (R$/m²) */
  max_m2: number;
  /** Média ponderada dos sobreviventes (R$/m²); para exibição, não para referência */
  media_m2: number;
  /** Soma de total_transacoes de todas as linhas válidas (antes do corte) */
  transaction_count: number;
  /** Média ponderada do valor de transação (R$) */
  avg_valor_transacao: number;
  meta: ITBIMarketMeta;
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

export const weightOf = (r: { total_transacoes: number | null }): number => Math.max(1, r.total_transacoes || 1);

export const sumTransacoes = (rows: MarketRow[]): number => rows.reduce((sum, r) => sum + weightOf(r), 0);

// ---------------------------------------------------------------------------
// Quantis ponderados
// ---------------------------------------------------------------------------

export interface Weighted {
  v: number;
  w: number;
}

/** Itens {valor, peso} ordenados por valor; `transform` permite trabalhar em log. */
export const toWeightedItems = (rows: MarketRow[], transform: (v: number) => number = (v) => v): Weighted[] =>
  rows
    .map((r) => ({ v: transform(Number(r.valor_m2)), w: weightOf(r) }))
    .filter((p) => Number.isFinite(p.v))
    .sort((a, b) => a.v - b.v);

const totalWeight = (items: Weighted[]): number => items.reduce((s, p) => s + p.w, 0);

/** Valor na posição k (0-based) do array que resultaria de expandir cada item pelo peso. */
const valueAtExpandedIndex = (sortedItems: Weighted[], k: number): number => {
  let cum = 0;
  for (const p of sortedItems) {
    cum += p.w;
    if (k < cum) return p.v;
  }
  return sortedItems[sortedItems.length - 1].v;
};

/** Quantil posicional ponderado (mesma convenção histórica do motor: índice floor(n·p)). */
export const weightedQuantile = (sortedItems: Weighted[], p: number): number => {
  const n = totalWeight(sortedItems);
  const k = Math.min(n - 1, Math.max(0, Math.floor(n * p)));
  return valueAtExpandedIndex(sortedItems, k);
};

/** Mediana ponderada (média dos dois centrais quando n é par). */
export const weightedMedian = (sortedItems: Weighted[]): number => {
  const n = totalWeight(sortedItems);
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return valueAtExpandedIndex(sortedItems, mid);
  return (valueAtExpandedIndex(sortedItems, mid - 1) + valueAtExpandedIndex(sortedItems, mid)) / 2;
};

export const weightedMean = (items: Weighted[]): number => {
  const n = totalWeight(items);
  return n > 0 ? items.reduce((s, p) => s + p.v * p.w, 0) / n : 0;
};

// ---------------------------------------------------------------------------
// Cortes de outlier
// ---------------------------------------------------------------------------

export interface Bounds {
  lower: number;
  upper: number;
}

/**
 * Cercas de Tukey (1,5 × IQR) sobre a distribuição ponderada, com a banda
 * mínima de segurança de 20% da mediana quando o IQR colapsa (CONTEXT.md
 * §5.1). Precisa de pelo menos MIN_VALUES_FOR_IQR escrituras.
 */
export const computeIQRBounds = (rows: MarketRow[]): Bounds | null => {
  const items = toWeightedItems(rows);
  if (totalWeight(items) < MIN_VALUES_FOR_IQR) return null;
  const q1 = weightedQuantile(items, 0.25);
  const q3 = weightedQuantile(items, 0.75);
  const med = weightedQuantile(items, 0.5);
  const iqr = q3 - q1;
  const effectiveIQR = Math.max(iqr, med * 0.2);
  return { lower: q1 - 1.5 * effectiveIQR, upper: q3 + 1.5 * effectiveIQR };
};

/**
 * Cercas por mediana e MAD em escala logarítmica, assimétricas (mais
 * rigorosas embaixo). Precisa de pelo menos MIN_ROWS_FOR_MAD linhas
 * agregadas; com dispersão zero não corta.
 */
export const computeMADBounds = (rows: MarketRow[]): Bounds | null => {
  const positive = rows.filter((r) => Number(r.valor_m2) > 0);
  if (positive.length < MIN_ROWS_FOR_MAD) return null;
  const logs = toWeightedItems(positive, Math.log);
  const med = weightedMedian(logs);
  const deviations = logs.map((p) => ({ v: Math.abs(p.v - med), w: p.w })).sort((a, b) => a.v - b.v);
  const scale = 1.4826 * weightedMedian(deviations);
  if (!(scale > 0)) return null;
  return { lower: Math.exp(med - MAD_K_INF * scale), upper: Math.exp(med + MAD_K_SUP * scale) };
};

export const computeBounds = (rows: MarketRow[], method: OutlierMethod): Bounds | null => {
  if (method === "iqr") return computeIQRBounds(rows);
  if (method === "mad") return computeMADBounds(rows);
  return null; // percentile: sem corte, a faixa já é P10/P95
};

// ---------------------------------------------------------------------------
// Estatística final
// ---------------------------------------------------------------------------

export interface CalculateOptions {
  method: OutlierMethod;
  meta: Omit<
    ITBIMarketMeta,
    "engine_version" | "outlier_method" | "linhas_agregadas" | "linhas_descartadas" | "escrituras_validas" | "calculado_em"
  >;
  now?: Date;
}

/**
 * Calcula P10, mediana e P95 de R$/m² ponderados por `total_transacoes`
 * sobre os sobreviventes ao corte configurado, e devolve os metadados que
 * tornam o cálculo reprodutível. A faixa é sempre P10/P95, independentemente
 * do método: o método só decide o que é descartado antes.
 */
export const calculateITBIData = (rows: MarketRow[], options: CalculateOptions): ITBIStats | null => {
  if (!rows || rows.length === 0) return null;

  const valid = rows.filter((r) => Number.isFinite(Number(r.valor_m2)));
  if (valid.length === 0) return null;

  const bounds = computeBounds(valid, options.method);
  let kept = valid;
  if (bounds) {
    const filtered = valid.filter((r) => {
      const v = Number(r.valor_m2);
      return v >= bounds.lower && v <= bounds.upper;
    });
    // Nunca deixa a amostra colapsar: se o corte remover quase tudo, mantém a amostra inteira.
    if (sumTransacoes(filtered) >= 3) kept = filtered;
  }

  const keptItems = toWeightedItems(kept);
  const minValue = weightedQuantile(keptItems, RANGE_LOW_P);
  const maxValue = weightedQuantile(keptItems, RANGE_HIGH_P);
  const medValue = weightedMedian(keptItems);
  const meanValue = weightedMean(keptItems);

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
    outlier_method: bounds || options.method === "percentile" ? options.method : "none",
    linhas_agregadas: valid.length,
    linhas_descartadas: valid.length - kept.length,
    escrituras_validas: sumTransacoes(kept),
    calculado_em: (options.now ?? new Date()).toISOString(),
  };

  return {
    min_m2: Math.round(minValue),
    med_m2: Math.round(medValue),
    max_m2: Math.round(maxValue),
    media_m2: Math.round(meanValue),
    transaction_count: sumTransacoes(valid),
    avg_valor_transacao: Math.round(avgValorTransacao),
    meta,
  };
};

// ---------------------------------------------------------------------------
// Correção temporal pelo índice de preços (materialized view itbi_price_index)
// ---------------------------------------------------------------------------

export interface PriceIndexPoint {
  /** primeiro dia do trimestre (YYYY-MM-DD) */
  trimestre: string;
  /** mediana ponderada de ln(valor_m2) no trimestre */
  ln_mediana: number;
  escrituras: number;
}

/** Trimestres com menos escrituras que isto não corrigem nem servem de referência. */
export const MIN_ESCRITURAS_INDEX_QUARTER = 30;
/** Fator de correção limitado a [1/2, 2] por segurança. */
export const MAX_DEFLATION_FACTOR = 2;

/** Primeiro dia do trimestre de uma data ISO (YYYY-MM-DD). */
export const quarterOf = (isoDate: string): string => {
  const year = isoDate.slice(0, 4);
  const month = Number(isoDate.slice(5, 7));
  const qMonth = Math.floor((month - 1) / 3) * 3 + 1;
  return `${year}-${String(qMonth).padStart(2, "0")}-01`;
};

export interface DeflationResult {
  rows: MarketRow[];
  aplicado: boolean;
  trimestreReferencia: string | null;
  linhasCorrigidas: number;
}

/**
 * Corrige valor_m2 (e valor_transacao) de cada linha para o trimestre de
 * referência: fator = exp(ln_mediana_ref - ln_mediana_trimestre_da_linha).
 * Referência = trimestre mais recente até `today` com escrituras suficientes.
 * Linhas de trimestres sem índice (ou com índice fino) ficam como estão.
 */
export const deflateRows = (rows: MarketRow[], index: PriceIndexPoint[] | null | undefined, today: Date = new Date()): DeflationResult => {
  const usable = (index || []).filter((p) => p.escrituras >= MIN_ESCRITURAS_INDEX_QUARTER && Number.isFinite(p.ln_mediana));
  const todayQuarter = quarterOf(toIsoDate(today));
  const reference = usable.filter((p) => p.trimestre <= todayQuarter).sort((a, b) => (a.trimestre < b.trimestre ? 1 : -1))[0];
  if (!reference) {
    return { rows, aplicado: false, trimestreReferencia: null, linhasCorrigidas: 0 };
  }
  const byQuarter = new Map(usable.map((p) => [p.trimestre, p.ln_mediana]));
  let corrigidas = 0;
  const out = rows.map((r) => {
    const ln = byQuarter.get(quarterOf(r.data_transacao));
    if (ln === undefined || !Number.isFinite(Number(r.valor_m2))) return r;
    const factor = Math.min(MAX_DEFLATION_FACTOR, Math.max(1 / MAX_DEFLATION_FACTOR, Math.exp(reference.ln_mediana - ln)));
    if (factor !== 1) corrigidas++;
    return {
      ...r,
      valor_m2: Number(r.valor_m2) * factor,
      valor_transacao: r.valor_transacao == null ? r.valor_transacao : Number(r.valor_transacao) * factor,
    };
  });
  return { rows: out, aplicado: true, trimestreReferencia: reference.trimestre, linhasCorrigidas: corrigidas };
};

/** Bairros distintos presentes na amostra, normalizados. */
export const collectBairros = (rows: MarketRow[]): string[] =>
  Array.from(new Set(rows.map((r) => (r.bairro || "").toUpperCase().trim()).filter(Boolean))).sort();
