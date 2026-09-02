// Tendência de preço por regressão em escala log (Fase 3 da auditoria, item 16).
//
// Substitui o crescimento "reta entre o primeiro e o último ano", que era
// sensível a um único ano atípico nas pontas, por mínimos quadrados de
// ln(preço) sobre o ano, com intervalo derivado do erro padrão da inclinação.
// Sem dependências: roda em Deno e no navegador.

export interface GrowthPoint {
  ano: number;
  valor: number;
}

export interface GrowthFit {
  /** taxa anual provável (fração; 0.05 = +5% a.a.) */
  rate: number;
  /** limite inferior do intervalo (fração) */
  rateLow: number;
  /** limite superior do intervalo (fração) */
  rateHigh: number;
  /** anos com valor > 0 usados no ajuste */
  n: number;
  /** inclinação em log por ano */
  slope: number;
  /** erro padrão da inclinação (null quando n < 3) */
  se: number | null;
  method: "regressao_log" | "dois_pontos" | "insuficiente";
}

/** Banda fixa (pontos percentuais) usada quando não há erro padrão. */
export const FALLBACK_BAND_PP = 3;
/** Banda máxima (em log por ano) para manter as projeções legíveis. */
export const MAX_BAND_LOG = 0.25;

// t de Student (bicaudal, 95%) por graus de liberdade; acima de 10, ~1.96.
const T_95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228];
const tMultiplier = (df: number): number => (df >= 1 && df <= T_95.length ? T_95[df - 1] : 1.96);

export const fitLogGrowth = (points: GrowthPoint[]): GrowthFit => {
  const usable = points
    .filter((p) => Number.isFinite(p.ano) && Number.isFinite(p.valor) && p.valor > 0)
    .sort((a, b) => a.ano - b.ano);
  const n = usable.length;

  if (n < 2) {
    return { rate: 0, rateLow: 0, rateHigh: 0, n, slope: 0, se: null, method: "insuficiente" };
  }

  const xs = usable.map((p) => p.ano);
  const ys = usable.map((p) => Math.log(p.valor));
  const xMean = xs.reduce((s, x) => s + x, 0) / n;
  const yMean = ys.reduce((s, y) => s + y, 0) / n;
  const sxx = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
  if (!(sxx > 0)) {
    return { rate: 0, rateLow: 0, rateHigh: 0, n, slope: 0, se: null, method: "insuficiente" };
  }
  const sxy = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0);
  const slope = sxy / sxx;

  if (n === 2) {
    const band = Math.log(1 + FALLBACK_BAND_PP / 100);
    return {
      rate: Math.exp(slope) - 1,
      rateLow: Math.exp(slope - band) - 1,
      rateHigh: Math.exp(slope + band) - 1,
      n,
      slope,
      se: null,
      method: "dois_pontos",
    };
  }

  const intercept = yMean - slope * xMean;
  const sse = xs.reduce((s, x, i) => s + (ys[i] - (intercept + slope * x)) ** 2, 0);
  const se = Math.sqrt(sse / (n - 2) / sxx);
  const band = Math.min(MAX_BAND_LOG, tMultiplier(n - 2) * se);

  return {
    rate: Math.exp(slope) - 1,
    rateLow: Math.exp(slope - band) - 1,
    rateHigh: Math.exp(slope + band) - 1,
    n,
    slope,
    se,
    method: "regressao_log",
  };
};
