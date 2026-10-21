// Origem das linhas de itbi_transactions e a regra que impede a camada 8 do
// ArcGIS de sobrescrever um período já consolidado a partir da SMF.
//
// Desde 2026-10-21 itbi_transactions tem a coluna `fonte` ('arcgis' | 'smf').
// As linhas 'smf' vêm de itbi_consolidar_smf(), que agrega itbi_escrituras
// (uma linha por escritura, planilhas da SMF) na mesma chave natural. Como a
// SMF traz todas as escrituras e a camada 8 só uma parte, recarregar a camada
// 8 por cima de um período 'smf' trocaria dado completo por dado incompleto.
// sync-itbi-prefeitura e sync-itbi-daily chamam periodoCobertoPelaSmf() antes
// de gravar e recusam a carga, salvo `force: true` no corpo da requisição.
//
// Sem dependências: roda em Deno e no navegador (testes).

export type FonteItbi = "arcgis" | "smf";

/** Primeiro dia do mês, yyyy-mm-dd. */
export const inicioDoMes = (ano: number, mes: number): string =>
  `${ano}-${String(mes).padStart(2, "0")}-01`;

/**
 * Último dia real do mês, yyyy-mm-dd. Nunca usar "-31" fixo: o Postgres
 * rejeita 2026-02-31 e a verificação de fonte cairia no caminho de erro,
 * liberando a carga da camada 8 sem aviso.
 */
export const fimDoMes = (ano: number, mes: number): string => {
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return `${ano}-${String(mes).padStart(2, "0")}-${String(ultimo).padStart(2, "0")}`;
};

/**
 * Janelas trimestrais de consolidação, do início de `anoMin` até o fim do mês
 * `ate`. A consolidação de um ano inteiro da cidade passou de 150 s depois das
 * regras por prédio do cinto (itbi_aplicar_cinto), acima do limite de tempo das
 * funções do backend; um trimestre leva de 30 s a 60 s.
 */
export const janelasTrimestrais = (
  anoMin: number,
  ate: { ano: number; mes: number },
): { inicio: string; fim: string; rotulo: string }[] => {
  const janelas: { inicio: string; fim: string; rotulo: string }[] = [];
  for (let ano = anoMin; ano <= ate.ano; ano++) {
    for (let t = 0; t < 4; t++) {
      const mesInicio = t * 3 + 1;
      if (ano === ate.ano && mesInicio > ate.mes) break;
      const mesFim = ano === ate.ano ? Math.min(mesInicio + 2, ate.mes) : mesInicio + 2;
      janelas.push({ inicio: inicioDoMes(ano, mesInicio), fim: fimDoMes(ano, mesFim), rotulo: `${t + 1}º trimestre de ${ano}` });
    }
  }
  return janelas;
};

export interface DecisaoCarga {
  bloquear: boolean;
  motivo: string | null;
}

/**
 * Regra pura: bloqueia quando o período já tem linhas 'smf' e a chamada não
 * forçou. `linhasSmf` é a contagem devolvida por periodoCobertoPelaSmf().
 */
export const decidirCargaArcgis = (linhasSmf: number, force: boolean): DecisaoCarga => {
  if (linhasSmf > 0 && !force) {
    return {
      bloquear: true,
      motivo:
        `Período já consolidado a partir da SMF (${linhasSmf} linhas com fonte = smf). ` +
        "A camada 8 do ArcGIS é menos completa e não pode sobrescrever esses meses. " +
        "Para a carga mensal use scripts/itbi-smf; para forçar mesmo assim, envie force: true.",
    };
  }
  return { bloquear: false, motivo: null };
};

/** Cliente mínimo (supabase-js) para não arrastar tipos gerados para cá. */
interface ClienteContagem {
  from: (tabela: string) => {
    select: (colunas: string, opts: { count: "exact"; head: true }) => {
      eq: (col: string, v: string) => {
        gte: (col: string, v: string) => {
          lte: (col: string, v: string) => Promise<{ count: number | null; error: { message: string } | null }>;
        };
      };
    };
  };
}

/**
 * Conta linhas 'smf' em itbi_transactions no período [inicio, fim] (datas
 * ISO yyyy-mm-dd). Se a coluna ainda não existir (migration não aplicada),
 * devolve 0 e avisa no log, para a carga antiga continuar funcionando.
 */
export const periodoCobertoPelaSmf = async (
  supabase: ClienteContagem,
  inicio: string,
  fim: string
): Promise<number> => {
  const { count, error } = await supabase
    .from("itbi_transactions")
    .select("id", { count: "exact", head: true })
    .eq("fonte", "smf")
    .gte("data_transacao", inicio)
    .lte("data_transacao", fim);
  if (error) {
    console.warn("[itbiFonte] não foi possível verificar a fonte (migration aplicada?):", error.message);
    return 0;
  }
  return count ?? 0;
};
