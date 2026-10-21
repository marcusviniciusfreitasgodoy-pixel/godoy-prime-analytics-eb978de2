import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { consultarPagina } from "../pagination";
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
    pagina: z_pagination().pagina,
    limite: z_pagination().limite,
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

function z_pagination() {
  // Reaproveita o schema de paginação sem import circular: mesmos limites (1-100).
  return {
    pagina: z_pagina(),
    limite: z_limite(),
  };
}

import { z } from "zod";
function z_pagina() {
  return z.number().int().min(1).max(Number.MAX_SAFE_INTEGER / 100).optional()
    .describe("Página a consultar, começando em 1 (padrão 1).");
}
function z_limite() {
  return z.number().int().min(1).max(100).optional()
    .describe("Registros por página, de 1 a 100 (padrão 20).");
}
