import { describe, expect, test } from "bun:test";
import {
  MIN_ROWS_SCOPE,
  SOURCE_PENALTY,
  buildMarketWindow,
  isScopeSufficient,
  pickFallbackSample,
  radiusSource,
  calculateITBIData,
  collectBairros,
  computeIQRBounds,
  computeMADBounds,
  deflateRows,
  mapTipoImovelToTipologia,
  MIN_ESCRITURAS_INDEX_QUARTER,
  quarterOf,
  selectWindowRows,
  buildRollingWindow,
  selectRollingWindowRows,
  normalizeWindowMonths,
  DEFAULT_WINDOW_MONTHS,
  toWeightedItems,
  weightedMedian,
  weightedQuantile,
  type MarketRow,
} from "../itbiMarketStats";
import {
  DEFAULT_OUTLIER_MAX,
  DEFAULT_OUTLIER_MIN,
  getOutlierLimit,
  getOutlierLimits,
  getOutlierMinLimit,
  normalizeBairro,
  PISO_MARGIN,
  TETO_MARGIN,
  SMALL_SAMPLE_WIDTH,
} from "../../lib/outlierLimits";

const row = (valor_m2: number, total_transacoes = 1, data_transacao = "2024-06-15", extra: Partial<MarketRow> = {}): MarketRow => ({
  valor_m2,
  valor_transacao: valor_m2 * 100,
  total_transacoes,
  data_transacao,
  bairro: "BARRA DA TIJUCA",
  tipologia: "Apartamento",
  ...extra,
});

const baseMeta = {
  data_source: "logradouro" as const,
  bairros_incluidos: ["BARRA DA TIJUCA"],
  janela_inicio: "2021-01-01",
  janela_fim: "2025-12-31",
  ano_corrente_incluido: false,
  tipologia_filtro: "Apartamento",
  tipologia_fallback: false,
  piso_m2: 5000,
  teto_m2: 40000,
  truncado: false,
};

describe("buildMarketWindow", () => {
  test("cobre os cinco anos fechados anteriores ao ano corrente", () => {
    const w = buildMarketWindow(new Date("2026-09-02T12:00:00Z"));
    expect(w.start).toBe("2021-01-01");
    expect(w.closedEnd).toBe("2025-12-31");
    expect(w.end).toBe("2026-09-02");
    expect(w.currentYear).toBe(2026);
  });
});

describe("mapTipoImovelToTipologia", () => {
  test("casa e casa em condomínio viram Casa", () => {
    expect(mapTipoImovelToTipologia("Casa")).toBe("Casa");
    expect(mapTipoImovelToTipologia("Casa em Condomínio")).toBe("Casa");
  });
  test("apartamento e coberturas viram Apartamento (como o importador)", () => {
    expect(mapTipoImovelToTipologia("Apartamento")).toBe("Apartamento");
    expect(mapTipoImovelToTipologia("Cobertura Duplex")).toBe("Apartamento");
  });
  test("comercial e vazio não filtram", () => {
    expect(mapTipoImovelToTipologia("Loja")).toBeNull();
    expect(mapTipoImovelToTipologia("")).toBeNull();
  });
});

describe("selectWindowRows", () => {
  const w = buildMarketWindow(new Date("2026-09-02T12:00:00Z"));

  test("usa só anos fechados quando a amostra é suficiente", () => {
    const closed = Array.from({ length: 40 }, (_, i) => row(10000 + i, 3, "2024-03-15"));
    const current = [row(30000, 5, "2026-02-15")];
    const sel = selectWindowRows([...current, ...closed], w);
    expect(sel.anoCorrenteIncluido).toBe(false);
    expect(sel.rows).toHaveLength(40);
    expect(sel.janelaFim).toBe("2025-12-31");
  });

  test("inclui o ano corrente quando os anos fechados são finos", () => {
    const closed = [row(10000, 2, "2024-03-15"), row(11000, 2, "2025-03-15")];
    const current = [row(12000, 4, "2026-02-15")];
    const sel = selectWindowRows([...current, ...closed], w);
    expect(sel.anoCorrenteIncluido).toBe(true);
    expect(sel.rows).toHaveLength(3);
    expect(sel.janelaFim).toBe("2026-09-02");
  });

  test("não marca expansão quando não há linhas do ano corrente", () => {
    const sel = selectWindowRows([row(10000, 2, "2024-03-15")], w);
    expect(sel.anoCorrenteIncluido).toBe(false);
  });
});

describe("janela móvel em meses", () => {
  const hoje = new Date("2026-09-02T12:00:00Z");

  test("padrão é 12 meses e opções inválidas caem no padrão", () => {
    expect(DEFAULT_WINDOW_MONTHS).toBe(12);
    expect(normalizeWindowMonths(24)).toBe(24);
    expect(normalizeWindowMonths(7)).toBe(12);
    expect(normalizeWindowMonths(undefined)).toBe(12);
    expect(buildRollingWindow(12, hoje).start).toBe("2025-09-02");
    expect(buildRollingWindow(60, hoje).start).toBe("2021-09-02");
  });

  test("recorta a amostra na janela pedida quando há dados suficientes", () => {
    const recentes = Array.from({ length: 10 }, (_, i) => row(10000 + i, 3, "2026-03-15"));
    const antigas = Array.from({ length: 10 }, (_, i) => row(8000 + i, 3, "2023-03-15"));
    const sel = selectRollingWindowRows([...recentes, ...antigas], 12, hoje);
    expect(sel.janelaMeses).toBe(12);
    expect(sel.expandidoAutomaticamente).toBe(false);
    expect(sel.rows).toHaveLength(10);
  });

  test("expande automaticamente quando a janela pedida é fina", () => {
    const rows = [row(10000, 3, "2026-03-15"), ...Array.from({ length: 10 }, (_, i) => row(9000 + i, 2, "2025-01-15"))];
    const sel = selectRollingWindowRows(rows, 12, hoje);
    expect(sel.expandidoAutomaticamente).toBe(true);
    expect(sel.janelaMeses).toBe(24);
    expect(sel.janelaSolicitadaMeses).toBe(12);
    expect(sel.rows).toHaveLength(11);
  });
});

describe("quantis ponderados", () => {
  test("equivalem a expandir cada linha pelo peso", () => {
    // expandido: [10, 20, 20, 20, 30] → mediana 20, P10 idx0 = 10, P90 idx4 = 30
    const items = toWeightedItems([row(20, 3), row(10, 1), row(30, 1)]);
    expect(weightedMedian(items)).toBe(20);
    expect(weightedQuantile(items, 0.1)).toBe(10);
    expect(weightedQuantile(items, 0.9)).toBe(30);
  });
  test("mediana de n par é a média dos dois centrais", () => {
    // expandido: [10, 10, 20, 20] → (10+20)/2
    const items = toWeightedItems([row(10, 2), row(20, 2)]);
    expect(weightedMedian(items)).toBe(15);
  });
});

describe("computeIQRBounds", () => {
  test("precisa de quatro escrituras", () => {
    expect(computeIQRBounds([row(1), row(2), row(3)])).toBeNull();
    expect(computeIQRBounds([row(1, 4)])).not.toBeNull();
  });
  test("aplica a banda mínima de 20% quando o IQR colapsa", () => {
    const b = computeIQRBounds([row(10000, 4)])!;
    expect(b.lower).toBeCloseTo(10000 - 1.5 * 2000);
    expect(b.upper).toBeCloseTo(10000 + 1.5 * 2000);
  });
});

describe("computeMADBounds", () => {
  test("precisa de oito linhas agregadas", () => {
    expect(computeMADBounds(Array.from({ length: 7 }, (_, i) => row(10000 + i * 500)))).toBeNull();
  });
  test("dispersão zero não corta", () => {
    expect(computeMADBounds(Array.from({ length: 8 }, () => row(10000)))).toBeNull();
  });
  test("cercas assimétricas em torno da mediana em log", () => {
    const rows = [9000, 9500, 10000, 10000, 10500, 11000, 11500, 12000].map((v) => row(v));
    const b = computeMADBounds(rows)!;
    const med = 10000;
    // cerca superior mais distante da mediana (em razão) do que a inferior
    expect(b.upper / med).toBeGreaterThan(med / b.lower);
    expect(b.lower).toBeLessThan(9000);
    expect(b.upper).toBeGreaterThan(12000);
    // um valor 3× a mediana é descartado; um valor 20% acima, mantido
    expect(30000 > b.upper).toBe(true);
    expect(12000 <= b.upper).toBe(true);
  });
});

describe("calculateITBIData", () => {
  test("devolve null sem linhas", () => {
    expect(calculateITBIData([], { method: "iqr", meta: baseMeta })).toBeNull();
  });

  test("mediana ponderada por total_transacoes", () => {
    // 1 escritura a 10.000 e 9 escrituras a 20.000 → mediana 20.000
    const rows = [row(10000, 1), row(20000, 9)];
    const r = calculateITBIData(rows, { method: "iqr", meta: baseMeta })!;
    expect(r.med_m2).toBe(20000);
    expect(r.transaction_count).toBe(10);
  });

  test("IQR descarta um agregado extremo, reporta P10/P90 dos sobreviventes e registra nos metadados", () => {
    const rows = [row(10000, 5), row(10500, 5), row(11000, 5), row(11500, 5), row(60000, 1)];
    const r = calculateITBIData(rows, { method: "iqr", meta: baseMeta, now: new Date("2026-09-02T00:00:00Z") })!;
    expect(r.min_m2).toBe(10000); // P10 dos 20 sobreviventes
    expect(r.max_m2).toBe(11500); // P90 dos 20 sobreviventes
    expect(r.media_m2).toBe(10750);
    expect(r.meta.linhas_agregadas).toBe(5);
    expect(r.meta.linhas_descartadas).toBe(1);
    expect(r.meta.escrituras_validas).toBe(20);
    expect(r.meta.outlier_method).toBe("iqr");
    expect(r.meta.engine_version).toBe(3);
    expect(r.meta.calculado_em).toBe("2026-09-02T00:00:00.000Z");
  });

  test("percentil não descarta e usa P10/P90 como mínimo e máximo", () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(10000 + i * 1000, 1));
    const r = calculateITBIData(rows, { method: "percentile", meta: baseMeta })!;
    expect(r.min_m2).toBe(11000);
    expect(r.max_m2).toBe(19000);
    expect(r.med_m2).toBe(14500);
    expect(r.meta.linhas_descartadas).toBe(0);
    expect(r.meta.outlier_method).toBe("percentile");
  });

  test("MAD descarta o extremo e mantém a faixa P10/P90", () => {
    const rows = [...[9000, 9500, 10000, 10000, 10500, 11000, 11500, 12000].map((v) => row(v, 2)), row(45000, 1)];
    const r = calculateITBIData(rows, { method: "mad", meta: baseMeta })!;
    expect(r.meta.outlier_method).toBe("mad");
    expect(r.meta.linhas_descartadas).toBe(1);
    expect(r.max_m2).toBeLessThanOrEqual(12000);
  });

  test("amostra pequena não aplica corte e registra 'none'", () => {
    const r = calculateITBIData([row(9000, 1), row(30000, 1)], { method: "iqr", meta: baseMeta })!;
    expect(r.min_m2).toBe(9000);
    expect(r.max_m2).toBe(30000);
    expect(r.meta.outlier_method).toBe("none");
  });

  test("é determinístico para a mesma entrada", () => {
    const rows = [row(12000, 3), row(15000, 2), row(9000, 4), row(18000, 1), row(14000, 6)];
    const a = calculateITBIData(rows, { method: "iqr", meta: baseMeta, now: new Date(0) });
    const b = calculateITBIData([...rows].reverse(), { method: "iqr", meta: baseMeta, now: new Date(0) });
    expect(a).toEqual(b);
  });
});

describe("outlierLimits (tabela gerada por bun run cinto a partir da 7.4 unificada de 2026-09-03)", () => {
  test("par bairro × tipologia calibrado: P1 e P99.5 com margem", () => {
    const barraApto = getOutlierLimits("BARRA DA TIJUCA", "Apartamento");
    expect(barraApto.calibrado).toBe(true);
    expect(barraApto.piso).toBe(Math.round(6168 * PISO_MARGIN));
    expect(barraApto.teto).toBe(Math.round(20320 * TETO_MARGIN));
    const barraCasa = getOutlierLimits("BARRA DA TIJUCA", "Casa em Condomínio");
    expect(barraCasa.teto).toBe(Math.round(11792 * TETO_MARGIN));
    expect(barraCasa.teto).toBeLessThan(barraApto.teto);
  });
  test("cobertura usa a calibração de apartamento, como o importador", () => {
    expect(getOutlierLimits("LEBLON", "Cobertura Duplex").teto).toBe(Math.round(51659 * TETO_MARGIN)); // 59.408, logo abaixo do teto global
  });
  test("tipologia sem calibração no bairro cai na faixa mais larga do bairro", () => {
    const leblonCasa = getOutlierLimits("LEBLON", "Casa");
    expect(leblonCasa.calibrado).toBe(true);
    expect(leblonCasa.piso).toBe(Math.round(13185 * PISO_MARGIN));
  });
  test("bairro sem tipologia informada: menor piso e maior teto entre as tipologias", () => {
    expect(getOutlierMinLimit("BARRA DA TIJUCA")).toBe(Math.round(5278 * PISO_MARGIN));
    expect(getOutlierLimit("BARRA DA TIJUCA")).toBe(Math.round(20320 * TETO_MARGIN));
  });
  test("amostra pequena: janela de 5 anos e largura mínima [mediana/2; mediana×2]", () => {
    // FREGUESIA (ILHA)|Apartamento: 95 escrituras em 3 anos, 139 em 5; mediana 4.009, P99,5 5.759
    const ilha = getOutlierLimits("FREGUESIA (ILHA)", "Apartamento");
    expect(ilha.teto).toBe(4009 * SMALL_SAMPLE_WIDTH); // 8.018 > 5.759 × 1,15
    expect(ilha.piso).toBe(Math.round(2307 * PISO_MARGIN)); // 1.961 < 4.009 / 2
    // GRAJAU|Casa: 40 escrituras em 5 anos, mediana 3.391 → piso 1.696 (mediana/2 < P1 × 0,85)
    expect(getOutlierLimits("GRAJAÚ", "Casa").piso).toBe(Math.round(3391 / SMALL_SAMPLE_WIDTH));
  });
  test("par que cresceu com a recarga de 2026-09-03 volta à regra padrão de 3 anos", () => {
    // SANTA CRUZ|Apartamento: 85 → 309 escrituras em 3 anos (piso de R$ 30 mil na ingestão)
    const sc = getOutlierLimits("SANTA CRUZ", "Apartamento");
    expect(sc.piso).toBe(Math.round(1631 * PISO_MARGIN));
    expect(sc.teto).toBe(Math.round(3238 * TETO_MARGIN));
  });
  test("par com menos de 30 escrituras em 5 anos fica fora e cai na faixa do bairro", () => {
    // COPACABANA|Casa: 2 escrituras → usa o par de apartamento do bairro
    const casa = getOutlierLimits("COPACABANA", "Casa");
    expect(casa).toEqual(getOutlierLimits("COPACABANA", "Apartamento"));
  });
  test("Barra Olímpica voltou à base na recarga de 2026-09-03 e tem par próprio", () => {
    expect(getOutlierLimits("BARRA OLÍMPICA", "Apartamento")).toMatchObject({ calibrado: true, piso: 4837, teto: 11003 });
  });
  test("bairro desconhecido usa os padrões e sinaliza não calibrado", () => {
    const r = getOutlierLimits("BAIRRO INEXISTENTE", "Apartamento");
    expect(r).toEqual({ piso: DEFAULT_OUTLIER_MIN, teto: DEFAULT_OUTLIER_MAX, calibrado: false });
  });
  test("ignora acentos e caixa", () => {
    expect(normalizeBairro("Jardim Botânico")).toBe("JARDIM BOTANICO");
    expect(getOutlierLimit("jardim botânico")).toBe(Math.round(20939 * TETO_MARGIN));
    expect(getOutlierLimit("Grajaú")).toBe(Math.round(6553 * TETO_MARGIN));
    expect(getOutlierLimit("Freguesia (Jacarepaguá)")).toBe(Math.round(6870 * TETO_MARGIN));
  });
});

describe("collectBairros", () => {
  test("lista bairros distintos ordenados", () => {
    const rows = [row(1, 1, "2024-01-15", { bairro: "recreio dos bandeirantes" }), row(1, 1, "2024-01-15"), row(1, 1, "2024-01-15", { bairro: null })];
    expect(collectBairros(rows)).toEqual(["BARRA DA TIJUCA", "RECREIO DOS BANDEIRANTES"]);
  });
});

describe("deflateRows (índice de preços)", () => {
  const index = [
    { trimestre: "2024-01-01", ln_mediana: Math.log(10000), escrituras: 100 },
    { trimestre: "2024-04-01", ln_mediana: Math.log(11000), escrituras: 100 },
    { trimestre: "2025-01-01", ln_mediana: Math.log(12000), escrituras: 100 },
    { trimestre: "2025-04-01", ln_mediana: Math.log(13000), escrituras: MIN_ESCRITURAS_INDEX_QUARTER - 1 }, // fino: ignorado
  ];

  test("quarterOf devolve o primeiro dia do trimestre", () => {
    expect(quarterOf("2024-05-15")).toBe("2024-04-01");
    expect(quarterOf("2024-12-15")).toBe("2024-10-01");
  });

  test("corrige cada linha para o trimestre de referência mais recente com amostra suficiente", () => {
    const rows = [row(10000, 2, "2024-02-15"), row(11000, 3, "2024-05-15"), row(12000, 1, "2025-02-15")];
    const d = deflateRows(rows, index, new Date("2025-09-02T00:00:00Z"));
    expect(d.aplicado).toBe(true);
    expect(d.trimestreReferencia).toBe("2025-01-01");
    // todas as linhas passam a valer 12.000 no trimestre de referência
    d.rows.forEach((r) => expect(Math.round(Number(r.valor_m2))).toBe(12000));
    expect(d.linhasCorrigidas).toBe(2);
  });

  test("linhas de trimestres sem índice ficam intactas", () => {
    const d = deflateRows([row(9000, 1, "2020-02-15")], index, new Date("2025-09-02T00:00:00Z"));
    expect(d.aplicado).toBe(true);
    expect(Number(d.rows[0].valor_m2)).toBe(9000);
    expect(d.linhasCorrigidas).toBe(0);
  });

  test("sem índice, não corrige e registra", () => {
    const d = deflateRows([row(9000)], null);
    expect(d.aplicado).toBe(false);
    expect(d.trimestreReferencia).toBeNull();
  });

  test("fator limitado a [0,5; 2]", () => {
    const extremo = [
      { trimestre: "2024-01-01", ln_mediana: Math.log(1000), escrituras: 100 },
      { trimestre: "2025-01-01", ln_mediana: Math.log(10000), escrituras: 100 },
    ];
    const d = deflateRows([row(1000, 1, "2024-02-15")], extremo, new Date("2025-09-02T00:00:00Z"));
    expect(Number(d.rows[0].valor_m2)).toBe(2000);
  });
});

describe("fallback por raio (seção 11)", () => {
  const rowsOf = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ valor_m2: 10000 + i, total_transacoes: 1, data_transacao: "2024-03-01" }));
  const cand = (source: string, n: number) => ({ source, rows: rowsOf(n) });

  test("escopo é suficiente a partir de MIN_ROWS_SCOPE linhas", () => {
    expect(isScopeSufficient(rowsOf(MIN_ROWS_SCOPE - 1))).toBe(false);
    expect(isScopeSufficient(rowsOf(MIN_ROWS_SCOPE))).toBe(true);
  });

  test("prefere o primeiro candidato suficiente na ordem de proximidade", () => {
    const best = pickFallbackSample([cand("logradouro", 3), cand("raio100", 9), cand("raio300", 40)]);
    expect(best?.source).toBe("raio100");
  });

  test("rua suficiente vence mesmo com raios maiores", () => {
    const best = pickFallbackSample([cand("logradouro", 8), cand("raio100", 50)]);
    expect(best?.source).toBe("logradouro");
  });

  test("sem candidato suficiente, escolhe o de maior amostra", () => {
    const best = pickFallbackSample([cand("logradouro", 2), cand("raio100", 5), cand("raio300", 6)]);
    expect(best?.source).toBe("raio300");
  });

  test("empate favorece o mais próximo", () => {
    const best = pickFallbackSample([cand("logradouro", 4), cand("raio100", 4)]);
    expect(best?.source).toBe("logradouro");
  });

  test("candidatos vazios ou nulos são ignorados; tudo vazio devolve null", () => {
    expect(pickFallbackSample([null, cand("raio100", 0), undefined])).toBeNull();
    expect(pickFallbackSample([null, cand("raio300", 2)])?.source).toBe("raio300");
  });

  test("penalidades crescem com a distância e mapeamento de raio para fonte", () => {
    expect(SOURCE_PENALTY.logradouro).toBe(0);
    expect(SOURCE_PENALTY.raio100).toBeLessThan(SOURCE_PENALTY.raio300);
    expect(SOURCE_PENALTY.raio300).toBeLessThan(SOURCE_PENALTY.bairro);
    expect(radiusSource(100)).toBe("raio100");
    expect(radiusSource(300)).toBe("raio300");
  });
});
