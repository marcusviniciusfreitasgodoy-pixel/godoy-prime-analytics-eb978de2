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
  FAIXA_SEM_CALIBRACAO_PISO,
  FAIXA_SEM_CALIBRACAO_TETO,
  FATOR_INDICE_5_ANOS,
  FATOR_MIN_INDICE_5_ANOS,
  getOutlierLimit,
  getOutlierLimits,
  getOutlierMinLimit,
  normalizeBairro,
  OUTLIER_LIMITS_TABLE,
  PISO_MARGIN,
  SMALL_SAMPLE_ESCRITURAS,
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
    expect(r.meta.engine_version).toBe(4);
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

  test("bimodal: corte que removeria mais de 15 % das escrituras é ignorado", () => {
    // oito escrituras entre 4.800 e 5.500 e três entre 15.000 e 16.000: o MAD em log
    // cortaria as três de cima (27 % da amostra), que são um segundo mercado, não erro.
    const rows = [4800, 4900, 5000, 5100, 5200, 5300, 5400, 5500, 15000, 15500, 16000].map((v) => row(v, 1));
    const r = calculateITBIData(rows, { method: "mad", meta: baseMeta })!;
    expect(r.meta.outlier_method).toBe("none");
    expect(r.meta.outlier_cut_skipped).toBe("bimodal");
    expect(r.meta.linhas_descartadas).toBe(0);
    expect(r.max_m2).toBeGreaterThan(10000);
  });
  test("um outlier isolado numa amostra de dez continua sendo cortado", () => {
    const rows = [...[4800, 4900, 5000, 5100, 5200, 5300, 5400, 5500, 5600, 5700].map((v) => row(v, 1)), row(50000, 1)];
    const r = calculateITBIData(rows, { method: "mad", meta: baseMeta })!;
    expect(r.meta.outlier_method).toBe("mad");
    expect(r.meta.outlier_cut_skipped).toBeUndefined();
    expect(r.meta.linhas_descartadas).toBe(1);
  });
  test("é determinístico para a mesma entrada", () => {
    const rows = [row(12000, 3), row(15000, 2), row(9000, 4), row(18000, 1), row(14000, 6)];
    const a = calculateITBIData(rows, { method: "iqr", meta: baseMeta, now: new Date(0) });
    const b = calculateITBIData([...rows].reverse(), { method: "iqr", meta: baseMeta, now: new Date(0) });
    expect(a).toEqual(b);
  });
});

describe("outlierLimits (tabela gerada por bun run cinto a partir da 7.4 com P0,5 de 2026-10-22)", () => {
  /** Piso e teto da tabela (preço do último trimestre) convertidos para preço da época, como getOutlierLimits devolve. */
  const nominal = (piso: number) => Math.round(piso / FATOR_INDICE_5_ANOS);
  const nominalTeto = (teto: number) => Math.round(teto / FATOR_MIN_INDICE_5_ANOS);

  test("toda entrada da tabela segue a regra da seção 2.5", () => {
    for (const [chave, e] of Object.entries(OUTLIER_LIMITS_TABLE)) {
      expect(chave.startsWith("DESCONHECIDO|")).toBe(false);
      expect(e.p05).toBeDefined();
      expect(e.mediana).toBeDefined();
      const p05 = e.p05 as number, med = e.mediana as number;
      if (e.janela === "3 anos") {
        expect(e.escrituras).toBeGreaterThanOrEqual(SMALL_SAMPLE_ESCRITURAS);
        expect(e.piso).toBe(Math.max(500, Math.round(p05 * PISO_MARGIN)));
        expect(e.teto).toBe(Math.min(300000, Math.round(e.p995 * TETO_MARGIN)));
      } else {
        expect(e.janela).toBe("5 anos");
        expect(e.escrituras).toBeGreaterThanOrEqual(30);
        expect(e.piso).toBe(Math.max(500, Math.round(Math.min(p05 * PISO_MARGIN, med / SMALL_SAMPLE_WIDTH))));
        expect(e.teto).toBe(Math.min(300000, Math.round(Math.max(e.p995 * TETO_MARGIN, med * SMALL_SAMPLE_WIDTH))));
      }
    }
  });
  test("par bairro × tipologia calibrado: piso e teto convertidos para preço da época", () => {
    expect(OUTLIER_LIMITS_TABLE["BARRA DA TIJUCA|Apartamento"]).toMatchObject({ piso: 3909, teto: 35346, janela: "3 anos" });
    const barraApto = getOutlierLimits("BARRA DA TIJUCA", "Apartamento");
    expect(barraApto).toEqual({ piso: nominal(3909), teto: nominalTeto(35346), calibrado: true });
    // Piso cai (trimestre mais barato da janela); teto sobe (trimestre mais caro que o último).
    expect(barraApto.piso).toBeLessThan(3909);
    expect(barraApto.teto).toBeGreaterThanOrEqual(35346);
    expect(getOutlierLimits("BARRA DA TIJUCA", "Casa em Condomínio").teto).toBe(nominalTeto(45856));
  });
  test("cobertura usa a calibração de apartamento, como o importador", () => {
    expect(getOutlierLimits("LEBLON", "Cobertura Duplex").teto).toBe(nominalTeto(71100));
  });
  test("sala, loja e escritório usam o par Comercial do bairro", () => {
    expect(getOutlierLimits("BARRA DA TIJUCA", "Sala Comercial")).toEqual({ piso: nominal(2258), teto: nominalTeto(49643), calibrado: true });
    expect(getOutlierLimits("BARRA DA TIJUCA", "Loja").teto).toBe(nominalTeto(49643));
    expect(getOutlierLimits("BARRA DA TIJUCA", "Escritório").teto).toBe(nominalTeto(49643));
  });
  test("tipologia sem par no bairro cai na faixa residencial do bairro, sem o Comercial", () => {
    // IPANEMA|Casa ficou fora (28 escrituras em 5 anos); o Comercial de Ipanema tem teto 155.930
    expect(OUTLIER_LIMITS_TABLE["IPANEMA|Casa"]).toBeUndefined();
    expect(getOutlierLimits("IPANEMA", "Casa")).toEqual({ piso: nominal(6413), teto: nominalTeto(84363), calibrado: true });
  });
  test("bairro sem tipologia informada: menor piso e maior teto entre Apartamento e Casa", () => {
    expect(getOutlierMinLimit("BARRA DA TIJUCA")).toBe(nominal(2020));
    expect(getOutlierLimit("BARRA DA TIJUCA")).toBe(nominalTeto(45856)); // Casa; o Comercial (49.643) não entra
  });
  test("amostra pequena: janela de 5 anos e largura mínima [mediana/2; mediana×2]", () => {
    // COELHO NETO|Apartamento: 31 escrituras, mediana 2.189 → piso 1.095 (mediana/2 < P0,5 × 0,85 = 1.294)
    expect(OUTLIER_LIMITS_TABLE["COELHO NETO|Apartamento"]).toMatchObject({ piso: 1095, janela: "5 anos" });
    // CIDADE NOVA|Apartamento: mediana 4.740 → teto 9.480 (mediana × 2 > P99,5 × 1,15 = 8.830)
    expect(OUTLIER_LIMITS_TABLE["CIDADE NOVA|Apartamento"]).toMatchObject({ teto: 9480, janela: "5 anos" });
    expect(getOutlierLimits("CIDADE NOVA", "Apartamento").teto).toBe(nominalTeto(9480));
  });
  test("Santa Cruz deixa de perder vendas: piso P0,5 em vez de P1", () => {
    const sc = OUTLIER_LIMITS_TABLE["SANTA CRUZ|Apartamento"];
    expect(sc).toMatchObject({ piso: 827, teto: 7337, janela: "3 anos" });
    expect(sc.piso).toBeLessThan(Math.round(sc.p1 * PISO_MARGIN));
    expect(getOutlierLimits("SANTA CRUZ", "Apartamento").piso).toBe(nominal(827));
  });
  test("par de amostra pequena tem limites próprios em vez de herdar o apartamento", () => {
    const casa = getOutlierLimits("COPACABANA", "Casa");
    expect(casa).toMatchObject({ calibrado: true, teto: nominalTeto(90965) });
    expect(casa).not.toEqual(getOutlierLimits("COPACABANA", "Apartamento"));
  });
  test("bairro sem calibração usa a faixa da cidade e sinaliza não calibrado", () => {
    const r = getOutlierLimits("BAIRRO INEXISTENTE", "Apartamento");
    expect(r).toEqual({ piso: DEFAULT_OUTLIER_MIN, teto: nominalTeto(FAIXA_SEM_CALIBRACAO_TETO), calibrado: false });
    expect(DEFAULT_OUTLIER_MIN).toBe(Math.round(FAIXA_SEM_CALIBRACAO_PISO / FATOR_INDICE_5_ANOS));
  });
  test("teto da busca sem bairro é o maior Apartamento/Casa da faixa de 3 anos, em preço da época", () => {
    const tetos = Object.entries(OUTLIER_LIMITS_TABLE)
      .filter(([k, e]) => /\|(Apartamento|Casa)$/.test(k) && e.janela === "3 anos")
      .map(([, e]) => e.teto);
    expect(DEFAULT_OUTLIER_MAX).toBe(nominalTeto(Math.max(...tetos)));
    expect(Math.max(...tetos)).toBe(84363); // IPANEMA|Apartamento
  });
  test("fatores do índice ficam numa faixa plausível", () => {
    expect(FATOR_INDICE_5_ANOS).toBeGreaterThanOrEqual(1);
    expect(FATOR_INDICE_5_ANOS).toBeLessThan(3);
    expect(FATOR_MIN_INDICE_5_ANOS).toBeLessThanOrEqual(1);
    expect(FATOR_MIN_INDICE_5_ANOS).toBeGreaterThan(0.5);
  });
  test("ignora acentos e caixa", () => {
    expect(normalizeBairro("Jardim Botânico")).toBe("JARDIM BOTANICO");
    expect(getOutlierLimit("jardim botânico")).toBe(nominalTeto(55064));
    expect(getOutlierLimit("Grajaú")).toBe(nominalTeto(14242));
    expect(getOutlierLimit("Freguesia (Jacarepaguá)")).toBe(nominalTeto(11443));
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
