// Geração da tabela OUTLIER_LIMITS_TABLE a partir do CSV da consulta 7.4
// (docs/calibracao-consultas.sql). Regras da seção 2.5 da especificação:
//   - par com >= MIN_ESCRITURAS_3_ANOS escrituras em 3 anos: janela de 3 anos,
//     piso = P1 × 0,85, teto = P99,5 × 1,15;
//   - senão, par com >= MIN_ESCRITURAS_CINTO escrituras em 5 anos: janela de
//     5 anos e largura mínima [mediana / 2; mediana × 2];
//   - senão, fora da tabela (cai na faixa do bairro ou nos padrões).
// Sem dependências além de outlierLimits.ts: roda em Bun, Deno e no navegador.
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
export const MIN_ESCRITURAS_3_ANOS = 200;

export interface LinhaCalibracao {
  bairro: string;
  tipologia: string;
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
  const iB = idx("bairro"), iT = idx("tipologia"), iP1 = idx("piso_p1"), iM = idx("mediana"),
    iP995 = idx("teto_p995"), iE = idx("escrituras"), iJ = idx("janela");
  return linhas.slice(1).filter((l) => l.trim()).map((l) => {
    const c = l.split(",").map((x) => x.trim());
    const janela = c[iJ];
    if (janela !== "3 anos" && janela !== "5 anos") throw new Error(`janela desconhecida "${janela}" em: ${l}`);
    return {
      bairro: c[iB], tipologia: c[iT], piso_p1: Number(c[iP1]), mediana: Number(c[iM]),
      teto_p995: Number(c[iP995]), escrituras: Number(c[iE]), janela,
    };
  });
};

const clampPiso = (v: number) => Math.max(LIMITES_INGESTAO.valorM2Min, Math.round(v));
const clampTeto = (v: number) => Math.min(LIMITES_INGESTAO.valorM2Max, Math.round(v));

export const entradaPadrao = (r: LinhaCalibracao): OutlierLimitEntry => ({
  piso: clampPiso(r.piso_p1 * PISO_MARGIN),
  teto: clampTeto(r.teto_p995 * TETO_MARGIN),
  p1: r.piso_p1, p995: r.teto_p995, mediana: r.mediana, escrituras: r.escrituras, janela: "3 anos",
});

export const entradaAmostraPequena = (r: LinhaCalibracao): OutlierLimitEntry => ({
  piso: clampPiso(Math.min(r.piso_p1 * PISO_MARGIN, r.mediana / SMALL_SAMPLE_WIDTH)),
  teto: clampTeto(Math.max(r.teto_p995 * TETO_MARGIN, r.mediana * SMALL_SAMPLE_WIDTH)),
  p1: r.piso_p1, p995: r.teto_p995, mediana: r.mediana, escrituras: r.escrituras, janela: "5 anos",
});

export const calcularTabelaCinto = (
  linhas: LinhaCalibracao[]
): { tabela: Record<string, OutlierLimitEntry>; excluidos: ParExcluido[] } => {
  const porPar = new Map<string, { r3?: LinhaCalibracao; r5?: LinhaCalibracao }>();
  for (const r of linhas) {
    if (!tipologiaValida(r.tipologia)) continue;
    const chave = `${normalizeBairro(r.bairro)}|${r.tipologia}`;
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

/** Faixa de fallback obtida exclusivamente do CSV da consulta 7.4b. */
export const parseCsvCidade = (csv: string): { piso: number; teto: number; escrituras: number } => {
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
  if (teto <= piso || escrituras < MIN_ESCRITURAS_3_ANOS) throw new Error("Faixa da cidade sem amostra ou limites válidos");
  return { piso, teto, escrituras };
};

export const calcularDefaultsCinto = (tabela: Record<string, OutlierLimitEntry>, cidade: { piso: number; teto: number }) => {
  const residenciais = Object.entries(tabela).filter(([k]) => /\|(Apartamento|Casa)$/.test(k));
  if (!residenciais.length) throw new Error("Sem pares residenciais calibrados para gerar teto padrão");
  return { pisoCidade: cidade.piso, tetoCidade: cidade.teto, minimo: cidade.piso,
    maximo: Math.max(...residenciais.map(([, e]) => e.teto)) };
};

/** Corpo do literal `OUTLIER_LIMITS_TABLE`, uma linha por par, na ordem das chaves. */
export const renderizarTabela = (tabela: Record<string, OutlierLimitEntry>): string =>
  Object.entries(tabela)
    .map(([k, e]) =>
      `  "${k}": { piso: ${e.piso}, teto: ${e.teto}, p1: ${e.p1}, p995: ${e.p995}, mediana: ${e.mediana}, escrituras: ${e.escrituras}, janela: "${e.janela}" },`
    )
    .join("\n");
