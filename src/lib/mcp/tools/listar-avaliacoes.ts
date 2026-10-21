import { defineTool } from "@lovable.dev/mcp-js";
import { paginationSchema } from "../pagination";
import { lerLista, readOnlyAnnotations } from "../read-list";

export default defineTool({
  name: "listar_avaliacoes",
  title: "Listar avaliações",
  description: "Avaliações em páginas, das mais recentes às mais antigas, com total exato de registros permitidos à conta conectada. Percorra proxima_pagina até null para consultar todo o histórico.",
  inputSchema: paginationSchema,
  annotations: readOnlyAnnotations,
  handler: ({ pagina, limite }, ctx) => lerLista(ctx, "valuations",
    "id, created_at, logradouro, numero, bairro, nome_condominio, property_type, property_area_m2, quartos, final_value_min, final_value_med, final_value_max, itbi_med_m2, itbi_transaction_count, confidence_level",
    "created_at", pagina, limite),
});