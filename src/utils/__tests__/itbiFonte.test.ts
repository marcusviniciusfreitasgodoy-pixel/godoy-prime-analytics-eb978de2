import { describe, expect, it } from "bun:test";
import { decidirCargaArcgis, fimDoMes, inicioDoMes, janelasTrimestrais, periodoCobertoPelaSmf } from "../../../supabase/functions/_shared/itbiFonte.ts";

describe("fimDoMes / inicioDoMes", () => {
  it("usa o último dia real do mês (nunca 31 fixo)", () => {
    expect(fimDoMes(2026, 2)).toBe("2026-02-28");
    expect(fimDoMes(2024, 2)).toBe("2024-02-29");
    expect(fimDoMes(2026, 9)).toBe("2026-09-30");
    expect(fimDoMes(2025, 12)).toBe("2025-12-31");
  });

  it("monta o primeiro dia com zero à esquerda", () => {
    expect(inicioDoMes(2026, 1)).toBe("2026-01-01");
  });
});

describe("decidirCargaArcgis", () => {
  it("libera quando o período não tem linhas da SMF", () => {
    expect(decidirCargaArcgis(0, false)).toEqual({ bloquear: false, motivo: null });
  });

  it("bloqueia quando o período já foi consolidado a partir da SMF", () => {
    const d = decidirCargaArcgis(1234, false);
    expect(d.bloquear).toBe(true);
    expect(d.motivo).toContain("1234");
    expect(d.motivo).toContain("force: true");
  });

  it("libera com force mesmo havendo linhas da SMF", () => {
    expect(decidirCargaArcgis(1234, true).bloquear).toBe(false);
  });
});

describe("periodoCobertoPelaSmf", () => {
  const clienteFalso = (resposta: { count: number | null; error: { message: string } | null }) => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            lte: async () => resposta,
          }),
        }),
      }),
    }),
  });

  it("devolve a contagem do banco", async () => {
    expect(await periodoCobertoPelaSmf(clienteFalso({ count: 42, error: null }), "2025-01-01", "2025-12-31")).toBe(42);
  });

  it("devolve 0 quando a coluna fonte ainda não existe (migration não aplicada)", async () => {
    const n = await periodoCobertoPelaSmf(
      clienteFalso({ count: null, error: { message: 'column "fonte" does not exist' } }),
      "2025-01-01",
      "2025-12-31"
    );
    expect(n).toBe(0);
  });
});

describe("janelas trimestrais da consolidação", () => {
  it("ano fechado vira quatro trimestres com o último dia real de cada um", () => {
    expect(janelasTrimestrais(2024, { ano: 2024, mes: 12 })).toEqual([
      { inicio: "2024-01-01", fim: "2024-03-31", rotulo: "1º trimestre de 2024" },
      { inicio: "2024-04-01", fim: "2024-06-30", rotulo: "2º trimestre de 2024" },
      { inicio: "2024-07-01", fim: "2024-09-30", rotulo: "3º trimestre de 2024" },
      { inicio: "2024-10-01", fim: "2024-12-31", rotulo: "4º trimestre de 2024" },
    ]);
  });
  it("o último ano para no último mês com dado", () => {
    const j = janelasTrimestrais(2025, { ano: 2026, mes: 8 });
    expect(j).toHaveLength(7);
    expect(j[6]).toEqual({ inicio: "2026-07-01", fim: "2026-08-31", rotulo: "3º trimestre de 2026" });
  });
  it("mês no início do trimestre gera janela de um mês", () => {
    expect(janelasTrimestrais(2026, { ano: 2026, mes: 4 }).at(-1)).toEqual({ inicio: "2026-04-01", fim: "2026-04-30", rotulo: "2º trimestre de 2026" });
  });
  it("cobre todos os dias sem buraco nem sobreposição", () => {
    const j = janelasTrimestrais(2019, { ano: 2026, mes: 9 });
    expect(j).toHaveLength(31);
    for (let i = 1; i < j.length; i++) {
      const fimAnterior = new Date(`${j[i - 1].fim}T00:00:00Z`);
      fimAnterior.setUTCDate(fimAnterior.getUTCDate() + 1);
      expect(fimAnterior.toISOString().slice(0, 10)).toBe(j[i].inicio);
    }
  });
});
