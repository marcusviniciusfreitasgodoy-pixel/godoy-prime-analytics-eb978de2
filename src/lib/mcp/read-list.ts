import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";
import { consultarPagina } from "./pagination";

export const readOnlyAnnotations = { readOnlyHint: true, idempotentHint: true, openWorldHint: false };

export async function lerLista(ctx: ToolContext, tabela: string, colunas: string, ordem: string, pagina = 1, limite = 20) {
  if (!ctx.isAuthenticated()) throw new ToolError("Autenticação necessária.");
  const client = supabaseForUser(ctx);
  const result = await consultarPagina((from, to) => client
    .from(tabela as never)
    .select(colunas, { count: "exact" })
    .order(ordem, { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(from, to), pagina, limite);
  return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
}