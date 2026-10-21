import { describe, expect, it } from "bun:test";
import {
  janelaDePeriodo,
  mapearRegistro,
  mediana,
  serieMensal,
  type EscrituraMercado,
} from "../../lib/mcp/mercado";

const escritura = (dia: string, valor: number, area: number): EscrituraMercado => ({
  data_transacao: dia,
  logradouro: "AVENIDA LUCIO COSTA",
  numero: `${100 + valor}`,
  tipologia: "Apartamento",
  area_m2: area,
  valor_transacao: valor,
  valor_m2: Math.round((valor / area) * 100) / 100,
});

describe("Ferramentas de mercado por escritura (MCP)", () => {
  it("mapearRegistro devolve só imóvel, data e valor — sem dados pessoais", () => {
    const r = mapearRegistro({
      data_transacao: "2026-05-15",
      logradouro: "AVENIDA LUCIO COSTA",
      numero: "100",
      tipologia: "Apartamento",
      area_m2: "110.00",
      valor_transacao: "1320000.00",
      valor_m2: "12000.00",
    });
    expect(r).toEqual({
      data_transacao: "2026-05-15",
      logradouro: "AVENIDA LUCIO COSTA",
      numero: "100",
      tipologia: "Apartamento",
      area_m2: 110,
      valor: 1_320_000,
      valor_m2: 12000,
    });
    expect(Object.keys(r).sort()).toEqual([
      "area_m2", "data_transacao", "logradouro", "numero", "tipologia", "valor", "valor_m2",
    ]);
  });

  it("mediana cobre amostra ímpar, par e vazia", () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 2, 3])).toBe(2.5);
    expect(mediana([Number.NaN])).toBeNull();
  });

  it("serieMensal agrega mês a mês: contagem, mediana, média ponderada e totais", () => {
    const rows = [
      escritura("2026-01-15", 1_200_000, 100), // 12.000/m²
      escritura("2026-01-20", 1_320_000, 110), // 12.000/m²
      escritura("2026-01-25", 1_100_000, 100), // 11.000/m²
      escritura("2026-03-10", 2_000_000, 125), // 16.000/m²
      escritura("2025-12-30", 900_000, 90), // ano anterior, fora da série
    ];
    const meses = serieMensal(rows, 2026);
    expect(meses.map((m) => m.mes)).toEqual(["2026-01", "2026-03"]);

    const [janeiro, marco] = meses;
    expect(janeiro!.transaction_count).toBe(3);
    expect(janeiro!.med_m2).toBe(12000);
    expect(janeiro!.media_ponderada_m2).toBe(Math.round((3_620_000 / 310) * 100) / 100);
    expect(janeiro!.valor_total).toBe(3_620_000);
    expect(janeiro!.valor_medio).toBe(1_206_666.67);

    expect(marco!.transaction_count).toBe(1);
    expect(marco!.med_m2).toBe(16000);
    expect(marco!.valor_total).toBe(2_000_000);
  });

  it("serieMensal devolve meses vazios como lista vazia, com mediana nula quando falta base", () => {
    expect(serieMensal([escritura("2026-01-15", 1_000, 100)], 2025)).toEqual([]);
    const meses = serieMensal([{ ...escritura("2026-01-15", 1_000, 0), valor_m2: null }], 2026);
    expect(meses[0]!.med_m2).toBeNull();
    expect(meses[0]!.media_ponderada_m2).toBeNull();
    expect(meses[0]!.valor_total).toBe(1000);
  });

  it("janelaDePeriodo usa o ano corrente por padrão e cruza ano com datas explícitas", () => {
    const anoCorrente = new Date().getUTCFullYear();
    expect(janelaDePeriodo()).toEqual({ inicio: `${anoCorrente}-01-01`, fim: `${anoCorrente}-12-31` });
    expect(janelaDePeriodo(2025)).toEqual({ inicio: "2025-01-01", fim: "2025-12-31" });
    expect(janelaDePeriodo(2026, "2026-03-01", "2026-06-30")).toEqual({
      inicio: "2026-03-01",
      fim: "2026-06-30",
    });
  });

  it("janelaDePeriodo recusa datas soltas e período invertido", () => {
    expect(() => janelaDePeriodo(2026, "2026-03-01")).toThrow();
    expect(() => janelaDePeriodo(2026, undefined, "2026-06-30")).toThrow();
    expect(() => janelaDePeriodo(2026, "2026-06-30", "2026-03-01")).toThrow();
  });
});
