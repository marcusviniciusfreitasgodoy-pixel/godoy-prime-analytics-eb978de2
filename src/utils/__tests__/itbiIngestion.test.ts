import { describe, expect, test } from "bun:test";
import { LIMITES_INGESTAO, validarFeatureItbi } from "../../../supabase/functions/_shared/itbiIngestion.ts";

describe("validarFeatureItbi (regras de aceitação da carga)", () => {
  test("aceita mercado barato da periferia: 40 m² a R$ 96 mil (Inhoaíba, Santa Cruz)", () => {
    const r = validarFeatureItbi({ valor: 96000, area: 40, logradouro: "RUA X", totalTransacoes: 3, percentualTransferido: 100 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.feature.valorM2).toBe(2400);
      expect(r.feature.totalTransacoes).toBe(3);
    }
  });
  test("piso de valor é R$ 30 mil, não mais R$ 100 mil", () => {
    expect(LIMITES_INGESTAO.valorMin).toBe(30000);
    expect(validarFeatureItbi({ valor: 29999, area: 30, logradouro: "RUA X" }).ok).toBe(false);
    expect(validarFeatureItbi({ valor: 30000, area: 30, logradouro: "RUA X" }).ok).toBe(true);
  });
  test("erro de digitação continua barrado pelas faixas de área e de R$/m²", () => {
    expect(validarFeatureItbi({ valor: 500000, area: 10, logradouro: "RUA X" })).toEqual({ ok: false, motivo: "fora_da_faixa" });
    expect(validarFeatureItbi({ valor: 5000, area: 40, logradouro: "RUA X" })).toEqual({ ok: false, motivo: "fora_da_faixa" }); // 125 R$/m²
    expect(validarFeatureItbi({ valor: 50_000_000, area: 100, logradouro: "RUA X" })).toEqual({ ok: false, motivo: "fora_da_faixa" }); // 500 mil R$/m²
  });
  test("percentual transferido abaixo de 90 é rejeitado antes das faixas; omitido vale 100", () => {
    expect(validarFeatureItbi({ valor: 500000, area: 60, logradouro: "RUA X", percentualTransferido: 50 })).toEqual({ ok: false, motivo: "percentual" });
    const r = validarFeatureItbi({ valor: 500000, area: 60, logradouro: "RUA X" });
    expect(r.ok && r.feature.percentualTransferido).toBe(100);
  });
  test("dados obrigatórios ausentes", () => {
    expect(validarFeatureItbi({ valor: null, area: 60, logradouro: "RUA X" })).toEqual({ ok: false, motivo: "dados_invalidos" });
    expect(validarFeatureItbi({ valor: 500000, area: 60, logradouro: "" })).toEqual({ ok: false, motivo: "dados_invalidos" });
  });
  test("peso omitido ou fracionário vira inteiro >= 1", () => {
    const a = validarFeatureItbi({ valor: 500000, area: 60, logradouro: "RUA X" });
    const b = validarFeatureItbi({ valor: 500000, area: 60, logradouro: "RUA X", totalTransacoes: 2.6 });
    expect(a.ok && a.feature.totalTransacoes).toBe(1);
    expect(b.ok && b.feature.totalTransacoes).toBe(3);
  });
});
