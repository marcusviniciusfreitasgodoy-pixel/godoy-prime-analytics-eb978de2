import { describe, expect, it } from "bun:test";
import { decidirCargaArcgis, fimDoMes, inicioDoMes, periodoCobertoPelaSmf } from "../../../supabase/functions/_shared/itbiFonte.ts";

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
