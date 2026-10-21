import { defineTool } from "@lovable.dev/mcp-js";
import { paginationSchema } from "../pagination";
import { lerLista, readOnlyAnnotations } from "../read-list";

export default defineTool({
  name: "listar_leads",
  title: "Listar leads",
  description: "Leads em páginas, dos mais recentes aos mais antigos, com total exato de registros permitidos à conta conectada. Percorra proxima_pagina até null para consultar todo o histórico.",
  inputSchema: paginationSchema,
  annotations: readOnlyAnnotations,
  handler: ({ pagina, limite }, ctx) => lerLista(ctx, "leads",
    "id, nome, estagio_pipeline, interesse, bairro_interesse, valor_interesse, urgencia, origem, responsavel_nome, ultimo_contato, created_at",
    "created_at", pagina, limite),
});