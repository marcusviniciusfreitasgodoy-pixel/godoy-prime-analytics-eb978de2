import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "estatisticas_mercado",
  title: "Estatísticas de mercado (ITBI)",
  description:
    "Mediana, média e faixa de R$/m² de escrituras do ITBI para um bairro (e opcionalmente uma rua), com o mesmo motor da plataforma: ponderado por escrituras, sem outliers e corrigido no tempo.",
  inputSchema: {
    bairro: z.string().min(2).describe("Bairro do Rio de Janeiro, ex.: 'Barra da Tijuca'."),
    logradouro: z.string().min(3).optional().describe("Rua/avenida, ex.: 'Rua Desenhista Luiz Guimarães'."),
    tipologia: z.enum(["Apartamento", "Casa", "Comercial"]).optional().describe("Tipo de imóvel."),
    janela_meses: z.union([z.literal(12), z.literal(24), z.literal(36), z.literal(48), z.literal(60)])
      .optional().describe("Período em meses (padrão 12)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ bairro, logradouro, tipologia, janela_meses }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Autenticação necessária.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.functions.invoke("public-itbi-stats", {
      body: { action: "stats", bairro, logradouro, tipologia, janela_meses: janela_meses ?? 12 },
    });
    if (error) throw new ToolError("Não foi possível consultar o ITBI agora.");
    if (!data?.stats) {
      return { content: [{ type: "text", text: "Dados insuficientes para esta localização." }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(data.stats) }] };
  },
});
