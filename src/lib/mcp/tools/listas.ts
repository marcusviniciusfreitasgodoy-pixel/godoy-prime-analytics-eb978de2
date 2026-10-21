import { defineTool, ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

// Leituras pelo login do próprio usuário: as regras de acesso da organização decidem o que aparece.
async function ler(ctx: ToolContext, tabela: string, colunas: string, ordem: string, limite: number) {
  if (!ctx.isAuthenticated()) throw new ToolError("Autenticação necessária.");
  const { data, error } = await supabaseForUser(ctx)
    .from(tabela as never)
    .select(colunas)
    .order(ordem, { ascending: false })
    .limit(limite);
  if (error) throw new ToolError("Não foi possível ler os dados agora.");
  return { content: [{ type: "text" as const, text: JSON.stringify(data ?? []) }] };
}

const limite = z.number().int().min(1).max(100).optional().describe("Quantidade máxima (padrão 20).");
const ro = { readOnlyHint: true, idempotentHint: true, openWorldHint: false };

export const listarVisitas = defineTool({
  name: "listar_visitas",
  title: "Listar visitas",
  description: "Fichas de visita mais recentes (data, imóvel, visitante, corretor, status).",
  inputSchema: { limite },
  annotations: ro,
  handler: ({ limite: n }, ctx) =>
    ler(ctx, "fichas_visita",
      "id, codigo, data_visita, status, endereco_imovel, condominio_edificio, nome_visitante, nome_corretor, valor_imovel",
      "data_visita", n ?? 20),
});

export const listarLeads = defineTool({
  name: "listar_leads",
  title: "Listar leads",
  description: "Leads mais recentes com estágio no funil, interesse e responsável.",
  inputSchema: { limite },
  annotations: ro,
  handler: ({ limite: n }, ctx) =>
    ler(ctx, "leads",
      "id, nome, estagio_pipeline, interesse, bairro_interesse, valor_interesse, urgencia, origem, responsavel_nome, ultimo_contato, created_at",
      "created_at", n ?? 20),
});

export const listarAutorizacoes = defineTool({
  name: "listar_autorizacoes",
  title: "Listar autorizações de captação",
  description: "Autorizações de captação e venda com status de assinatura.",
  inputSchema: { limite },
  annotations: ro,
  handler: ({ limite: n }, ctx) =>
    ler(ctx, "autorizacoes_captacao",
      "id, codigo, status, proprietario_nome, endereco, numero, bairro, valor_venda, data_envio, data_assinatura_proprietario, data_vencimento",
      "created_at", n ?? 20),
});

export const listarAvaliacoes = defineTool({
  name: "listar_avaliacoes",
  title: "Listar avaliações",
  description: "Avaliações de imóveis realizadas, com faixa de valor e quantidade de escrituras usadas.",
  inputSchema: { limite },
  annotations: ro,
  handler: ({ limite: n }, ctx) =>
    ler(ctx, "valuations",
      "id, created_at, logradouro, numero, bairro, nome_condominio, property_type, property_area_m2, quartos, final_value_min, final_value_med, final_value_max, itbi_med_m2, itbi_transaction_count, confidence_level",
      "created_at", n ?? 20),
});
