import { defineTool } from "@lovable.dev/mcp-js";
import { paginationSchema } from "../pagination";
import { lerLista, readOnlyAnnotations } from "../read-list";

export default defineTool({
  name: "listar_autorizacoes",
  title: "Listar autorizações de captação",
  description: "Autorizações de captação em páginas, das mais recentes às mais antigas, com total exato de registros permitidos à conta conectada. Percorra proxima_pagina até null para consultar todo o histórico.",
  inputSchema: paginationSchema,
  annotations: readOnlyAnnotations,
  handler: ({ pagina, limite }, ctx) => lerLista(ctx, "autorizacoes_captacao",
    "id, codigo, status, proprietario_nome, endereco, numero, bairro, valor_venda, data_envio, data_assinatura_proprietario, data_vencimento",
    "created_at", pagina, limite),
});