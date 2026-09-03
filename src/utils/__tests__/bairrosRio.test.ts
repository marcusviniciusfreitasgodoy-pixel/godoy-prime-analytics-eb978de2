import { describe, expect, test } from "bun:test";
import { BAIRROS_RIO, codigoBairro, resolverNomeBairro } from "../../../supabase/functions/_shared/bairrosRio.ts";

describe("resolverNomeBairro (grafia gravada na base)", () => {
  test("sem acento e em qualquer caixa vira a grafia oficial com acento", () => {
    expect(resolverNomeBairro("barra olimpica")).toBe("BARRA OLÍMPICA");
    expect(resolverNomeBairro("Jacarepagua")).toBe("JACAREPAGUÁ");
    expect(resolverNomeBairro("  freguesia (jacarepagua) ")).toBe("FREGUESIA (JACAREPAGUÁ)");
    expect(resolverNomeBairro("GLÓRIA")).toBe("GLÓRIA");
  });
  test("bairro fora da lista passa em maiúsculas, sem quebrar a consulta", () => {
    expect(resolverNomeBairro("bairro inventado")).toBe("BAIRRO INVENTADO");
    expect(resolverNomeBairro(null)).toBe("");
  });
  test("lista tem os 157 bairros da API e códigos únicos", () => {
    expect(BAIRROS_RIO).toHaveLength(157);
    expect(new Set(BAIRROS_RIO.map(([c]) => c)).size).toBe(157);
    expect(codigoBairro("Barra da Tijuca")).toBe("128");
    expect(codigoBairro("Barra Olímpica")).toBe("165");
    expect(codigoBairro("Atlântida")).toBeNull();
  });
});
