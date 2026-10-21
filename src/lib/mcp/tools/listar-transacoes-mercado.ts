import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { paginationSchema } from "../pagination";
import { readOnlyAnnotations } from "../read-list";
import { supabaseForUser } from "../supabase";
import {
  bairroSchema,
  janelaDePeriodo,
  logradouroSchema,
  mapearRegistro,
  periodoSchema,
  resolverBairro,
  tipologiaSchema,
} from "../mercado";

export default defineTool({
  name: "listar_transacoes_mercado",
  title: "Listar transações de mercado (ITBI)",
  description:
    "Escrituras individuais do ITBI em páginas, das mais recentes às mais antigas, com total exato de registros. Cada registro traz só dados do imóvel e da transação (data, logradouro, número, tipologia, área e valor) — sem nomes das partes nem dados pessoais. Valores nominais (preço da época), deflacionado: false. Use proxima_pagina até null para consultar todo o período.",
  inputSchema: {
    bairro: bairroSchema,
    logradouro: logradouroSchema,
    tipologia: tipologiaSchema,
    ...periodoSchema,
    pagina: paginationSchema.pagina,
    limite: paginationSchema.limite,
  },
  annotations: readOnlyAnnotations,
  handler: async ({ bairro, logradouro, tipologia, ano, data_inicio, data_fim, pagina, limite }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Autenticação necessária.");
    const { inicio, fim } = janelaDePeriodo(ano, data_inicio, data_fim);
    const client = supabaseForUser(ctx);
    const result = await consultarPagina((from, to) => {
      let q = client
        .from("itbi_escrituras_mercado" as never)
        .select("id, data_transacao, logradouro, numero, tipologia, area_m2, valor_transacao, valor_m2", { count: "exact" })
        .eq("bairro", resolverBairro(bairro))
        .gte("data_transacao", inicio)
        .lte("data_transacao", fim)
        .order("data_transacao", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
      if (logradouro && logradouro.trim()) q = q.ilike("logradouro", `%${logradouro.trim()}%`);
      if (tipologia) q = q.eq("tipologia", tipologia);
      return q;
    }, pagina, limite);
    const payload = {
      ...result,
      registros: result.registros.map(mapearRegistro),
      deflacionado: false,
      preco: "valores nominais da época de cada escritura",
    };
    return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
  },
});
