import { defineTool } from "@lovable.dev/mcp-js";
import { paginationSchema } from "../pagination";
import { lerLista, readOnlyAnnotations } from "../read-list";

export default defineTool({
  name: "listar_visitas",
  title: "Listar visitas",
  description: "Fichas de visita em páginas, das mais recentes às mais antigas, com total exato de registros permitidos à conta conectada. Percorra proxima_pagina até null para consultar todo o histórico.",
  inputSchema: paginationSchema,
  annotations: readOnlyAnnotations,
  handler: ({ pagina, limite }, ctx) => lerLista(ctx, "fichas_visita",
    "id, codigo, data_visita, status, endereco_imovel, condominio_edificio, nome_visitante, nome_corretor, valor_imovel",
    "data_visita", pagina, limite),
});