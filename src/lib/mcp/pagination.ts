import { ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

export const paginationSchema = {
  pagina: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER / 100).optional()
    .describe("Página a consultar, começando em 1 (padrão 1)."),
  limite: z.number().int().min(1).max(100).optional()
    .describe("Registros por página, de 1 a 100 (padrão 20)."),
};

// O total deve vir da mesma consulta autenticada que lê a página, nunca de um cliente privilegiado.
export async function consultarPagina<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; count: number | null; error: unknown }>,
  pagina = 1,
  limite = 20,
) {
  const parsed = z.object(paginationSchema).parse({ pagina, limite });
  const page = parsed.pagina ?? 1;
  const size = parsed.limite ?? 20;
  const from = (page - 1) * size;
  const { data, count, error } = await build(from, from + size - 1);
  if (error || count === null) throw new ToolError("Não foi possível consultar a página e o total de registros agora.");
  const registros = data ?? [];
  const totalPaginas = Math.ceil(count / size);
  return {
    registros,
    pagina: page,
    limite: size,
    total_registros: count,
    total_paginas: totalPaginas,
    tem_proxima_pagina: page < totalPaginas,
    proxima_pagina: page < totalPaginas ? page + 1 : null,
  };
}