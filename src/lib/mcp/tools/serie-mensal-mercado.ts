import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { fetchPaged } from "../../../../supabase/functions/_shared/fetchPaged.ts";
import {
  bairroSchema,
  logradouroSchema,
  resolverBairro,
  serieMensal,
  tipologiaSchema,
  type EscrituraMercado,
} from "../mercado";
import { readOnlyAnnotations } from "../read-list";
import { supabaseForUser } from "../supabase";

const MAX_ESCRITURAS = 30000;

export default defineTool({
  name: "serie_mensal_mercado",
  title: "Série mensal de mercado (ITBI)",
  description:
    "Agregado mês a mês das escrituras do ITBI de um ano, a partir das mesmas escrituras individuais de listar_transacoes_mercado e da mesma fonte de estatisticas_mercado: transações, mediana e média ponderada de R$/m², valor total e valor médio por mês. Valores nominais (preço da época), deflacionado: false — não comparar diretamente com a estatística corrigida no tempo.",
  inputSchema: {
    bairro: bairroSchema,
    logradouro: logradouroSchema,
    tipologia: tipologiaSchema,
    ano: z_ano(),
  },
  annotations: readOnlyAnnotations,
  handler: async ({ bairro, logradouro, tipologia, ano }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Autenticação necessária.");
    const anoCorrente = new Date().getUTCFullYear();
    const anoEfetivo = typeof ano === "number" && Number.isInteger(ano) && ano >= 2015 && ano <= anoCorrente + 1
      ? ano
      : anoCorrente;
    const inicio = `${anoEfetivo}-01-01`;
    const fim = `${anoEfetivo}-12-31`;
    const client = supabaseForUser(ctx);
    let rows: EscrituraMercado[];
    try {
      rows = await fetchPaged((from, to) => {
        let q = client
          .from("itbi_escrituras_mercado" as never)
          .select("id, data_transacao, logradouro, numero, tipologia, area_m2, valor_transacao, valor_m2")
          .eq("bairro", resolverBairro(bairro))
          .gte("data_transacao", inicio)
          .lte("data_transacao", fim)
          .order("data_transacao", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to);
        if (logradouro && logradouro.trim()) q = q.ilike("logradouro", `%${logradouro.trim()}%`);
        if (tipologia) q = q.eq("tipologia", tipologia);
        return q;
      }, MAX_ESCRITURAS);
    } catch {
      throw new ToolError("Não foi possível consultar as escrituras agora.");
    }
    const meses = serieMensal(rows, anoEfetivo);
    const payload = {
      bairro: resolverBairro(bairro),
      ...(logradouro && logradouro.trim() ? { logradouro: logradouro.trim() } : {}),
      ...(tipologia ? { tipologia } : {}),
      ano: anoEfetivo,
      deflacionado: false,
      preco: "valores nominais da época de cada escritura",
      total_escrituras: meses.reduce((s, m) => s + m.transaction_count, 0),
      meses,
      ...(meses.length === 0 ? { mensagem: "Dados insuficientes para esta localização e período." } : {}),
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
  },
});

function z_ano() {
  return z_anoSchema();
}

import { z } from "zod";
function z_anoSchema() {
  return z.number().int().min(2015).max(new Date().getUTCFullYear() + 1).optional()
    .describe("Ano da série (padrão: ano corrente).");
}
