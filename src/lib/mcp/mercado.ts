import { ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolverNomeBairro } from "../../../../supabase/functions/_shared/bairrosRio.ts";

// Helpers compartilhados pelas ferramentas de mercado por escritura individual.
// Mesma fonte de estatisticas_mercado: itbi_escrituras via a view
// itbi_escrituras_mercado (uso residencial, aceitas, sem dados pessoais).

export const bairroSchema = z.string().min(2).max(100)
  .describe("Bairro do Rio de Janeiro, ex.: 'Barra da Tijuca'.");

export const logradouroSchema = z.string().min(3).max(200).optional()
  .describe("Rua/avenida, ex.: 'Avenida Lúcio Costa'.");

export const tipologiaSchema = z.enum(["Apartamento", "Casa", "Comercial"]).optional()
  .describe("Tipo de imóvel.");

const ANO_MIN = 2015;

export const periodoSchema = {
  ano: z.number().int().min(ANO_MIN).max(2100).optional()
    .describe("Ano da transação (padrão: ano corrente)."),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato YYYY-MM-DD.").optional()
    .describe("Data inicial (YYYY-MM-DD), inclusive."),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato YYYY-MM-DD.").optional()
    .describe("Data final (YYYY-MM-DD), inclusive."),
};

export function resolverBairro(bairro: string): string {
  const normalizado = resolverNomeBairro(bairro);
  if (!normalizado) throw new ToolError("Informe o bairro.");
  return normalizado;
}

// Janela de datas da consulta: o ano delimita o período (padrão: ano corrente)
// e data_inicio/data_fim refinam a janela dentro dele. Sem nenhum dos dois,
// vale o ano corrente inteiro.
export function janelaDePeriodo(
  ano?: number,
  dataInicio?: string,
  dataFim?: string,
): { inicio: string; fim: string } {
  const anoCorrente = new Date().getUTCFullYear();
  const anoEfetivo = z.number().int().min(ANO_MIN).max(anoCorrente + 1)
    .default(anoCorrente).catch(() => anoCorrente).parse(ano);
  let inicio = `${anoEfetivo}-01-01`;
  let fim = `${anoEfetivo}-12-31`;
  if (dataInicio) {
    if (!dataFim) throw new ToolError("Informe data_inicio e data_fim juntas, ou apenas o ano.");
    if (dataInicio > inicio) inicio = dataInicio;
  }
  if (dataFim) {
    if (!dataInicio) throw new ToolError("Informe data_inicio e data_fim juntas, ou apenas o ano.");
    if (dataFim < fim) fim = dataFim;
  }
  if (inicio > fim) throw new ToolError("Período inválido: data_inicio é posterior a data_fim.");
  return { inicio, fim };
}

export type EscrituraMercado = {
  data_transacao: string;
  logradouro: string;
  numero: string | null;
  tipologia: string;
  area_m2: number | string | null;
  valor_transacao: number | string | null;
  valor_m2: number | string | null;
};

const numero = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Registro de saída: só dados do imóvel e da transação. Nunca incluir nomes das
// partes, CPF ou qualquer dado pessoal (LGPD).
export function mapearRegistro(r: EscrituraMercado) {
  return {
    data_transacao: r.data_transacao,
    logradouro: r.logradouro,
    numero: r.numero ?? null,
    tipologia: r.tipologia,
    area_m2: numero(r.area_m2),
    valor: numero(r.valor_transacao),
    valor_m2: numero(r.valor_m2),
  };
}

export function mediana(valores: number[]): number | null {
  const validos = valores.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (validos.length === 0) return null;
  const meio = Math.floor(validos.length / 2);
  return validos.length % 2 === 1
    ? validos[meio]!
    : Math.round(((validos[meio - 1]! + validos[meio]!) / 2) * 100) / 100;
}

export type MesAgregado = {
  mes: string; // "2026-01"
  transaction_count: number;
  med_m2: number | null;
  media_ponderada_m2: number | null;
  valor_total: number;
  valor_medio: number | null;
};

const arredondar2 = (v: number) => Math.round(v * 100) / 100;

// Agrega as escrituras mês a mês. Mediana por escritura; média ponderada é
// soma(valor) / soma(área), o mesmo R$/m² do grupo consolidado.
export function serieMensal(rows: EscrituraMercado[], ano: number): MesAgregado[] {
  const porMes = new Map<string, EscrituraMercado[]>();
  for (const r of rows) {
    const mes = String(r.data_transacao).slice(0, 7);
    if (!mes.startsWith(`${ano}-`)) continue;
    const lista = porMes.get(mes) ?? [];
    lista.push(r);
    porMes.set(mes, lista);
  }
  return [...porMes.keys()].sort().map((mes) => {
    const lista = porMes.get(mes)!;
    const valorTotal = lista.reduce((s, r) => s + (numero(r.valor_transacao) ?? 0), 0);
    const areaTotal = lista.reduce((s, r) => s + (numero(r.area_m2) ?? 0), 0);
    return {
      mes,
      transaction_count: lista.length,
      med_m2: mediana(lista.map((r) => numero(r.valor_m2) ?? Number.NaN)),
      media_ponderada_m2: areaTotal > 0 ? arredondar2(valorTotal / areaTotal) : null,
      valor_total: arredondar2(valorTotal),
      valor_medio: lista.length > 0 ? arredondar2(valorTotal / lista.length) : null,
    };
  });
}
