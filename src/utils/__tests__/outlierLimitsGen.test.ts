import { describe, expect, test } from "bun:test";
import { calcularTabelaCinto, calcularDefaultsCinto, parseCsvCidade, parseCsvCalibracao, renderizarTabela, renderizarSqlCinto } from "../../../supabase/functions/_shared/outlierLimitsGen.ts";

const csv = `bairro,tipologia,piso_p1,p5,mediana,p95,teto_p995,escrituras,janela
COPACABANA,Apartamento,5922,8229,10589,13384,21364,4500,3 anos
COPACABANA,Apartamento,5800,8000,10200,13000,21000,6822,5 anos
SANTA CRUZ,Apartamento,2303,3068,3068,3182,3182,85,3 anos
SANTA CRUZ,Apartamento,2303,3068,3068,3182,3182,85,5 anos
COPACABANA,Casa,8020,8020,8020,8020,8020,2,3 anos
COPACABANA,Casa,8020,8020,8020,8020,8020,2,5 anos
LEBLON,Apartamento,13222,14400,20667,32253,53625,1523,3 anos
LEBLON,Apartamento,13000,14000,20000,32000,53000,2400,5 anos
CENTRO,Comercial,1000,1000,3000,5000,6000,900,3 anos
`;

describe("geração da tabela do cinto (consulta 7.4)", () => {
  const { tabela, excluidos } = calcularTabelaCinto(parseCsvCalibracao(csv));
  test("carga preserva limites por par e faixa da cidade, sem trocar pelo teto máximo", () => {
    const sql = renderizarSqlCinto(tabela, { piso: 1072, teto: 42000, escrituras: 126446 }, "2026-10-21");
    expect(sql).toContain("('CIDADE', '*', 1072, 42000, '3 anos', 126446, '2026-10-21'::timestamptz)");
    expect(sql).toContain("('COPACABANA', 'Apartamento', 5034, 24569, '3 anos', 4500");
  });
  test("par grande: janela de 3 anos com P1 × 0,85 e P99,5 × 1,15", () => {
    expect(tabela["COPACABANA|Apartamento"]).toMatchObject({ piso: 5034, teto: 24569, escrituras: 4500, janela: "3 anos", mediana: 10589 });
  });
  test("par pequeno: janela de 5 anos e largura mínima em torno da mediana", () => {
    expect(tabela["SANTA CRUZ|Apartamento"]).toMatchObject({ piso: 1534, teto: 6136, janela: "5 anos" });
  });
  test("par com menos de 30 em 5 anos fica fora", () => {
    expect(tabela["COPACABANA|Casa"]).toBeUndefined();
    expect(excluidos).toEqual([{ chave: "COPACABANA|Casa", escrituras3: 2, escrituras5: 2 }]);
  });
  test("teto calibrado acima de 60.000 é preservado", () => {
    expect(tabela["LEBLON|Apartamento"].teto).toBe(61669);
  });
  test("chave normalizada sem acento", () => {
    const { tabela: t2 } = calcularTabelaCinto(parseCsvCalibracao("bairro,tipologia,piso_p1,mediana,teto_p995,escrituras,janela\nGLÓRIA,Apartamento,6184,7974,17461,412,3 anos\n"));
    expect(Object.keys(t2)).toEqual(["GLORIA|Apartamento"]);
  });
  test("renderização é uma linha por par, na ordem das chaves", () => {
    const linhas = renderizarTabela(tabela).split("\n");
    expect(linhas).toHaveLength(4);
    expect(linhas[0]).toStartWith('  "CENTRO|Comercial":');
    expect(linhas[1]).toBe('  "COPACABANA|Apartamento": { piso: 5034, teto: 24569, p1: 5922, p995: 21364, mediana: 10589, escrituras: 4500, janela: "3 anos" },');
  });
  test("CSV sem a coluna teto_p995 (P99 em vez de P99,5) é rejeitado", () => {
    expect(() => parseCsvCalibracao("bairro,tipologia,piso_p1,mediana,teto_p99,escrituras,janela\nX,Casa,1,2,3,4,3 anos\n")).toThrow(/teto_p995/);
  });
  test("150 escrituras em 3 anos usam a janela de 5 anos e largura 2x", () => {
    const { tabela: t } = calcularTabelaCinto(parseCsvCalibracao("bairro,tipologia,piso_p1,mediana,teto_p995,escrituras,janela\nX,Casa,2000,3000,4000,150,3 anos\nX,Casa,2000,3000,4000,210,5 anos\n"));
    expect(t["X|Casa"]).toMatchObject({ piso: 1500, teto: 6000, janela: "5 anos", escrituras: 210 });
  });
  test("200 escrituras em 3 anos usam margens 15% sem largura mínima", () => {
    const { tabela: t } = calcularTabelaCinto(parseCsvCalibracao("bairro,tipologia,piso_p1,mediana,teto_p995,escrituras,janela\nX,Casa,2000,3000,4000,200,3 anos\n"));
    expect(t["X|Casa"]).toMatchObject({ piso: 1700, teto: 4600, janela: "3 anos" });
  });
  test("piso abaixo de 1.000 é preservado até o mínimo 500", () => {
    const { tabela: t } = calcularTabelaCinto(parseCsvCalibracao("bairro,tipologia,piso_p1,mediana,teto_p995,escrituras,janela\nBANGU,Casa,631,2000,5000,300,3 anos\nX,Casa,500,2000,5000,300,3 anos\n"));
    expect(t["BANGU|Casa"].piso).toBe(536);
    expect(t["X|Casa"].piso).toBe(500);
  });
  test("teto limitado apenas pela ingestão de 300.000", () => {
    const { tabela: t } = calcularTabelaCinto(parseCsvCalibracao("bairro,tipologia,piso_p1,mediana,teto_p995,escrituras,janela\nX,Comercial,1000,5000,300000,300,3 anos\n"));
    expect(t["X|Comercial"].teto).toBe(300000);
  });
  test("Comercial recebe calibração própria", () => {
    expect(tabela["CENTRO|Comercial"]).toMatchObject({ piso: 850, teto: 6900, janela: "3 anos" });
  });
  test("faixa da cidade vem do CSV e teto padrão ignora Comercial", () => {
    const cidade = parseCsvCidade("piso_cidade,teto_cidade,escrituras\n1072,42000,126446\n");
    expect(calcularDefaultsCinto({ ...tabela, "X|Comercial": { piso: 500, teto: 300000, p1: 500, p995: 300000, escrituras: 300 } }, cidade))
      .toEqual({ pisoCidade: 1072, tetoCidade: 42000, minimo: 1072, maximo: 61669 });
  });
});
