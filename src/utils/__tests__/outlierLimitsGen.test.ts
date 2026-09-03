import { describe, expect, test } from "bun:test";
import { calcularTabelaCinto, parseCsvCalibracao, renderizarTabela } from "../../../supabase/functions/_shared/outlierLimitsGen.ts";

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
  test("par grande: janela de 3 anos com P1 × 0,85 e P99,5 × 1,15", () => {
    expect(tabela["COPACABANA|Apartamento"]).toMatchObject({ piso: 5034, teto: 24569, escrituras: 4500, janela: "3 anos", mediana: 10589 });
  });
  test("par pequeno: janela de 5 anos e largura mínima em torno da mediana", () => {
    expect(tabela["SANTA CRUZ|Apartamento"]).toMatchObject({ piso: 1534, teto: 6136, janela: "5 anos" });
  });
  test("par sem amostra fica fora; tipologia fora de Apartamento/Casa é ignorada", () => {
    expect(tabela["COPACABANA|Casa"]).toBeUndefined();
    expect(excluidos).toEqual([{ chave: "COPACABANA|Casa", escrituras3: 2, escrituras5: 2 }]);
    expect(tabela["CENTRO|Comercial"]).toBeUndefined();
  });
  test("teto global de 60.000 e chave normalizada sem acento", () => {
    expect(tabela["LEBLON|Apartamento"].teto).toBe(60000);
    const { tabela: t2 } = calcularTabelaCinto(parseCsvCalibracao("bairro,tipologia,piso_p1,mediana,teto_p995,escrituras,janela\nGLÓRIA,Apartamento,6184,7974,17461,412,3 anos\n"));
    expect(Object.keys(t2)).toEqual(["GLORIA|Apartamento"]);
  });
  test("renderização é uma linha por par, na ordem das chaves", () => {
    const linhas = renderizarTabela(tabela).split("\n");
    expect(linhas).toHaveLength(3);
    expect(linhas[0]).toBe('  "COPACABANA|Apartamento": { piso: 5034, teto: 24569, p1: 5922, p995: 21364, mediana: 10589, escrituras: 4500, janela: "3 anos" },');
  });
  test("CSV sem a coluna teto_p995 (P99 em vez de P99,5) é rejeitado", () => {
    expect(() => parseCsvCalibracao("bairro,tipologia,piso_p1,mediana,teto_p99,escrituras,janela\nX,Casa,1,2,3,4,3 anos\n")).toThrow(/teto_p995/);
  });
});
