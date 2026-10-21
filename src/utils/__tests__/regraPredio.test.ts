import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classificarEscritura, REGRA_PREDIO } from "../../lib/outlierLimits";

const faixa = { piso: 3000, teto: 30000 };
const sem = { n: 0, mediana: null };

describe("regras por prédio do cinto (itbi_aplicar_cinto)", () => {
  test("venda por metade ou menos do prédio, com a mesma área, sai como fora de mercado", () => {
    // 119 m² no Leme por R$ 68 mil: R$ 571/m² contra R$ 13 mil/m² do prédio
    expect(classificarEscritura(571, faixa, { n: 10, mediana: 13000 }, { n: 10, mediana: 13000 }).situacao).toBe("fora_de_mercado");
  });
  test("fora de mercado vale também dentro do cinto", () => {
    // R$ 4.000/m² está dentro da faixa do bairro, mas é 40% do prédio
    expect(classificarEscritura(4000, faixa, { n: 5, mediana: 10000 }, { n: 5, mediana: 10000 }).situacao).toBe("fora_de_mercado");
  });
  test("o limite de 50% é inclusivo e 51% passa", () => {
    expect(classificarEscritura(5000, faixa, { n: 3, mediana: 10000 }, sem).situacao).toBe("fora_de_mercado");
    expect(classificarEscritura(5100, faixa, { n: 3, mediana: 10000 }, sem).situacao).toBe("aceita");
  });
  test("com uma só referência de área parecida a regra não decide", () => {
    expect(classificarEscritura(4000, faixa, { n: 1, mediana: 10000 }, sem).situacao).toBe("aceita");
  });
  test("acima do teto, coerente com o próprio prédio, é exceção", () => {
    // prédio caro para o bairro: vizinhas a R$ 25 mil/m², venda a R$ 33 mil/m² (1,32 vez)
    expect(classificarEscritura(33000, faixa, sem, { n: 4, mediana: 25000 })).toEqual({ situacao: "aceita", excecaoPredio: true });
  });
  test("acima do teto e longe do próprio prédio continua cortada", () => {
    // negócio em bloco: 2,4 vezes o prédio
    expect(classificarEscritura(60000, faixa, sem, { n: 30, mediana: 25000 }).situacao).toBe("fora_do_cinto");
  });
  test("a exceção não vale abaixo do piso", () => {
    expect(classificarEscritura(2500, faixa, sem, { n: 4, mediana: 2800 }).situacao).toBe("fora_do_cinto");
  });
  test("sem referências o cinto decide sozinho", () => {
    expect(classificarEscritura(31000, faixa, sem, sem).situacao).toBe("fora_do_cinto");
    expect(classificarEscritura(12000, faixa, sem, sem).situacao).toBe("aceita");
  });
  test("a migration usa as mesmas constantes do código", () => {
    const sql = readFileSync(join(import.meta.dir, "../../../supabase/migrations/20261021230000_itbi_cinto_regras_predio.sql"), "utf8");
    const constante = (nome: string) => {
      const m = sql.match(new RegExp(`${nome}\\s+constant\\s+\\w+\\s*:=\\s*([0-9.]+)`));
      if (!m) throw new Error(`constante ${nome} não encontrada na migration`);
      return Number(m[1]);
    };
    expect(constante("c_fator_fora_mercado")).toBe(REGRA_PREDIO.FATOR_FORA_MERCADO);
    expect(constante("c_tolerancia_area")).toBe(REGRA_PREDIO.TOLERANCIA_AREA);
    expect(constante("c_min_referencias")).toBe(REGRA_PREDIO.MIN_REFERENCIAS);
    expect(constante("c_excecao_min")).toBe(REGRA_PREDIO.EXCECAO_MIN);
    expect(constante("c_excecao_max")).toBe(REGRA_PREDIO.EXCECAO_MAX);
  });
  test("a migration preserva assinatura, permissões e o motivo novo", () => {
    const sql = readFileSync(join(import.meta.dir, "../../../supabase/migrations/20261021230000_itbi_cinto_regras_predio.sql"), "utf8");
    expect(sql).toContain("public.itbi_aplicar_cinto(p_inicio date, p_fim date, p_bairro text DEFAULT NULL, p_aplicar boolean DEFAULT false)");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("has_role(auth.uid(),'admin'::public.app_role)");
    expect(sql).toContain("motivo_rejeicao IN ('fora_do_cinto','fora_de_mercado')");
    expect(sql).not.toMatch(/DELETE FROM public\.itbi_escrituras/i);
  });
});
