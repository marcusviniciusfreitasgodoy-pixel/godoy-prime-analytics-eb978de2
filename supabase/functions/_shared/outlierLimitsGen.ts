// Geração da tabela OUTLIER_LIMITS_TABLE (e da carga da tabela itbi_cinto) a
// partir dos CSVs das consultas 7.4 e 7.4b (docs/calibracao-consultas.sql).
// Regras da seção 2.5 da especificação (revisão 2026-10-22):
//   - par com >= MIN_ESCRITURAS_3_ANOS (200) escrituras em 3 anos: janela de
//     3 anos, piso = P0,5 × 0,85, teto = P99,5 × 1,15;
//   - senão, par com >= MIN_ESCRITURAS_CINTO (30) escrituras em 5 anos:
//     janela de 5 anos, piso = min(P0,5 × 0,85; mediana / 2),
//     teto = max(P99,5 × 1,15; mediana × 2);
//   - senão, fora da tabela (cai na faixa da cidade).
// Percentis sobre escrituras individuais de itbi_escrituras, em preço do
// último trimestre do itbi_price_index. Travas só nos limites de ingestão.
// Sem dependências além de outlierLimits.ts e itbiIngestion.ts: roda em Bun,
// Deno e no navegador.
import {
  normalizeBairro,
  type OutlierLimitEntry,
  PISO_MARGIN,
  SMALL_SAMPLE_WIDTH,
  TETO_MARGIN,
} from "./outlierLimits.ts";
import { LIMITES_INGESTAO } from "./itbiIngestion.ts";

/** Abaixo disso em 5 anos o par não entra na tabela: a mediana de meia dúzia de escrituras não sustenta cinto. */
export const MIN_ESCRITURAS_CINTO = 30;
/** A partir disso em 3 anos o P0,5 e o P99,5 deixam de ser a própria venda extrema. */
export const MIN_ESCRITURAS_3_ANOS = 200;
/** Bairro que a SMF deixa em branco: não recebe cinto próprio. */
export const BAIRROS_SEM_CINTO = new Set(["DESCONHECIDO", ""]);

export interface LinhaCalibracao {
  bairro: string;
  tipologia: string;
  /** P0,5: base do piso desde 2026-10-22. */
  piso_p05: number;
  /** P1: mantido no CSV e na tabela só como referência. */
  piso_p1: number;
  mediana: number;
  teto_p995: number;
  escrituras: number;
  janela: "3 anos" | "5 anos";
}

export interface ParExcluido {
  chave: string;
  escrituras3: number;
  escrituras5: number;
}

export interface FaixaCidade {
  piso: number;
  teto: number;
  escrituras: number;
  /** Maior razão preço de hoje ÷ preço da época entre os trimestres da janela de 5 anos (converte o piso). */
  fatorIndice5Anos: number;
  /** Menor razão na mesma janela; abaixo de 1 quando algum trimestre foi mais caro que o último (converte o teto). */
  fatorMinIndice5Anos: number;
}

const tipologiaValida = (t: string): t is "Apartamento" | "Casa" | "Comercial" =>
  t === "Apartamento" || t === "Casa" || t === "Comercial";

export const parseCsvCalibracao = (csv: string): LinhaCalibracao[] => {
  const linhas = csv.trim().split(/\r?\n/);
  const cab = linhas[0].split(",").map((c) => c.trim());
  const idx = (nome: string) => {
    const i = cab.indexOf(nome);
    if (i < 0) throw new Error(`CSV sem a coluna obrigatória "${nome}" (cabeçalho: ${cab.join(", ")})`);
    return i;
  };
  const iB = idx("bairro"), iT = idx("tipologia"), iP05 = idx("piso_p05"), iP1 = idx("piso_p1"), iM = idx("mediana"),
    iP995 = idx("teto_p995"), iE = idx("escrituras"), iJ = idx("janela");
  return linhas.slice(1).filter((l) => l.trim()).map((l) => {
    const c = l.split(",").map((x) => x.trim());
    const janela = c[iJ];
    if (janela !== "3 anos" && janela !== "5 anos") throw new Error(`janela desconhecida "${janela}" em: ${l}`);
    return {
      bairro: c[iB], tipologia: c[iT], piso_p05: Number(c[iP05]), piso_p1: Number(c[iP1]), mediana: Number(c[iM]),
      teto_p995: Number(c[iP995]), escrituras: Number(c[iE]), janela,
    };
  });
};

const clampPiso = (v: number) => Math.max(LIMITES_INGESTAO.valorM2Min, Math.round(v));
const clampTeto = (v: number) => Math.min(LIMITES_INGESTAO.valorM2Max, Math.round(v));

export const entradaPadrao = (r: LinhaCalibracao): OutlierLimitEntry => ({
  piso: clampPiso(r.piso_p05 * PISO_MARGIN),
  teto: clampTeto(r.teto_p995 * TETO_MARGIN),
  p05: r.piso_p05, p1: r.piso_p1, p995: r.teto_p995, mediana: r.mediana, escrituras: r.escrituras, janela: "3 anos",
});

export const entradaAmostraPequena = (r: LinhaCalibracao): OutlierLimitEntry => ({
  piso: clampPiso(Math.min(r.piso_p05 * PISO_MARGIN, r.mediana / SMALL_SAMPLE_WIDTH)),
  teto: clampTeto(Math.max(r.teto_p995 * TETO_MARGIN, r.mediana * SMALL_SAMPLE_WIDTH)),
  p05: r.piso_p05, p1: r.piso_p1, p995: r.teto_p995, mediana: r.mediana, escrituras: r.escrituras, janela: "5 anos",
});

export const calcularTabelaCinto = (
  linhas: LinhaCalibracao[]
): { tabela: Record<string, OutlierLimitEntry>; excluidos: ParExcluido[] } => {
  const porPar = new Map<string, { r3?: LinhaCalibracao; r5?: LinhaCalibracao }>();
  for (const r of linhas) {
    if (!tipologiaValida(r.tipologia)) continue;
    const bairro = normalizeBairro(r.bairro);
    if (BAIRROS_SEM_CINTO.has(bairro)) continue;
    const chave = `${bairro}|${r.tipologia}`;
    const g = porPar.get(chave) ?? {};
    if (r.janela === "3 anos") g.r3 = r; else g.r5 = r;
    porPar.set(chave, g);
  }
  const tabela: Record<string, OutlierLimitEntry> = {};
  const excluidos: ParExcluido[] = [];
  for (const chave of [...porPar.keys()].sort()) {
    const par = porPar.get(chave);
    if (!par) continue;
    const { r3, r5 } = par;
    if (r3 && r3.escrituras >= MIN_ESCRITURAS_3_ANOS) tabela[chave] = entradaPadrao(r3);
    else if (r5 && r5.escrituras >= MIN_ESCRITURAS_CINTO) tabela[chave] = entradaAmostraPequena(r5);
    else excluidos.push({ chave, escrituras3: r3?.escrituras ?? 0, escrituras5: r5?.escrituras ?? 0 });
  }
  return { tabela, excluidos };
};

/** Faixa da cidade e fator do índice, exclusivamente do CSV da consulta 7.4b. */
export const parseCsvCidade = (csv: string): FaixaCidade => {
  const [cabecalho, linha, ...extras] = csv.trim().split(/\r?\n/);
  if (!linha || extras.some((x) => x.trim())) throw new Error("CSV da cidade deve ter exatamente uma linha");
  const nomes = cabecalho.split(",").map((x) => x.trim());
  const valores = linha.split(",").map((x) => x.trim());
  const ler = (nome: string) => {
    const idx = nomes.indexOf(nome);
    const valor = idx < 0 ? NaN : Number(valores[idx]);
    if (!Number.isFinite(valor) || valor <= 0) throw new Error(`CSV da cidade inválido: ${nome}`);
    return valor;
  };
  const piso = ler("piso_cidade"), teto = ler("teto_cidade"), escrituras = ler("escrituras");
  const fatorIndice5Anos = ler("fator_indice_5_anos");
  const fatorMinIndice5Anos = ler("fator_min_indice_5_anos");
  if (teto <= piso || escrituras < MIN_ESCRITURAS_3_ANOS) throw new Error("Faixa da cidade sem amostra ou limites válidos");
  if (fatorIndice5Anos < 1 || fatorIndice5Anos > 3) throw new Error(`fator_indice_5_anos fora do plausível: ${fatorIndice5Anos}`);
  // O último trimestre está na janela (fator 1), então o mínimo nunca passa de 1.
  if (fatorMinIndice5Anos > 1 || fatorMinIndice5Anos < 0.5) throw new Error(`fator_min_indice_5_anos fora do plausível: ${fatorMinIndice5Anos}`);
  return { piso, teto, escrituras, fatorIndice5Anos, fatorMinIndice5Anos };
};

/**
 * Constantes geradas para outlierLimits.ts. A tabela e a faixa da cidade estão
 * em preço do último trimestre. DEFAULT_OUTLIER_MIN e DEFAULT_OUTLIER_MAX são
 * aplicados direto sobre itbi_transactions (preço da época), então já saem
 * convertidos: piso ÷ maior fator, teto ÷ menor fator. O teto padrão (busca
 * sem bairro) parte do maior teto residencial da faixa padrão.
 */
export const calcularDefaultsCinto = (tabela: Record<string, OutlierLimitEntry>, cidade: FaixaCidade) => {
  // Só pares da faixa padrão (3 anos, >= 200 escrituras): uma amostra pequena com cauda gorda
  // (ex.: Casa com 60 escrituras) não pode definir o teto de todos os bairros sem calibração.
  const residenciais = Object.entries(tabela).filter(
    ([k, e]) => /\|(Apartamento|Casa)$/.test(k) && e.janela === "3 anos",
  );
  if (!residenciais.length) throw new Error("Sem pares residenciais da faixa padrão para gerar teto padrão");
  return {
    pisoCidade: cidade.piso,
    tetoCidade: cidade.teto,
    fator: cidade.fatorIndice5Anos,
    fatorMin: cidade.fatorMinIndice5Anos,
    tetoResidencial: Math.max(...residenciais.map(([, e]) => e.teto)),
    minimo: Math.round(cidade.piso / cidade.fatorIndice5Anos),
    maximo: Math.round(Math.max(...residenciais.map(([, e]) => e.teto)) / cidade.fatorMinIndice5Anos),
  };
};

/** Corpo do literal `OUTLIER_LIMITS_TABLE`, uma linha por par, na ordem das chaves. */
export const renderizarTabela = (tabela: Record<string, OutlierLimitEntry>): string =>
  Object.entries(tabela)
    .map(([k, e]) =>
      `  "${k}": { piso: ${e.piso}, teto: ${e.teto}, p05: ${e.p05}, p1: ${e.p1}, p995: ${e.p995}, mediana: ${e.mediana}, escrituras: ${e.escrituras}, janela: "${e.janela}" },`
    )
    .join("\n");

/** Bloco de constantes gerado (entre os marcadores de outlierLimits.ts). */
export const renderizarConstantes = (
  defaults: ReturnType<typeof calcularDefaultsCinto>,
  info: { data: string; pares: number; excluidos: number; csv74: string; csv74b: string; escrituras: number },
): string => [
  `// Última geração: ${info.data}, ${info.pares} pares, ${info.excluidos} excluídos por amostra,`,
  `// ${info.escrituras} escrituras residenciais na faixa da cidade.`,
  `// CSVs: ${info.csv74} e ${info.csv74b}.`,
  `/** Faixa da cidade (consulta 7.4b), em preço do último trimestre do índice. Carregada em itbi_cinto como CIDADE|*. */`,
  `export const FAIXA_SEM_CALIBRACAO_PISO = ${defaults.pisoCidade};`,
  `export const FAIXA_SEM_CALIBRACAO_TETO = ${defaults.tetoCidade};`,
  `/** Maior razão preço de hoje ÷ preço da época entre os trimestres da janela de 5 anos (consulta 7.4b). */`,
  `export const FATOR_INDICE_5_ANOS = ${defaults.fator};`,
  `/** Menor razão na mesma janela (trimestre mais caro que o último fica abaixo de 1). Converte o teto. */`,
  `export const FATOR_MIN_INDICE_5_ANOS = ${defaults.fatorMin};`,
  `/** Piso sem bairro calibrado, já em preço da época (FAIXA_SEM_CALIBRACAO_PISO ÷ FATOR_INDICE_5_ANOS). */`,
  `export const DEFAULT_OUTLIER_MIN = ${defaults.minimo};`,
  `/** Teto sem bairro, em preço da época: maior teto de Apartamento/Casa da faixa padrão (3 anos), ${defaults.tetoResidencial}, ÷ FATOR_MIN_INDICE_5_ANOS. */`,
  `export const DEFAULT_OUTLIER_MAX = ${defaults.maximo};`,
].join("\n");

/** SQL de carga separado: o script não executa. CIDADE|* é o fallback. */
export const renderizarSqlCinto = (
  tabela: Record<string, OutlierLimitEntry>,
  cidade: { piso: number; teto: number; escrituras: number },
  calibradoEm: string,
): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(calibradoEm)) throw new Error("Data de calibração inválida");
  const quote = (v: string) => `'${v.replace(/'/g, "''")}'`;
  const entries = Object.entries(tabela).sort(([a], [b]) => a.localeCompare(b)).map(([key, e]) => {
    const [bairro, tipologia] = key.split("|");
    return { bairro, tipologia, piso: e.piso, teto: e.teto, escrituras: e.escrituras, janela: e.janela ?? "3 anos" };
  });
  entries.push({ bairro: "CIDADE", tipologia: "*", piso: cidade.piso, teto: cidade.teto, escrituras: cidade.escrituras, janela: "3 anos" });
  const rows = entries.map(e => {
    if (![e.piso, e.teto, e.escrituras].every(Number.isFinite) || e.piso <= 0 || e.teto <= e.piso || e.escrituras < 30)
      throw new Error("Limites ou amostra inválidos para carga do cinto");
    return `(${quote(e.bairro)}, ${quote(e.tipologia)}, ${e.piso}, ${e.teto}, ${quote(e.janela)}, ${e.escrituras}, ${quote(calibradoEm)}::timestamptz)`;
  });
  return `-- Carga da tabela itbi_cinto gerada por bun run cinto. Preços corrigidos ao último trimestre do índice.\n-- Aplicar só depois do aceite (seção 2.5 da especificação).\nBEGIN;\nTRUNCATE TABLE public.itbi_cinto;\nINSERT INTO public.itbi_cinto (bairro, tipologia, piso, teto, janela, escrituras, calibrado_em) VALUES\n${rows.join(",\n")};\nCOMMIT;\n`;
};
