import { describe, expect, test } from "bun:test";
import {
  ANUNCIO_GAP_ALERT_PCT,
  calculateCombinedPrices,
  calculateConfidenceScore,
  calculateFinalValues,
  calculateSpread,
  calculateValuation,
  generateRecommendation,
  sampleFromITBI,
  SPREAD_WIDE_PCT,
  type SampleInfo,
} from "../valuationCalculations";
import type { ITBIData } from "../../types/valuation";

const itbi = (overrides: Partial<ITBIData> = {}): ITBIData => ({
  min_m2: 10000,
  med_m2: 12000,
  max_m2: 15000,
  transaction_count: 40,
  meta: {
    engine_version: 3,
    data_source: "logradouro",
    bairros_incluidos: ["BARRA DA TIJUCA"],
    janela_inicio: "2021-01-01",
    janela_fim: "2025-12-31",
    ano_corrente_incluido: false,
    tipologia_filtro: "Apartamento",
    tipologia_fallback: false,
    outlier_method: "iqr",
    piso_m2: 5000,
    teto_m2: 40000,
    linhas_agregadas: 12,
    linhas_descartadas: 1,
    escrituras_validas: 38,
    truncado: false,
    calculado_em: "2026-09-02T00:00:00.000Z",
  },
  ...overrides,
});

const bigSample: SampleInfo = { escrituras: 60, linhas: 20, dataSource: "logradouro", tipologiaFallback: false, truncado: false };

describe("calculateCombinedPrices", () => {
  test("a base é 100% ITBI mesmo com anúncios; anúncios só geram o gap", () => {
    const c = calculateCombinedPrices(itbi(), { min_m2: 14000, med_m2: 15000, max_m2: 16000, count: 3 });
    expect(c.min_m2).toBe(10000);
    expect(c.med_m2).toBe(12000);
    expect(c.max_m2).toBe(15000);
    expect(c.market_gap_percentage).toBe(25);
    expect(c.market_alignment).toBe("DESALINHADO");
    expect(c.anuncios_count).toBe(3);
  });
  test("menos de três anúncios não gera gap", () => {
    const c = calculateCombinedPrices(itbi(), { min_m2: 14000, med_m2: 15000, max_m2: 16000, count: 2 });
    expect(c.market_gap_percentage).toBeNull();
    expect(c.market_alignment).toBe("AMOSTRA_INSUFICIENTE");
  });
});

describe("calculateFinalValues", () => {
  test("faixa = P10 / mediana / P90 × área × ajuste × documentação, sem compressão", () => {
    const combined = calculateCombinedPrices(itbi());
    const v = calculateFinalValues(100, combined, 0.1, 0.95);
    expect(v.pessimista).toBe(Math.round(10000 * 100 * 1.1 * 0.95));
    expect(v.provavel).toBe(Math.round(12000 * 100 * 1.1 * 0.95));
    expect(v.otimista).toBe(Math.round(15000 * 100 * 1.1 * 0.95));
  });
  test("o spread não é mais limitado a 35%", () => {
    const combined = calculateCombinedPrices(itbi({ min_m2: 8000, med_m2: 12000, max_m2: 18000 }));
    const v = calculateFinalValues(100, combined, 0, 1);
    expect(calculateSpread(v.pessimista, v.otimista, v.provavel)).toBeCloseTo(83.3, 1);
  });
});

describe("calculateConfidenceScore", () => {
  test("amostra grande, bem documentada e com anúncios coerentes chega perto de 100", () => {
    expect(calculateConfidenceScore(0.05, 30, 1, 5, 80, bigSample)).toBe(100);
  });
  test("uma escritura nunca passa de 40, mesmo com tudo o mais perfeito", () => {
    const one: SampleInfo = { ...bigSample, escrituras: 1 };
    expect(calculateConfidenceScore(0, 20, 1, 5, 80, one)).toBeLessThanOrEqual(40);
  });
  test("tetos por tamanho de amostra", () => {
    expect(calculateConfidenceScore(0, 20, 1, 5, 80, { ...bigSample, escrituras: 5 })).toBeLessThanOrEqual(55);
    expect(calculateConfidenceScore(0, 20, 1, 5, 80, { ...bigSample, escrituras: 20 })).toBeLessThanOrEqual(75);
  });
  test("fallback para o bairro custa 15 pontos", () => {
    const rua = calculateConfidenceScore(0, 30, 1, null, 50, bigSample);
    const bairro = calculateConfidenceScore(0, 30, 1, null, 50, { ...bigSample, dataSource: "bairro" });
    expect(rua - bairro).toBe(15);
  });
  test("faixa muito larga penaliza", () => {
    const estreita = calculateConfidenceScore(0, 30, 1, null, 50, bigSample);
    const larga = calculateConfidenceScore(0, 70, 1, null, 50, bigSample);
    expect(estreita - larga).toBe(18);
  });
});

describe("generateRecommendation", () => {
  test("amostra insuficiente vem antes de qualquer outra regra que não bloqueie", () => {
    const r = generateRecommendation("ok", 1, 20, 90, null, 1_000_000, "SEM_DADOS", { ...bigSample, escrituras: 2 });
    expect(r.status).toBe("INSUFFICIENT_SAMPLE");
    expect(r.urgency).toBe("HIGH");
  });
  test("documentação incompleta ainda bloqueia primeiro", () => {
    const r = generateRecommendation("incompleta", 1, 20, 90, null, 1_000_000, "SEM_DADOS", { ...bigSample, escrituras: 2 });
    expect(r.status).toBe("BLOCKED_EVALUATION");
  });
  test("Regra 3 volta a ser alcançável: faixa larga com confiança baixa pede avaliação formal", () => {
    const r = generateRecommendation("ok", 1, SPREAD_WIDE_PCT + 10, 50, null, 1_000_000, "SEM_DADOS", bigSample);
    expect(r.status).toBe("NEED_SPECIALIST_VALUATION");
  });
  test("gap de anúncios acima do limiar alerta; abaixo, não", () => {
    const alto = generateRecommendation("ok", 1, 30, 85, ANUNCIO_GAP_ALERT_PCT + 1, 1_000_000, "MODERADO", bigSample);
    expect(alto.status).toBe("WAIT_30_DAYS");
    const baixo = generateRecommendation("ok", 1, 30, 85, 8, 1_000_000, "EQUILIBRADO", bigSample);
    expect(baixo.status).toBe("READY_TO_MARKET");
  });
});

describe("calculateValuation (ponta a ponta)", () => {
  test("uma rua com uma escritura sai como amostra insuficiente e confiança baixa", () => {
    const data = itbi({ transaction_count: 1, meta: { ...itbi().meta!, escrituras_validas: 1, linhas_agregadas: 1, linhas_descartadas: 0 } });
    const r = calculateValuation(100, data, undefined, [], [], "ok", 1, 0, "Apartamento", 30);
    expect(r.recommendation.status).toBe("INSUFFICIENT_SAMPLE");
    expect(r.confidence_level).toBe("red");
    expect(r.provavel).toBe(1_200_000);
  });
  test("avaliação antiga sem metadados usa transaction_count como amostra", () => {
    const s = sampleFromITBI({ min_m2: 1, med_m2: 2, max_m2: 3, transaction_count: 12 });
    expect(s?.escrituras).toBe(12);
    expect(s?.dataSource).toBe("logradouro");
  });
});
