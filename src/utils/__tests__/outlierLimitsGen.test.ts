import { describe, expect, test } from "bun:test";
import {
  calcularTabelaCinto,
  calcularDefaultsCinto,
  parseCsvCidade,
  parseCsvCalibracao,
  renderizarConstantes,
  renderizarTabela,
  renderizarSqlCinto,
} from "../../../supabase/functions/_shared/outlierLimitsGen.ts";

const CAB = "bairro,tipologia,piso_p05,piso_p1,p5,mediana,p95,teto_p995,escrituras,janela";
const csv = `${CAB}
COPACABANA,Apartamento,4261,4956,6500,11313,20000,35533,8386,3 anos
COPACABANA,Apartamento,4200,4900,6400,11000,19800,35000,13000,5 anos
SANTA CRUZ,Apartamento,2000,2303,2500,3068,3150,3182,85,3 anos
SANTA CRUZ,Apartamento,2000,2303,2500,3068,3150,3182,120,5 anos
COPACABANA,Casa,8020,8020,8020,8020,8020,8020,2,3 anos
COPACABANA,Casa,8020,8020,8020,8020,8020,8020,2,5 anos
LEBLON,Apartamento,10023,11120,13000,21958,40000,61826,2400,3 anos
CENTRO,Comercial,900,1000,1100,3000,5000,6000,900,3 anos
DESCONHECIDO,Apartamento,700,800,1000,5000,15000,30000,5000,3 anos
`;

const CAB_CIDADE = "piso_cidade,teto_cidade,escrituras,fator_indice_5_anos,fator_min_indice_5_anos";
const cidadeCsv = `${CAB_CIDADE}\n907,42013,126381,1.1721,0.9667\n`;

describe("geração da tabela do cinto (consulta 7.4)", () => {
  const { tabela, excluidos } = calcularTabelaCinto(parseCsvCalibracao(csv));

  test("par grande: janela de 3 anos com P0,5 × 0,85 e P99,5 × 1,15", () => {
    expect(tabela["COPACABANA|Apartamento"]).toMatchObject({
      piso: 3622, teto: 40863, p05: 4261, p1: 4956, escrituras: 8386, janela: "3 anos", mediana: 11313,
    });
  });
  test("o piso usa P0,5, não P1", () => {
    expect(tabela["LEBLON|Apartamento"].piso).toBe(Math.round(10023 * 0.85));
    expect(tabela["LEBLON|Apartamento"].piso).not.toBe(Math.round(11120 * 0.85));
  });
  test("par pequeno: janela de 5 anos e largura mínima em torno da mediana", () => {
    // min(2000 × 0,85; 3068 / 2) = 1534; max(3182 × 1,15; 3068 × 2) = 6136
    expect(tabela["SANTA CRUZ|Apartamento"]).toMatchObject({ piso: 1534, teto: 6136, janela: "5 anos", escrituras: 120 });
  });
  test("par pequeno com P0,5 × 0,85 abaixo de mediana / 2 fica com o P0,5", () => {
    const { tabela: t } = calcularTabelaCinto(parseCsvCalibracao(`${CAB}\nX,Casa,1000,1100,1500,3000,5000,6000,60,5 anos\n`));
    expect(t["X|Casa"]).toMatchObject({ piso: 850, teto: 6900, janela: "5 anos" });
  });
  test("par com menos de 30 em 5 anos fica fora", () => {
    expect(tabela["COPACABANA|Casa"]).toBeUndefined();
    expect(excluidos).toEqual([{ chave: "COPACABANA|Casa", escrituras3: 2, escrituras5: 2 }]);
  });
  test("bairro DESCONHECIDO não recebe cinto, mesmo com amostra grande", () => {
    expect(Object.keys(tabela).some((k) => k.startsWith("DESCONHECIDO|"))).toBe(false);
  });
  test("teto calibrado acima de 60.000 é preservado", () => {
    expect(tabela["LEBLON|Apartamento"].teto).toBe(71100);
  });
  test("chave normalizada sem acento", () => {
    const { tabela: t2 } = calcularTabelaCinto(parseCsvCalibracao(`${CAB}\nGLÓRIA,Apartamento,6000,6184,6500,7974,15000,17461,412,3 anos\n`));
    expect(Object.keys(t2)).toEqual(["GLORIA|Apartamento"]);
  });
  test("renderização é uma linha por par, na ordem das chaves, com p05", () => {
    const linhas = renderizarTabela(tabela).split("\n");
    expect(linhas).toHaveLength(4);
    expect(linhas[0]).toStartWith('  "CENTRO|Comercial":');
    expect(linhas[1]).toBe(
      '  "COPACABANA|Apartamento": { piso: 3622, teto: 40863, p05: 4261, p1: 4956, p995: 35533, mediana: 11313, escrituras: 8386, janela: "3 anos" },'
    );
  });
  test("CSV sem a coluna piso_p05 (consulta antiga, com P1) é rejeitado", () => {
    expect(() => parseCsvCalibracao("bairro,tipologia,piso_p1,mediana,teto_p995,escrituras,janela\nX,Casa,1,2,3,4,3 anos\n")).toThrow(/piso_p05/);
  });
  test("CSV sem a coluna teto_p995 (P99 em vez de P99,5) é rejeitado", () => {
    expect(() => parseCsvCalibracao("bairro,tipologia,piso_p05,piso_p1,mediana,teto_p99,escrituras,janela\nX,Casa,1,1,2,3,4,3 anos\n")).toThrow(/teto_p995/);
  });
  test("150 escrituras em 3 anos usam a janela de 5 anos e largura 2x", () => {
    const { tabela: t } = calcularTabelaCinto(parseCsvCalibracao(`${CAB}\nX,Casa,2000,2100,2500,3000,3800,4000,150,3 anos\nX,Casa,2000,2100,2500,3000,3800,4000,210,5 anos\n`));
    expect(t["X|Casa"]).toMatchObject({ piso: 1500, teto: 6000, janela: "5 anos", escrituras: 210 });
  });
  test("200 escrituras em 3 anos usam margens 15% sem largura mínima", () => {
    const { tabela: t } = calcularTabelaCinto(parseCsvCalibracao(`${CAB}\nX,Casa,2000,2100,2500,3000,3800,4000,200,3 anos\n`));
    expect(t["X|Casa"]).toMatchObject({ piso: 1700, teto: 4600, janela: "3 anos" });
  });
  test("piso abaixo de 1.000 é preservado até o mínimo 500 da ingestão", () => {
    const { tabela: t } = calcularTabelaCinto(parseCsvCalibracao(`${CAB}\nBANGU,Casa,631,700,900,2000,4000,5000,300,3 anos\nX,Casa,500,550,900,2000,4000,5000,300,3 anos\n`));
    expect(t["BANGU|Casa"].piso).toBe(536);
    expect(t["X|Casa"].piso).toBe(500);
  });
  test("teto limitado apenas pela ingestão de 300.000", () => {
    const { tabela: t } = calcularTabelaCinto(parseCsvCalibracao(`${CAB}\nX,Comercial,1000,1100,2000,5000,100000,300000,300,3 anos\n`));
    expect(t["X|Comercial"].teto).toBe(300000);
  });
  test("Comercial recebe calibração própria", () => {
    expect(tabela["CENTRO|Comercial"]).toMatchObject({ piso: 765, teto: 6900, janela: "3 anos" });
  });
});

describe("faixa da cidade e constantes (consulta 7.4b)", () => {
  const { tabela } = calcularTabelaCinto(parseCsvCalibracao(csv));
  const cidade = parseCsvCidade(cidadeCsv);

  test("faixa e fator vêm do CSV", () => {
    expect(cidade).toEqual({ piso: 907, teto: 42013, escrituras: 126381, fatorIndice5Anos: 1.1721, fatorMinIndice5Anos: 0.9667 });
  });
  test("CSV sem fator_indice_5_anos é rejeitado", () => {
    expect(() => parseCsvCidade("piso_cidade,teto_cidade,escrituras\n907,42013,126381\n")).toThrow(/fator_indice_5_anos/);
  });
  test("CSV sem fator_min_indice_5_anos (consulta 7.4b antiga) é rejeitado", () => {
    expect(() => parseCsvCidade("piso_cidade,teto_cidade,escrituras,fator_indice_5_anos\n907,42013,126381,1.1721\n")).toThrow(/fator_min_indice_5_anos/);
  });
  test("maior fator abaixo de 1 é rejeitado (o trimestre mais barato nunca custa mais que o último)", () => {
    expect(() => parseCsvCidade(`${CAB_CIDADE}\n907,42013,126381,0.9,0.9\n`)).toThrow(/fator_indice_5_anos fora/);
  });
  test("menor fator acima de 1 é rejeitado (o próprio último trimestre está na janela)", () => {
    expect(() => parseCsvCidade(`${CAB_CIDADE}\n907,42013,126381,1.1721,1.05\n`)).toThrow(/fator_min_indice_5_anos fora/);
  });
  test("padrões saem em preço da época e o teto só olha Apartamento/Casa da faixa de 3 anos", () => {
    const comExtras = {
      ...tabela,
      "X|Comercial": { piso: 500, teto: 300000, p05: 500, p1: 500, p995: 300000, mediana: 5000, escrituras: 300, janela: "3 anos" as const },
      "Y|Casa": { piso: 1000, teto: 90965, p05: 1200, p1: 1800, p995: 79100, mediana: 11661, escrituras: 60, janela: "5 anos" as const },
    };
    expect(calcularDefaultsCinto(comExtras, cidade)).toEqual({
      pisoCidade: 907, tetoCidade: 42013, fator: 1.1721, fatorMin: 0.9667, tetoResidencial: 71100,
      minimo: Math.round(907 / 1.1721), maximo: Math.round(71100 / 0.9667),
    });
  });
  test("sem par residencial da faixa padrão, a geração para", () => {
    expect(() => calcularDefaultsCinto({ "CENTRO|Comercial": tabela["CENTRO|Comercial"] }, cidade)).toThrow(/faixa padrão/);
  });
  test("bloco de constantes traz faixa, fator e padrões", () => {
    const bloco = renderizarConstantes(calcularDefaultsCinto(tabela, cidade), {
      data: "2026-10-21", pares: 4, excluidos: 1, csv74: "a.csv", csv74b: "b.csv", escrituras: 126381,
    });
    expect(bloco).toContain("export const FAIXA_SEM_CALIBRACAO_PISO = 907;");
    expect(bloco).toContain("export const FAIXA_SEM_CALIBRACAO_TETO = 42013;");
    expect(bloco).toContain("export const FATOR_INDICE_5_ANOS = 1.1721;");
    expect(bloco).toContain("export const FATOR_MIN_INDICE_5_ANOS = 0.9667;");
    expect(bloco).toContain("export const DEFAULT_OUTLIER_MIN = 774;");
    expect(bloco).toContain("export const DEFAULT_OUTLIER_MAX = 73549;");
  });
  test("carga da itbi_cinto preserva limites por par e grava a faixa da cidade como CIDADE|*", () => {
    const sql = renderizarSqlCinto(tabela, cidade, "2026-10-21");
    expect(sql).toContain("TRUNCATE TABLE public.itbi_cinto;");
    expect(sql).toContain("('CIDADE', '*', 907, 42013, '3 anos', 126381, '2026-10-21'::timestamptz)");
    expect(sql).toContain("('COPACABANA', 'Apartamento', 3622, 40863, '3 anos', 8386");
    expect(sql).toContain("('SANTA CRUZ', 'Apartamento', 1534, 6136, '5 anos', 120");
  });
});
