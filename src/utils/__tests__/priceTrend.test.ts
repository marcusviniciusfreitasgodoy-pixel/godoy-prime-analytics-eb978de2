import { describe, expect, test } from "bun:test";
import { fitLogGrowth, FALLBACK_BAND_PP, MAX_BAND_LOG } from "../priceTrend";

describe("fitLogGrowth", () => {
  test("menos de dois anos: sem tendência", () => {
    const f = fitLogGrowth([{ ano: 2024, valor: 10000 }]);
    expect(f.method).toBe("insuficiente");
    expect(f.rate).toBe(0);
  });

  test("dois anos: taxa entre os pontos e banda fixa de ±3 p.p.", () => {
    const f = fitLogGrowth([
      { ano: 2023, valor: 10000 },
      { ano: 2025, valor: 12100 },
    ]);
    expect(f.method).toBe("dois_pontos");
    expect(f.rate).toBeCloseTo(0.1, 6); // 10% a.a. composto
    expect(f.rateHigh).toBeCloseTo((1 + f.rate) * (1 + FALLBACK_BAND_PP / 100) - 1, 6);
  });

  test("série geométrica perfeita: taxa exata e intervalo colapsado", () => {
    const f = fitLogGrowth([2021, 2022, 2023, 2024, 2025].map((ano, i) => ({ ano, valor: 10000 * 1.05 ** i })));
    expect(f.method).toBe("regressao_log");
    expect(f.rate).toBeCloseTo(0.05, 6);
    expect(f.se).toBeCloseTo(0, 6);
    expect(f.rateLow).toBeCloseTo(0.05, 4);
    expect(f.rateHigh).toBeCloseTo(0.05, 4);
  });

  test("um ano atípico na ponta não domina a tendência como na reta entre dois pontos", () => {
    const pontos = [
      { ano: 2021, valor: 10000 },
      { ano: 2022, valor: 10300 },
      { ano: 2023, valor: 10600 },
      { ano: 2024, valor: 10900 },
      { ano: 2025, valor: 14000 }, // salto atípico
    ];
    const f = fitLogGrowth(pontos);
    const retaDoisPontos = ((14000 - 10000) / 10000) * 100 / 4; // 10% a.a. como o motor antigo
    expect(f.rate * 100).toBeLessThan(retaDoisPontos);
    expect(f.rateHigh).toBeGreaterThan(f.rate);
    expect(f.rateLow).toBeLessThan(f.rate);
  });

  test("banda limitada mesmo com erro padrão enorme", () => {
    const f = fitLogGrowth([
      { ano: 2023, valor: 10000 },
      { ano: 2024, valor: 30000 },
      { ano: 2025, valor: 9000 },
    ]);
    expect(Math.log(1 + f.rateHigh) - f.slope).toBeLessThanOrEqual(MAX_BAND_LOG + 1e-9);
  });

  test("ignora valores zero", () => {
    const f = fitLogGrowth([
      { ano: 2022, valor: 0 },
      { ano: 2023, valor: 10000 },
      { ano: 2024, valor: 11000 },
      { ano: 2025, valor: 12100 },
    ]);
    expect(f.n).toBe(3);
    expect(f.rate).toBeCloseTo(0.1, 6);
  });
});
