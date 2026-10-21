import { describe, expect, test } from "bun:test";
import {
  aplicarGeocodificacao,
  classificarTipologia,
  classificarUso,
  clNormalizado,
  conferirEscritura,
  ehArquivoRecente,
  type EscrituraSmf,
  lerPlanilhaSmf,
  limparTexto,
  linksDaPagina,
  type LinhaSmf,
  nomeBairro,
  nomeLogradouro,
  normalizarEscrituras,
  type Porta,
} from "../../../supabase/functions/_shared/itbiSmf.ts";

// ---------------------------------------------------------------------------
// xlsx mínimo em memória (zip sem compressão), no formato que a SMF exporta
// ---------------------------------------------------------------------------
const zip = (arquivos: Record<string, string>): Uint8Array => {
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const le = (n: number, bytes: number) => { const b = new Uint8Array(bytes); for (let i = 0; i < bytes; i++) b[i] = (n >>> (8 * i)) & 0xff; return b; };
  const junta = (...xs: Uint8Array[]) => { const t = new Uint8Array(xs.reduce((s, x) => s + x.length, 0)); let p = 0; for (const x of xs) { t.set(x, p); p += x.length; } return t; };
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    const n = enc.encode(nome), d = enc.encode(conteudo);
    const local = junta(le(0x04034b50, 4), le(20, 2), le(0, 2), le(0, 2), le(0, 4), le(0, 4), le(d.length, 4), le(d.length, 4), le(n.length, 2), le(0, 2), n, d);
    central.push(junta(le(0x02014b50, 4), le(20, 2), le(20, 2), le(0, 2), le(0, 2), le(0, 4), le(0, 4), le(d.length, 4), le(d.length, 4),
      le(n.length, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 4), le(offset, 4), n));
    partes.push(local);
    offset += local.length;
  }
  const cd = junta(...central);
  const eocd = junta(le(0x06054b50, 4), le(0, 2), le(0, 2), le(central.length, 2), le(central.length, 2), le(cd.length, 4), le(offset, 4), le(0, 2));
  return junta(...partes, cd, eocd);
};

const COLS = ["ano", "mes", "ano_texto", "mes_texto", "regiao_fiscal", "CD_BAIRRO", "cl", "trecho", "cod_tipologia", "id_utilizacao",
  "numero", "COMPLEMENTO", "nm_bairro_norm", "logradouro", "ds_imovel_tipologia", "DESCRICAO", "parte_transferida", "valor_transacoes", "area", "valor_m2"];

/** Monta a planilha: strings vão para sharedStrings (como a SMF faz), números ficam na célula. */
const planilha = (linhas: (string | number)[][]): Uint8Array => {
  const strings: string[] = [];
  const idx = (s: string) => { let i = strings.indexOf(s); if (i < 0) { strings.push(s); i = strings.length - 1; } return i; };
  const letra = (i: number) => String.fromCharCode(65 + i);
  const linhaXml = (vals: (string | number)[], r: number) =>
    `<row r="${r}" spans="1:20">` + vals.map((v, i) => typeof v === "number"
      ? `<c r="${letra(i)}${r}" s="1"><v>${v}</v></c>`
      : `<c r="${letra(i)}${r}" t="s"><v>${idx(v)}</v></c>`).join("") + "</row>";
  const corpo = [COLS, ...linhas].map((l, i) => linhaXml(l, i + 1)).join("");
  return zip({
    "xl/sharedStrings.xml": `<?xml version="1.0"?><sst>${strings.map((s) => `<si><t>${s}</t></si>`).join("")}</sst>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0"?><worksheet><sheetData>${corpo}</sheetData></worksheet>`,
  });
};

const linha = (o: Partial<Record<string, string | number>>): (string | number)[] => {
  const base: Record<string, string | number> = {
    ano: 2025, mes: 1, ano_texto: "_x0032_025", mes_texto: "_x0030_1", regiao_fiscal: "C", CD_BAIRRO: 128, cl: 91330, trecho: 14,
    cod_tipologia: "10", id_utilizacao: 1, numero: "3300", COMPLEMENTO: "APT_x0020_804_x0020_BLC_x0020_6", nm_bairro_norm: "BARRA DA TIJUCA",
    logradouro: "AVN_x0020_LUCIO_x0020_COSTA", ds_imovel_tipologia: "APARTAMENTO", DESCRICAO: "RESIDENCIAL", parte_transferida: "100",
    valor_transacoes: 1400000, area: 100, valor_m2: 14000,
  };
  const r = { ...base, ...o };
  return COLS.map((c) => r[c]);
};

const leitor = (bytes: Uint8Array) => async (ini: number, fim: number) => bytes.slice(ini, fim + 1);

const lerTudo = async (bytes: Uint8Array, opcoes = {}) => {
  const out: LinhaSmf[] = [];
  for await (const l of lerPlanilhaSmf(leitor(bytes), bytes.length, opcoes)) out.push(l);
  return out;
};

// ---------------------------------------------------------------------------

describe("texto, nomes e classificação", () => {
  test("desfaz o escape _x0020_ da SMF e entidades XML", () => {
    expect(limparTexto("APT_x0020_804_x0020_BLC_x0020_6")).toBe("APT 804 BLC 6");
    expect(limparTexto("PROLETARIO_x0020_CASA_x002F_APTO")).toBe("PROLETARIO CASA/APTO");
    expect(limparTexto("A &amp; B")).toBe("A & B");
  });

  test("código do logradouro com 6 dígitos", () => {
    expect(clNormalizado("91330")).toBe("091330");
    expect(clNormalizado("")).toBe("000000");
  });

  test("nome da rua na grafia da camada 8", () => {
    expect(nomeLogradouro("091330", "Avenida Lúcio Costa")).toBe("AVN LUCIO COSTA");
    expect(nomeLogradouro("999999", "Avenida João Nova")).toBe("AVN JOAO NOVA");
  });

  test("bairro pelo código, com o acento que itbi_transactions usa", () => {
    expect(nomeBairro("128", "BARRA DA TIJUCA")).toBe("BARRA DA TIJUCA");
    expect(nomeBairro("120", "FREGUESIA JACAREPAGUA")).toBe("FREGUESIA (JACAREPAGUÁ)");
    expect(nomeBairro("999", "BAIRRO NOVO")).toBe("BAIRRO NOVO");
  });

  test("tipologia: apart-hotel é apartamento; vaga, clube e similares ficam de fora", () => {
    expect(classificarTipologia("APARTAMENTO")).toBe("Apartamento");
    expect(classificarTipologia("APART-HOTEL FUNDOS")).toBe("Apartamento");
    expect(classificarTipologia("CASA")).toBe("Casa");
    expect(classificarTipologia("SALA")).toBe("Comercial");
    expect(classificarTipologia("LOJA SHOPPING")).toBe("Comercial");
    expect(classificarTipologia("TERRENO")).toBe("Terreno");
    expect(classificarTipologia("VAGA DE GARAGEM")).toBe("Outro");
    expect(classificarTipologia("CLUBE")).toBe("Outro");
    expect(classificarTipologia("ESPECIAL")).toBe("Outro");
  });

  test("uso", () => {
    expect(classificarUso("RESIDENCIAL")).toBe("Residencial");
    expect(classificarUso("NAO RESIDENCIAL")).toBe("Comercial");
    expect(classificarUso("TERRITORIAL")).toBe("Territorial");
    expect(classificarUso("AREA COMUM")).toBe("Outro");
  });

  test("links da página e arquivo recente", () => {
    const html = '<a href="https://x/ITBI_TRANSACOES_PERIODO_2019_2024.xlsx">a</a><a href="https://x/ITBI_TRANSACOES_2025_diante-6.xlsx">b</a><a href="https://x/outro.xlsx">c</a>';
    const links = linksDaPagina(html);
    expect(links).toHaveLength(2);
    expect(links.filter(ehArquivoRecente)).toEqual(["https://x/ITBI_TRANSACOES_2025_diante-6.xlsx"]);
  });
});

describe("lerPlanilhaSmf", () => {
  const bytes = planilha([
    linha({}),
    linha({ CD_BAIRRO: "128", numero: "3100" }), // código do bairro como texto (sharedString)
    linha({ CD_BAIRRO: 132, cl: 91330, numero: "5000", nm_bairro_norm: "RECREIO DOS BANDEIRANTES" }),
    linha({ ano: 2018, numero: "10" }),
  ]);

  test("lê todas as linhas e padroniza os nomes de coluna dos dois arquivos", async () => {
    const ls = await lerTudo(bytes);
    expect(ls).toHaveLength(4);
    expect(ls[0].bairro).toBe("BARRA DA TIJUCA"); // nm_bairro_norm -> bairro
    expect(ls[0].descricao).toBe("RESIDENCIAL"); // DESCRICAO -> descricao
    expect(ls[0].vl_declarado).toBe("1400000"); // valor_transacoes -> vl_declarado
    expect(ls[0].COMPLEMENTO).toBe("APT 804 BLC 6");
  });

  test("filtra o bairro com o código gravado como número ou como texto", async () => {
    const ls = await lerTudo(bytes, { bairros: new Set(["128"]) });
    expect(ls.map((l) => l.numero)).toEqual(["3300", "3100", "10"]);
  });

  test("filtra por ano", async () => {
    const ls = await lerTudo(bytes, { bairros: new Set(["128"]), desde: 2019 });
    expect(ls.map((l) => l.numero)).toEqual(["3300", "3100"]);
  });

  test("funciona lendo de 7 em 7 bytes (linhas cortadas entre blocos)", async () => {
    const ls: LinhaSmf[] = [];
    // bloco pequeno força cortes no meio das tags
    const { lerDiretorioZip, streamEntrada } = await import("../../../supabase/functions/_shared/itbiSmf.ts");
    const z = await lerDiretorioZip(leitor(bytes), bytes.length);
    let texto = "";
    const r = streamEntrada(leitor(bytes), z["xl/worksheets/sheet1.xml"], 7).getReader();
    while (true) { const { value, done } = await r.read(); if (done) break; texto += value; }
    expect(texto.startsWith("<?xml")).toBe(true);
    for await (const l of lerPlanilhaSmf(leitor(bytes), bytes.length, { bairros: new Set(["132"]) })) ls.push(l);
    expect(ls).toHaveLength(1);
  });
});

describe("normalizarEscrituras", () => {
  const base = { ano: "2025", mes: "1", regiao_fiscal: "C", CD_BAIRRO: "128", cl: "91330", trecho: "14", cod_tipologia: "10",
    id_utilizacao: "1", numero: "3300", COMPLEMENTO: "APT 804", bairro: "BARRA DA TIJUCA", logradouro: "AVN LUCIO COSTA",
    ds_imovel_tipologia: "APARTAMENTO", descricao: "RESIDENCIAL", parte_transferida: "100", vl_declarado: "1400000", area: "100", valor_m2: "14000" } as LinhaSmf;

  test("gera escritura completa, aceita e válida para gravar", async () => {
    const [e] = await normalizarEscrituras([base], "ITBI_TRANSACOES_2025_diante-6.xlsx");
    expect(e).toMatchObject({ ano: 2025, mes: 1, data_transacao: "2025-01-15", cl: "091330", logradouro: "AVN LUCIO COSTA",
      bairro: "BARRA DA TIJUCA", tipologia: "Apartamento", uso: "Residencial", valor_transacao: 1400000, area_m2: 100, aceita: true });
    expect(e.id).toMatch(/^[0-9a-f]{40}$/);
    expect(conferirEscritura(e)).toBeNull();
  });

  test("o id é estável entre cargas e linhas idênticas recebem ids diferentes", async () => {
    const a = await normalizarEscrituras([base, base], "x.xlsx");
    const b = await normalizarEscrituras([base, base], "x.xlsx");
    expect(a[0].id).toBe(b[0].id);
    expect(a[1].id).toBe(b[1].id);
    expect(a[0].id).not.toBe(a[1].id);
  });

  test("aplica os limites de ingestão do app e descarta linha sem valor", async () => {
    const es = await normalizarEscrituras([
      { ...base, area: "8000", numero: "1" },
      { ...base, vl_declarado: "20000", numero: "2" },
      { ...base, vl_declarado: "", numero: "3" },
    ], "x.xlsx");
    expect(es).toHaveLength(2);
    expect(es.map((e) => e.motivo_rejeicao)).toEqual(["fora_da_faixa", "fora_da_faixa"]);
    expect(es.every((e) => !e.aceita)).toBe(true);
  });

  test("conferirEscritura recusa campos fora do domínio", () => {
    expect(conferirEscritura({ id: "x" })).toBe("id inválido");
    expect(conferirEscritura(null)).toBe("não é objeto");
  });
});

describe("aplicarGeocodificacao", () => {
  const esc = (numero: string, cl = "091330") =>
    ({ cl, numero, lat: null, lon: null, np_usado: null, cod_lote: null, cod_quadra: null, cep: null, num_pavimentos: null, geo_precisao: null } as unknown as EscrituraSmf);
  const porta = (np: string, lat: number): Porta => ({ np, np_int: Number(np), lat, lon: -43, cod_lote: "L" + np, cod_quadra: "Q", cep: "22620172", num_pavimentos: 10 });
  const portas = new Map([["091330", [porta("3300", -23.01), porta("3302", -23.02), porta("3305", -23.03)]]]);
  const centros = new Map([["091330", { lat: -23.5, lon: -43.5 }], ["123456", { lat: -22.9, lon: -43.2 }]]);

  test("número existente: exata, com lote e CEP", () => {
    const g = aplicarGeocodificacao(esc("3300"), portas, centros);
    expect(g).toMatchObject({ geo_precisao: "exata", lat: -23.01, cod_lote: "L3300", cep: "22620172" });
  });

  test("número inexistente: porta mais próxima da mesma rua", () => {
    expect(aplicarGeocodificacao(esc("3304"), portas, centros).geo_precisao).toBe("aproximada (nº 3305)");
    expect(aplicarGeocodificacao(esc("3301"), portas, centros).geo_precisao).toBe("aproximada (nº 3300)");
  });

  test("longe de qualquer porta ou rua sem porta: centro da rua", () => {
    expect(aplicarGeocodificacao(esc("9000"), portas, centros).geo_precisao).toBe("aproximada (centro da rua)");
    expect(aplicarGeocodificacao(esc("10", "123456"), portas, centros).lat).toBe(-22.9);
  });

  test("sem porta e sem traçado: sem coordenada", () => {
    const g = aplicarGeocodificacao(esc("10", "555555"), portas, centros);
    expect(g.geo_precisao).toBe("sem");
    expect(g.lat).toBeNull();
  });
});
