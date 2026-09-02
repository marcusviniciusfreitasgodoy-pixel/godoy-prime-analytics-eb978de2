import { describe, expect, test } from "bun:test";
import {
  buildMarketWindow,
  calculateITBIData,
  collectBairros,
  computeIQRBounds,
  mapTipoImovelToTipologia,
  selectWindowRows,
  type MarketRow,
} from "../itbiMarketStats";
import { getOutlierLimit, getOutlierMinLimit, normalizeBairro } from "../../lib/outlierLimits";

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
    const closed = [row(10000, 2, "2024-03-15")];
    const sel = selectWindowRows(closed, w);
    expect(sel.anoCorrenteIncluido).toBe(false);
  });
});

describe("computeIQRBounds", () => {
  test("precisa de quatro valores", () => {
    expect(computeIQRBounds([1, 2, 3])).toBeNull();
  });
  test("aplica a banda mínima de 20% quando o IQR colapsa", () => {
    const b = computeIQRBounds([10000, 10000, 10000, 10000])!;
    expect(b.lower).toBeCloseTo(10000 - 1.5 * 2000);
    expect(b.upper).toBeCloseTo(10000 + 1.5 * 2000);
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

  test("IQR descarta um agregado extremo e registra nos metadados", () => {
    const rows = [
      row(10000, 5),
      row(10500, 5),
      row(11000, 5),
      row(11500, 5),
      row(60000, 1), // outlier
    ];
    const r = calculateITBIData(rows, { method: "iqr", meta: baseMeta, now: new Date("2026-09-02T00:00:00Z") })!;
    expect(r.max_m2).toBe(11500);
    expect(r.meta?.linhas_agregadas).toBe(5);
    expect(r.meta?.linhas_descartadas).toBe(1);
    expect(r.meta?.escrituras_validas).toBe(20);
    expect(r.meta?.outlier_method).toBe("iqr");
    expect(r.meta?.engine_version).toBe(2);
    expect(r.meta?.calculado_em).toBe("2026-09-02T00:00:00.000Z");
  });

  test("percentil usa P10/P90 como mínimo e máximo e mantém a mediana", () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(10000 + i * 1000, 1));
    const r = calculateITBIData(rows, { method: "percentile", meta: baseMeta })!;
    expect(r.min_m2).toBe(11000);
    expect(r.max_m2).toBe(19000);
    expect(r.med_m2).toBe(14500);
    expect(r.meta?.linhas_descartadas).toBe(0);
  });

  test("amostra menor que quatro não aplica corte", () => {
    const r = calculateITBIData([row(9000, 1), row(30000, 1)], { method: "iqr", meta: baseMeta })!;
    expect(r.min_m2).toBe(9000);
    expect(r.max_m2).toBe(30000);
    expect(r.meta?.outlier_method).toBe("none");
  });

  test("é determinístico para a mesma entrada", () => {
    const rows = [row(12000, 3), row(15000, 2), row(9000, 4), row(18000, 1), row(14000, 6)];
    const a = calculateITBIData(rows, { method: "iqr", meta: baseMeta, now: new Date(0) });
    const b = calculateITBIData([...rows].reverse(), { method: "iqr", meta: baseMeta, now: new Date(0) });
    expect(a).toEqual(b);
  });
});

describe("outlierLimits", () => {
  test("teto e piso por bairro, com padrão para desconhecidos", () => {
    expect(getOutlierLimit("LEBLON")).toBe(80000);
    expect(getOutlierMinLimit("LEBLON")).toBe(10000);
    expect(getOutlierLimit("BAIRRO INEXISTENTE")).toBe(60000);
    expect(getOutlierMinLimit("BAIRRO INEXISTENTE")).toBe(2500);
  });
  test("ignora acentos e caixa", () => {
    expect(normalizeBairro("Jardim Botânico")).toBe("JARDIM BOTANICO");
    expect(getOutlierLimit("jardim botânico")).toBe(50000);
    expect(getOutlierLimit("Grajaú")).toBe(20000);
  });
});

describe("collectBairros", () => {
  test("lista bairros distintos ordenados", () => {
    const rows = [row(1, 1, "2024-01-15", { bairro: "recreio dos bandeirantes" }), row(1, 1, "2024-01-15"), row(1, 1, "2024-01-15", { bairro: null })];
    expect(collectBairros(rows)).toEqual(["BARRA DA TIJUCA", "RECREIO DOS BANDEIRANTES"]);
  });
});
