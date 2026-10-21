// Leitura e normalização das planilhas de ITBI por escritura da SMF
// (ITBI_TRANSACOES_*.xlsx), compartilhada entre a edge function
// ingest-itbi-smf (Deno) e o painel de carga do admin (navegador).
//
// Fonte: https://fazenda.prefeitura.rio/itbi-valores-medios-por-m2-de-transacoes-imobiliarias-por-trecho-de-logradouro
//
// Por que leitura em streaming, por faixas de bytes: edge functions têm teto de
// ~2 s de CPU e 256 MB de memória. Medido em 2026-10-21 (Mac M-series, Deno):
// só descompactar a planilha 2019-2024 (180 MB de XML) custa 0,6 s de CPU; ler
// e filtrar a Barra, 1,4 s. Por isso:
//   - o arquivo nunca é carregado inteiro: lemos o diretório central do zip e a
//     entrada da planilha por faixas (HTTP Range), descompactando em streaming;
//   - o arquivo recente (2025 em diante) cabe na edge function por grupo de
//     bairros; o histórico é processado no navegador do admin (sem teto) e só a
//     gravação passa pela função.
//
// Sem dependências e sem APIs de Deno/Node: roda em Deno, Bun e navegador.

import { LIMITES_INGESTAO } from "./itbiIngestion.ts";
import { NOMES_BAIRRO, NOMES_LOGRADOURO } from "./itbiSmfNomes.ts";

export const PAGINA_SMF =
  "https://fazenda.prefeitura.rio/itbi-valores-medios-por-m2-de-transacoes-imobiliarias-por-trecho-de-logradouro";
export const HOST_SMF = "fazenda.prefeitura.rio";
export const NUMERO_DE_PORTA_URL =
  "https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Numero_de_porta/FeatureServer/0/query";
export const TRECHOS_URL =
  "https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Trechos_Logradouros/MapServer/0/query";
/** Porta vizinha aceita até esta diferença de numeração na geocodificação. */
export const TOLERANCIA_NUMERO = 300;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Uma linha da planilha, já com nomes de coluna padronizados entre os arquivos. */
export interface LinhaSmf {
  ano: string;
  mes: string;
  regiao_fiscal: string;
  CD_BAIRRO: string;
  cl: string;
  trecho: string;
  cod_tipologia: string;
  id_utilizacao: string;
  numero: string;
  COMPLEMENTO: string;
  bairro: string;
  logradouro: string;
  ds_imovel_tipologia: string;
  descricao: string;
  parte_transferida: string;
  vl_declarado: string;
  area: string;
  valor_m2: string;
}

export type Uso = "Residencial" | "Comercial" | "Territorial" | "Outro";
export type Tipologia = "Apartamento" | "Casa" | "Terreno" | "Comercial" | "Outro";

/** Linha pronta para public.itbi_escrituras (sem as colunas geradas). */
export interface EscrituraSmf {
  id: string;
  ano: number;
  mes: number;
  data_transacao: string;
  regiao_fiscal: string | null;
  cod_bairro: string | null;
  bairro: string;
  cl: string;
  trecho: number | null;
  logradouro: string;
  logradouro_smf: string;
  numero: string | null;
  complemento: string | null;
  cod_tipologia: string | null;
  tipologia_smf: string | null;
  tipologia: Tipologia;
  uso_smf: string | null;
  uso: Uso;
  percentual_transferido: number;
  valor_transacao: number;
  area_m2: number;
  aceita: boolean;
  motivo_rejeicao: string | null;
  geo_precisao: string | null;
  lat: number | null;
  lon: number | null;
  np_usado: string | null;
  cod_lote: string | null;
  cod_quadra: string | null;
  cep: string | null;
  num_pavimentos: number | null;
  arquivo_fonte: string;
}

/** Lê os bytes [inicio, fim] (fim inclusivo) do arquivo. Na função: HTTP Range; no navegador: proxy da função. */
export type LerFaixa = (inicio: number, fim: number) => Promise<Uint8Array>;

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

/** Desfaz o escape `_x0020_` do exportador da SMF e as entidades XML. */
export const limparTexto = (s: string | null | undefined): string =>
  (s ?? "")
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&")
    .trim();

export const semAcento = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

const TIPO_VIA: Record<string, string> = {
  AVENIDA: "AVN", ESTRADA: "EST", TRAVESSA: "TRV", PRACA: "PCA", LARGO: "LGO",
  LADEIRA: "LAD", ALAMEDA: "ALA", BECO: "BCO", CAMINHO: "CAM", RODOVIA: "ROD",
};

/** Código do logradouro com 6 dígitos; "000000" quando vazio. */
export const clNormalizado = (cl: string | null | undefined): string => {
  const n = parseInt(String(cl ?? "").trim(), 10);
  return Number.isFinite(n) ? String(n).padStart(6, "0") : "000000";
};

/**
 * Nome do logradouro na grafia que itbi_transactions já usa (camada 8):
 * tabela por código; senão o nome da SMF 2025+ (já nessa grafia); senão o
 * nome antigo normalizado (maiúsculas, sem acento, tipo de via abreviado).
 */
export const nomeLogradouro = (cl: string, nomeSmf: string): string => {
  const conhecido = NOMES_LOGRADOURO[cl];
  if (conhecido) return conhecido;
  let nome = semAcento(nomeSmf || "SEM LOGRADOURO").toUpperCase().replace(/\s+/g, " ").trim();
  const [tipo, ...resto] = nome.split(" ");
  if (resto.length && TIPO_VIA[tipo]) nome = `${TIPO_VIA[tipo]} ${resto.join(" ")}`;
  return nome;
};

/** Bairro na grafia de itbi_transactions (maiúsculas com acento), pelo código. */
export const nomeBairro = (codBairro: string, nomeSmf: string): string => {
  const n = parseInt(String(codBairro ?? "").trim(), 10);
  const conhecido = Number.isFinite(n) ? NOMES_BAIRRO[String(n)] : undefined;
  return conhecido || (nomeSmf || "DESCONHECIDO").toUpperCase().trim() || "DESCONHECIDO";
};

// ---------------------------------------------------------------------------
// Classificação e validação (mesmas regras do app)
// ---------------------------------------------------------------------------

export const classificarUso = (usoSmf: string): Uso => {
  const u = (usoSmf || "").toUpperCase();
  if (u.includes("NAO RESIDENCIAL") || u.includes("NÃO RESIDENCIAL") || u.includes("COMERCIAL")) return "Comercial";
  if (u.includes("TERRITORIAL")) return "Territorial";
  if (u === "RESIDENCIAL") return "Residencial";
  return "Outro"; // AREA COMUM, VAGA VINCULADA, vazio
};

const OUTROS = ["vaga", "garagem", "galpao", "galpão", "industria", "armazem", "deposito", "telheiro", "clube",
  "colegio", "creche", "hospital", "clinica", "hotel/motel", "cinema", "teatro", "constr sec", "especial",
  "unid. hoteleira"];

/** classificarTipologia do app, mais a classe Outro para o que não é unidade comparável. */
export const classificarTipologia = (tip: string): Tipologia => {
  const t = (tip || "").toLowerCase();
  if (OUTROS.some((k) => t.includes(k))) return "Outro";
  if (["apartamento", "apto", "flat", "cobertura", "apart-hotel"].some((k) => t.includes(k))) return "Apartamento";
  if (["casa", "sobrado", "residencia"].some((k) => t.includes(k))) return "Casa";
  if (["terreno", "lote"].some((k) => t.includes(k))) return "Terreno";
  if (["sala", "loja", "sobreloja", "escritório", "escritorio"].some((k) => t.includes(k))) return "Comercial";
  return "Outro";
};

/** Mesma ordem de validarFeatureItbi: obrigatórios, percentual, faixas. */
export const validarEscritura = (
  valor: number | null,
  area: number | null,
  percentual: number
): { ok: true } | { ok: false; motivo: "dados_invalidos" | "percentual" | "fora_da_faixa" } => {
  const L = LIMITES_INGESTAO;
  if (valor === null || area === null || !(valor > 0) || !(area > 0)) return { ok: false, motivo: "dados_invalidos" };
  if (percentual < L.percentualMin) return { ok: false, motivo: "percentual" };
  const vm2 = valor / area;
  if (area < L.areaMinM2 || area > L.areaMaxM2) return { ok: false, motivo: "fora_da_faixa" };
  if (valor < L.valorMin || valor > L.valorMax) return { ok: false, motivo: "fora_da_faixa" };
  if (vm2 < L.valorM2Min || vm2 > L.valorM2Max) return { ok: false, motivo: "fora_da_faixa" };
  return { ok: true };
};

const numero = (s: string): number | null => {
  const t = (s ?? "").trim();
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : null;
};

const sha1 = async (texto: string): Promise<string> => {
  const h = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(texto));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

/** Chave estável de uma escritura (sem a ocorrência). Igual em todas as cargas. */
export const chaveEscritura = (l: LinhaSmf): string => {
  const valor = numero(l.vl_declarado);
  const area = numero(l.area);
  return [
    l.ano, l.mes, clNormalizado(l.cl), (l.trecho || "").trim(), (l.numero || "").trim(), (l.COMPLEMENTO || "").trim(),
    (l.cod_tipologia || "").trim(), valor === null ? "" : valor.toFixed(2), area === null ? "" : area.toFixed(2),
  ].join("|");
};

/**
 * Converte linhas da planilha em escrituras normalizadas (sem geocodificação).
 * Linhas idênticas recebem sufixo de ocorrência no id (|1, |2...), por isso
 * todas as linhas de um mesmo logradouro precisam passar na mesma chamada.
 */
export const normalizarEscrituras = async (linhas: LinhaSmf[], arquivo: string): Promise<EscrituraSmf[]> => {
  const ocorrencias = new Map<string, number>();
  const saida: EscrituraSmf[] = [];
  for (const l of linhas) {
    const ano = parseInt(l.ano, 10);
    const mes = parseInt(l.mes, 10);
    if (!Number.isFinite(ano) || !Number.isFinite(mes)) continue;
    const cl = clNormalizado(l.cl);
    const valor = numero(l.vl_declarado);
    const area = numero(l.area);
    const pct = numero(l.parte_transferida) ?? 100;
    const v = validarEscritura(valor, area, pct);
    if (!(valor && valor > 0 && area && area > 0)) continue; // sem valor ou área não há o que gravar
    const base = chaveEscritura(l);
    const n = (ocorrencias.get(base) ?? 0) + 1;
    ocorrencias.set(base, n);
    const trecho = parseInt((l.trecho || "").trim(), 10);
    const tipSmf = (l.ds_imovel_tipologia || "").trim();
    const usoSmf = (l.descricao || "").trim();
    saida.push({
      id: await sha1(`${base}|${n}`),
      ano,
      mes,
      data_transacao: `${ano}-${String(mes).padStart(2, "0")}-15`,
      regiao_fiscal: (l.regiao_fiscal || "").trim() || null,
      cod_bairro: (l.CD_BAIRRO || "").trim() || null,
      bairro: nomeBairro(l.CD_BAIRRO, l.bairro),
      cl,
      trecho: Number.isFinite(trecho) ? trecho : null,
      logradouro: nomeLogradouro(cl, (l.logradouro || "").trim()),
      logradouro_smf: (l.logradouro || "").trim(),
      numero: (l.numero || "").trim() || null,
      complemento: (l.COMPLEMENTO || "").trim() || null,
      cod_tipologia: (l.cod_tipologia || "").trim() || null,
      tipologia_smf: tipSmf || null,
      tipologia: classificarTipologia(tipSmf),
      uso_smf: usoSmf || null,
      uso: classificarUso(usoSmf),
      percentual_transferido: Math.round(pct * 100) / 100,
      valor_transacao: Math.round(valor * 100) / 100,
      area_m2: Math.round(area * 100) / 100,
      aceita: v.ok,
      motivo_rejeicao: "motivo" in v ? v.motivo : null,
      geo_precisao: null,
      lat: null,
      lon: null,
      np_usado: null,
      cod_lote: null,
      cod_quadra: null,
      cep: null,
      num_pavimentos: null,
      arquivo_fonte: arquivo,
    });
  }
  return saida;
};

// ---------------------------------------------------------------------------
// Leitura do xlsx (zip) por faixas de bytes, em streaming
// ---------------------------------------------------------------------------

interface EntradaZip { offset: number; tamanhoComprimido: number; metodo: number }

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32 = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

/** Lê o diretório central do zip (últimos 64 KB do arquivo). */
export const lerDiretorioZip = async (ler: LerFaixa, tamanho: number): Promise<Record<string, EntradaZip>> => {
  const ini = Math.max(0, tamanho - 65536);
  const cauda = await ler(ini, tamanho - 1);
  let eocd = -1;
  for (let i = cauda.length - 22; i >= 0; i--) if (u32(cauda, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("arquivo não é um xlsx válido (fim do diretório central não encontrado)");
  const qtd = u16(cauda, eocd + 10);
  const cdOff = u32(cauda, eocd + 16);
  if (cdOff < ini) throw new Error("diretório central maior que 64 KB: formato inesperado");
  const entradas: Record<string, EntradaZip> = {};
  let p = cdOff - ini;
  const dec = new TextDecoder();
  for (let k = 0; k < qtd; k++) {
    if (u32(cauda, p) !== 0x02014b50) throw new Error("diretório central corrompido");
    const metodo = u16(cauda, p + 10);
    const csize = u32(cauda, p + 20);
    const nl = u16(cauda, p + 28), xl = u16(cauda, p + 30), cl = u16(cauda, p + 32);
    const offset = u32(cauda, p + 42);
    entradas[dec.decode(cauda.subarray(p + 46, p + 46 + nl))] = { offset, tamanhoComprimido: csize, metodo };
    p += 46 + nl + xl + cl;
  }
  return entradas;
};

/** Texto descompactado de uma entrada do zip, em pedaços, lendo blocos de `bloco` bytes. */
export const streamEntrada = (ler: LerFaixa, e: EntradaZip, bloco = 2 << 20): ReadableStream<string> => {
  let pos = -1;
  let fim = 0;
  const bruto = new ReadableStream<Uint8Array>({
    async pull(ctl) {
      if (pos < 0) {
        const h = await ler(e.offset, e.offset + 29);
        if (u32(h, 0) !== 0x04034b50) throw new Error("cabeçalho local do zip inválido");
        pos = e.offset + 30 + u16(h, 26) + u16(h, 28);
        fim = pos + e.tamanhoComprimido;
      }
      if (pos >= fim) { ctl.close(); return; }
      const n = Math.min(bloco, fim - pos);
      ctl.enqueue(await ler(pos, pos + n - 1));
      pos += n;
    },
  });
  if (e.metodo === 0) return bruto.pipeThrough(new TextDecoderStream());
  if (e.metodo !== 8) throw new Error(`método de compressão ${e.metodo} não suportado`);
  // cast: as tipagens de Deno/TS 5.7 (Uint8Array<ArrayBuffer>) e do navegador divergem aqui
  const inflar = new DecompressionStream("deflate-raw") as unknown as TransformStream<Uint8Array, Uint8Array>;
  return bruto.pipeThrough(inflar).pipeThrough(new TextDecoderStream());
};

async function* pedacos(s: ReadableStream<string>): AsyncGenerator<string> {
  const r = s.getReader();
  try {
    while (true) {
      const { value, done } = await r.read();
      if (done) return;
      yield value;
    }
  } finally {
    r.releaseLock();
  }
}

/** Conteúdo de cada <si> de sharedStrings.xml (todas as runs <t> concatenadas). */
export const lerStringsCompartilhadas = async (s: ReadableStream<string>): Promise<string[]> => {
  const out: string[] = [];
  let resto = "";
  for await (const ped of pedacos(s)) {
    const t = resto + ped;
    let i = 0;
    while (true) {
      const a = t.indexOf("<si>", i);
      if (a < 0) break;
      const b = t.indexOf("</si>", a);
      if (b < 0) break;
      out.push(textoDosT(t.slice(a + 4, b)));
      i = b + 5;
    }
    resto = t.slice(i);
  }
  return out;
};

const textoDosT = (si: string): string => {
  let r = "";
  let i = 0;
  while (true) {
    const a = si.indexOf("<t", i);
    if (a < 0) break;
    const fimTag = si.indexOf(">", a);
    if (si[fimTag - 1] === "/") { i = fimTag + 1; continue; } // <t/>
    const b = si.indexOf("</t>", fimTag);
    if (b < 0) break;
    r += si.slice(fimTag + 1, b);
    i = b + 4;
  }
  return r;
};

/** Letras da coluna ("A".."T") a partir da referência da célula ("F123"). */
const coluna = (ref: string): string => {
  let i = 0;
  while (i < ref.length && ref.charCodeAt(i) >= 65 && ref.charCodeAt(i) <= 90) i++;
  return ref.slice(0, i);
};

/** Células de uma linha (<row>...</row>) como mapa coluna -> texto. */
const celulas = (linha: string, strings: string[]): Record<string, string> => {
  const r: Record<string, string> = {};
  let i = 0;
  while (true) {
    const a = linha.indexOf("<c ", i);
    if (a < 0) break;
    const fimTag = linha.indexOf(">", a);
    const tag = linha.slice(a, fimTag);
    const refIni = tag.indexOf('r="') + 3;
    const col = coluna(tag.slice(refIni, tag.indexOf('"', refIni)));
    if (linha[fimTag - 1] === "/") { r[col] = ""; i = fimTag + 1; continue; }
    const fecha = linha.indexOf("</c>", fimTag);
    const corpo = linha.slice(fimTag + 1, fecha);
    if (tag.includes('t="s"')) {
      const v0 = corpo.indexOf("<v>");
      r[col] = v0 >= 0 ? strings[Number(corpo.slice(v0 + 3, corpo.indexOf("</v>", v0)))] ?? "" : "";
    } else if (tag.includes('t="inlineStr"')) {
      r[col] = textoDosT(corpo);
    } else {
      const v0 = corpo.indexOf("<v>");
      r[col] = v0 >= 0 ? corpo.slice(v0 + 3, corpo.indexOf("</v>", v0)) : "";
    }
    i = fecha + 4;
  }
  return r;
};

/** Valor de uma única coluna, sem decodificar a linha inteira (filtro barato). */
const valorDaColuna = (linha: string, col: string, strings: string[]): string | null => {
  const a = linha.indexOf(`<c r="${col}`);
  if (a < 0) return null;
  const fimTag = linha.indexOf(">", a);
  if (linha[fimTag - 1] === "/") return "";
  const fecha = linha.indexOf("</c>", fimTag);
  const v0 = linha.indexOf("<v>", fimTag);
  if (v0 < 0 || v0 > fecha) return "";
  const v = linha.slice(v0 + 3, linha.indexOf("</v>", v0));
  return linha.slice(a, fimTag).includes('t="s"') ? strings[Number(v)] ?? "" : v;
};

const ALIAS_COLUNA: Record<string, keyof LinhaSmf> = {
  nm_bairro_norm: "bairro",
  DESCRICAO: "descricao",
  valor_transacoes: "vl_declarado",
};

export interface OpcoesLeitura {
  /** CD_BAIRRO como texto sem zeros (ex.: "128"). Vazio = todos. */
  bairros?: Set<string>;
  /** Ano mínimo (inclusive). */
  desde?: number;
  /** Chamado a cada 10 mil linhas encontradas (sem filtro de bairro) e no fim. */
  aoProgredir?: (linhasEncontradas: number) => void;
}

/**
 * Percorre a planilha da SMF por faixas de bytes, devolvendo só as linhas do
 * filtro. Nunca guarda o arquivo inteiro na memória.
 */
export async function* lerPlanilhaSmf(ler: LerFaixa, tamanho: number, opcoes: OpcoesLeitura = {}): AsyncGenerator<LinhaSmf> {
  const zip = await lerDiretorioZip(ler, tamanho);
  const folha = zip["xl/worksheets/sheet1.xml"];
  if (!folha) throw new Error("planilha sem xl/worksheets/sheet1.xml");
  const strings = zip["xl/sharedStrings.xml"] ? await lerStringsCompartilhadas(streamEntrada(ler, zip["xl/sharedStrings.xml"])) : [];

  const bairros = opcoes.bairros && opcoes.bairros.size ? new Set([...opcoes.bairros].map((b) => String(parseInt(b, 10)))) : null;
  let mapa: Record<string, keyof LinhaSmf> | null = null; // coluna -> campo
  let colBairro = "";
  let colAno = "";
  let padroes: string[] | null = null; // atalhos de busca do código do bairro no texto bruto
  let encontradas = 0;
  let resto = "";

  const montar = (linha: string): LinhaSmf | null => {
    if (bairros) {
      const cod = valorDaColuna(linha, colBairro, strings);
      if (cod === null || !bairros.has(String(parseInt(limparTexto(cod), 10)))) return null;
    }
    if (opcoes.desde) {
      const ano = parseInt(valorDaColuna(linha, colAno, strings) ?? "", 10);
      if (!(ano >= opcoes.desde)) return null;
    }
    const c = celulas(linha, strings);
    const reg = {} as LinhaSmf;
    for (const [col, campo] of Object.entries(mapa!)) (reg as unknown as Record<string, string>)[campo] = limparTexto(c[col] ?? "");
    return reg;
  };

  for await (const ped of pedacos(streamEntrada(ler, folha))) {
    const t = resto + ped;
    const corte = t.lastIndexOf("</row>");
    if (corte < 0) { resto = t; continue; }
    const seg = t.slice(0, corte + 6);
    resto = t.slice(corte + 6);
    let inicio = 0;

    if (!mapa) {
      const a = seg.indexOf("<row");
      const b = seg.indexOf("</row>", a);
      mapa = {};
      for (const [col, nome] of Object.entries(celulas(seg.slice(a, b), strings))) {
        const n = limparTexto(nome);
        mapa[col] = (ALIAS_COLUNA[n] ?? n) as keyof LinhaSmf;
      }
      colBairro = Object.keys(mapa).find((c) => mapa![c] === "CD_BAIRRO") ?? "";
      colAno = Object.keys(mapa).find((c) => mapa![c] === "ano") ?? "";
      if (!colBairro || !colAno) throw new Error("cabeçalho inesperado: faltam as colunas CD_BAIRRO ou ano");
      if (bairros && colBairro.length === 1 && colBairro < "Z") {
        // A célula do bairro é sempre seguida da célula da próxima coluna:
        // "...<v>128</v></c><c r=\"G" (número) ou "t=\"s\"><v>K</v></c><c r=\"G" (string K).
        // Buscar esse texto direto evita decodificar as centenas de milhares de linhas fora do filtro.
        const prox = `</v></c><c r="${String.fromCharCode(colBairro.charCodeAt(0) + 1)}`;
        padroes = [];
        for (const cod of bairros) {
          padroes.push(`><v>${cod}${prox}`);
          strings.forEach((s, k) => { if (String(parseInt(limparTexto(s), 10)) === cod && limparTexto(s) !== "") padroes!.push(`t="s"><v>${k}${prox}`); });
        }
      }
      inicio = b + 6;
    }

    if (padroes) {
      const posicoes: number[] = [];
      for (const p of padroes) for (let k = seg.indexOf(p, inicio); k >= 0; k = seg.indexOf(p, k + p.length)) posicoes.push(k);
      posicoes.sort((x, y) => x - y);
      let fimAnterior = -1;
      for (const k of posicoes) {
        const a = seg.lastIndexOf("<row", k);
        if (a <= fimAnterior) continue;
        const b = seg.indexOf("</row>", k);
        fimAnterior = b;
        const reg = montar(seg.slice(a, b));
        if (reg) { encontradas++; yield reg; }
      }
    } else {
      let i = inicio;
      while (true) {
        const a = seg.indexOf("<row", i);
        if (a < 0) break;
        const b = seg.indexOf("</row>", a);
        i = b + 6;
        const reg = montar(seg.slice(a, b));
        if (reg) {
          encontradas++;
          if (opcoes.aoProgredir && encontradas % 10000 === 0) opcoes.aoProgredir(encontradas);
          yield reg;
        }
      }
    }
  }
  opcoes.aoProgredir?.(encontradas);
}

/** Links ITBI_TRANSACOES_*.xlsx na página da SMF (os nomes mudam a cada republicação). */
export const linksDaPagina = (html: string): string[] => {
  const re = /href="([^"]*ITBI_TRANSACOES[^"]*\.xlsx)"/gi;
  const out = new Set<string>();
  let m;
  while ((m = re.exec(html))) out.add(m[1]);
  return [...out].sort();
};

/** O arquivo de 2025 em diante (o que muda todo mês) entre os links da página. */
export const ehArquivoRecente = (url: string): boolean => /ITBI_TRANSACOES_\d{4}_diante/i.test(url);

// ---------------------------------------------------------------------------
// Geocodificação pelo Número de porta da Prefeitura (gratuito)
// ---------------------------------------------------------------------------

export interface Porta {
  np: string;
  np_int: number | null;
  lat: number;
  lon: number;
  cod_lote: string | null;
  cod_quadra: string | null;
  cep: string | null;
  num_pavimentos: number | null;
}

export type BuscarJson = (url: string) => Promise<{ features?: Array<{ attributes: Record<string, unknown>; geometry?: Record<string, unknown> }>; exceededTransferLimit?: boolean; error?: unknown }>;

const consulta = (base: string, p: Record<string, string>) => `${base}?${new URLSearchParams(p).toString()}`;

/** Portas de cada logradouro (por código cl), em lotes de 60 códigos. */
export const buscarPortas = async (cls: string[], buscar: BuscarJson, aoProgredir?: (feitos: number) => void): Promise<Map<string, Porta[]>> => {
  const portas = new Map<string, Porta[]>();
  for (const c of cls) portas.set(c, []);
  for (let i = 0; i < cls.length; i += 60) {
    const lote = cls.slice(i, i + 60);
    let offset = 0;
    while (true) {
      const r = await buscar(consulta(NUMERO_DE_PORTA_URL, {
        where: `cl IN (${lote.map((c) => `'${c}'`).join(",")})`,
        outFields: "cl,np,np_int,cod_lote,cod_quadra,cep,num_pavimentos",
        returnGeometry: "true", outSR: "4326", resultOffset: String(offset), resultRecordCount: "2000", f: "json",
      }));
      if (r.error) throw new Error(`Número de porta: ${JSON.stringify(r.error).slice(0, 200)}`);
      const fs = r.features ?? [];
      for (const f of fs) {
        const a = f.attributes, g = f.geometry ?? {};
        if (typeof g.y !== "number" || typeof g.x !== "number") continue;
        portas.get(String(a.cl))?.push({
          np: String(a.np ?? "").trim(),
          np_int: typeof a.np_int === "number" ? a.np_int : null,
          lat: g.y as number, lon: g.x as number,
          cod_lote: (a.cod_lote as string) ?? null, cod_quadra: (a.cod_quadra as string) ?? null,
          cep: (a.cep as string) ?? null, num_pavimentos: typeof a.num_pavimentos === "number" ? a.num_pavimentos : null,
        });
      }
      if (r.exceededTransferLimit && fs.length) offset += fs.length;
      else break;
    }
    aoProgredir?.(Math.min(i + 60, cls.length));
  }
  return portas;
};

/** Ponto médio do traçado de cada logradouro (fallback quando a rua não tem portas). */
export const buscarCentrosDeRua = async (cls: string[], buscar: BuscarJson): Promise<Map<string, { lat: number; lon: number }>> => {
  const centros = new Map<string, { lat: number; lon: number }>();
  for (let i = 0; i < cls.length; i += 50) {
    const lote = cls.slice(i, i + 50);
    const r = await buscar(consulta(TRECHOS_URL, {
      where: `cl IN (${lote.map((c) => `'${c}'`).join(",")})`, outFields: "cl", returnGeometry: "true", outSR: "4326", f: "json",
    }));
    const acc = new Map<string, number[][]>();
    for (const f of r.features ?? []) {
      const paths = (f.geometry?.paths as number[][][]) ?? [];
      const c = String(f.attributes.cl);
      for (const p of paths) acc.set(c, [...(acc.get(c) ?? []), ...p]);
    }
    for (const [c, pts] of acc) {
      if (!pts.length) continue;
      centros.set(c, { lat: pts.reduce((s, p) => s + p[1], 0) / pts.length, lon: pts.reduce((s, p) => s + p[0], 0) / pts.length });
    }
  }
  return centros;
};

/**
 * Preenche lat/lon e o lote de cada escritura: exata > porta mais próxima da
 * mesma rua (até TOLERANCIA_NUMERO) > centro da rua > sem. Mesmo critério do
 * carregador Python que gerou a base da Barra entregue em 2026-10-20.
 */
export const aplicarGeocodificacao = (
  e: EscrituraSmf,
  portas: Map<string, Porta[]>,
  centros: Map<string, { lat: number; lon: number }>
): EscrituraSmf => {
  const lista = portas.get(e.cl) ?? [];
  const num = (e.numero ?? "").trim();
  const usar = (p: Porta, precisao: string): EscrituraSmf => ({
    ...e, lat: p.lat, lon: p.lon, np_usado: p.np, cod_lote: p.cod_lote, cod_quadra: p.cod_quadra,
    cep: p.cep, num_pavimentos: p.num_pavimentos, geo_precisao: precisao,
  });
  if (lista.length && /^\d+$/.test(num) && Number(num) > 0) {
    const exata = lista.find((p) => p.np === num);
    if (exata) return usar(exata, "exata");
    const n = Number(num);
    let melhor: Porta | null = null;
    let melhorDist = Infinity;
    for (const p of lista) {
      if (p.np_int === null) continue;
      const d = Math.abs(p.np_int - n);
      if (d > TOLERANCIA_NUMERO) continue;
      const custo = d + ((p.np_int - n) % 2 === 0 ? 0 : 0.5);
      if (custo < melhorDist) { melhor = p; melhorDist = custo; }
    }
    if (melhor) return usar(melhor, `aproximada (nº ${melhor.np})`);
  }
  const c = centros.get(e.cl);
  if (c && e.cl !== "000000") return { ...e, lat: c.lat, lon: c.lon, geo_precisao: "aproximada (centro da rua)" };
  return { ...e, geo_precisao: "sem" };
};

/** Geocodifica um conjunto de escrituras (consulta a Prefeitura uma vez por logradouro). */
export const geocodificarEscrituras = async (
  escrituras: EscrituraSmf[],
  buscar: BuscarJson,
  aoProgredir?: (feitos: number, total: number) => void
): Promise<EscrituraSmf[]> => {
  const cls = [...new Set(escrituras.map((e) => e.cl))].filter((c) => c !== "000000").sort();
  const portas = await buscarPortas(cls, buscar, (f) => aoProgredir?.(f, cls.length));
  // Centro da rua para todas as ruas: também serve quando o número está longe de qualquer porta.
  const centros = await buscarCentrosDeRua(cls, buscar);
  return escrituras.map((e) => aplicarGeocodificacao(e, portas, centros));
};

// ---------------------------------------------------------------------------
// Validação do que chega para gravar (edge function)
// ---------------------------------------------------------------------------

const TEXTO_OU_NULO = ["regiao_fiscal", "cod_bairro", "numero", "complemento", "cod_tipologia", "tipologia_smf",
  "uso_smf", "motivo_rejeicao", "geo_precisao", "np_usado", "cod_lote", "cod_quadra", "cep"] as const;

/** Confere tipos e domínios de uma escritura recebida; devolve o motivo quando inválida. */
export const conferirEscritura = (x: unknown): string | null => {
  if (!x || typeof x !== "object") return "não é objeto";
  const e = x as Record<string, unknown>;
  if (typeof e.id !== "string" || !/^[0-9a-f]{40}$/.test(e.id)) return "id inválido";
  if (!Number.isInteger(e.ano) || (e.ano as number) < 2000 || (e.ano as number) > 2100) return "ano inválido";
  if (!Number.isInteger(e.mes) || (e.mes as number) < 1 || (e.mes as number) > 12) return "mês inválido";
  if (typeof e.data_transacao !== "string" || !/^\d{4}-\d{2}-15$/.test(e.data_transacao)) return "data inválida";
  for (const c of ["bairro", "logradouro", "arquivo_fonte"]) if (typeof e[c] !== "string" || !(e[c] as string).length) return `${c} vazio`;
  if (typeof e.logradouro_smf !== "string") return "logradouro_smf inválido";
  if (typeof e.cl !== "string" || !/^\d{6}$/.test(e.cl)) return "cl inválido";
  if (!["Residencial", "Comercial", "Territorial", "Outro"].includes(e.uso as string)) return "uso inválido";
  if (!["Apartamento", "Casa", "Terreno", "Comercial", "Outro"].includes(e.tipologia as string)) return "tipologia inválida";
  for (const c of ["valor_transacao", "area_m2", "percentual_transferido"]) if (typeof e[c] !== "number" || !Number.isFinite(e[c])) return `${c} inválido`;
  if (typeof e.aceita !== "boolean") return "aceita inválido";
  for (const c of TEXTO_OU_NULO) if (e[c] !== null && typeof e[c] !== "string") return `${c} inválido`;
  for (const c of ["lat", "lon", "trecho", "num_pavimentos"]) if (e[c] !== null && (typeof e[c] !== "number" || !Number.isFinite(e[c]))) return `${c} inválido`;
  return null;
};

/** Mantém só as colunas de itbi_escrituras (descarta qualquer campo extra). */
export const COLUNAS_ESCRITURA: (keyof EscrituraSmf)[] = [
  "id", "ano", "mes", "data_transacao", "regiao_fiscal", "cod_bairro", "bairro", "cl", "trecho", "logradouro",
  "logradouro_smf", "numero", "complemento", "cod_tipologia", "tipologia_smf", "tipologia", "uso_smf", "uso",
  "percentual_transferido", "valor_transacao", "area_m2", "aceita", "motivo_rejeicao", "geo_precisao", "lat", "lon",
  "np_usado", "cod_lote", "cod_quadra", "cep", "num_pavimentos", "arquivo_fonte",
];
