// Etapas da carga do ITBI por escritura (planilhas da SMF) usadas pelo painel
// do admin (src/components/admin/CargaItbiSmf.tsx) e pela carga agendada
// (scripts/itbi-smf/carga-mensal.ts). Os dois caminhos TÊM de usar estas
// funções: o id de cada escritura (normalizarEscrituras) leva um sufixo de
// ocorrência que depende de quais linhas entram juntas em cada chamada. Se um
// caminho agrupasse os bairros de outro jeito, a mesma venda ganharia outro id
// e entraria em dobro em itbi_escrituras.
//
// Sem dependências além de itbiSmf.ts: roda no navegador, em Bun e em Deno.

import {
  type BuscarJson,
  type EscrituraSmf,
  geocodificarEscrituras,
  type LerFaixa,
  lerPlanilhaSmf,
  type LinhaSmf,
  normalizarEscrituras,
} from "./itbiSmf.ts";

/** Bairros por chamada de normalização e geocodificação. Não mudar sem migrar os ids. */
export const BAIRROS_POR_GRUPO = 12;

/** Escrituras por chamada da ação "gravar" de ingest-itbi-smf (o limite da função). */
export const LOTE_GRAVACAO = 1000;

/** Anos cobertos pelo arquivo, pelo nome (PERIODO_2019_2024, 2025_diante). */
export const anosDoArquivo = (nome: string): [number, number] => {
  const p = nome.match(/PERIODO_(\d{4})_(\d{4})/i);
  if (p) return [Number(p[1]), Number(p[2])];
  const d = nome.match(/(\d{4})_diante/i);
  if (d) return [Number(d[1]), 9999];
  return [0, 9999];
};

/** Código do bairro como o painel sempre usou: CD_BAIRRO sem zeros à esquerda. */
export const codigoDoBairro = (l: LinhaSmf): string => String(parseInt(l.CD_BAIRRO, 10) || 0);

/**
 * Lê a planilha uma vez e separa as linhas por bairro, na ordem do arquivo.
 * `aoLer` recebe o total de linhas lidas a cada 20 mil.
 */
export const lerPorBairro = async (
  ler: LerFaixa,
  tamanho: number,
  opcoes: { bairros?: Set<string>; desde?: number },
  aoLer?: (lidas: number) => void,
): Promise<Map<string, LinhaSmf[]>> => {
  const porBairro = new Map<string, LinhaSmf[]>();
  let lidas = 0;
  for await (const l of lerPlanilhaSmf(ler, tamanho, { bairros: opcoes.bairros, desde: opcoes.desde })) {
    const cod = codigoDoBairro(l);
    if (!porBairro.has(cod)) porBairro.set(cod, []);
    porBairro.get(cod)!.push(l);
    lidas++;
    if (aoLer && lidas % 20000 === 0) aoLer(lidas);
  }
  return porBairro;
};

/** Códigos de bairro em ordem numérica, em grupos de BAIRROS_POR_GRUPO. */
export const gruposDeBairros = (codigos: Iterable<string>): string[][] => {
  const ordenados = [...codigos].sort((a, b) => Number(a) - Number(b));
  const grupos: string[][] = [];
  for (let g = 0; g < ordenados.length; g += BAIRROS_POR_GRUPO) grupos.push(ordenados.slice(g, g + BAIRROS_POR_GRUPO));
  return grupos;
};

/** Normaliza (gera os ids) e geocodifica as linhas de um grupo de bairros. */
export const prepararGrupo = async (
  porBairro: Map<string, LinhaSmf[]>,
  grupo: string[],
  arquivo: string,
  buscar: BuscarJson,
): Promise<EscrituraSmf[]> => {
  const linhas = grupo.flatMap((c) => porBairro.get(c) ?? []);
  const escrituras = await normalizarEscrituras(linhas, arquivo);
  return geocodificarEscrituras(escrituras, buscar);
};

/** Último ano/mês presente nas escrituras (ou o atual, se for maior). */
export const ultimoMesDe = (
  escrituras: Pick<EscrituraSmf, "ano" | "mes">[],
  atual: { ano: number; mes: number },
): { ano: number; mes: number } =>
  escrituras.reduce(
    (m, e) => (e.ano > m.ano || (e.ano === m.ano && e.mes > m.mes) ? { ano: e.ano, mes: e.mes } : m),
    atual,
  );
