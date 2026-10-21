import { auth, defineMcp } from "@lovable.dev/mcp-js";
import estatisticasMercado from "./tools/estatisticas-mercado";
import listarAutorizacoes from "./tools/listar-autorizacoes";
import listarAvaliacoes from "./tools/listar-avaliacoes";
import listarLeads from "./tools/listar-leads";
import listarTransacoesMercado from "./tools/listar-transacoes-mercado";
import listarVisitas from "./tools/listar-visitas";
import serieMensalMercado from "./tools/serie-mensal-mercado";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "godoy-prime-analytics",
  title: "Godoy Prime Analytics",
  version: "0.2.0",
  instructions:
    "Ferramentas de consulta da Godoy Prime Analytics (mercado imobiliário do Rio de Janeiro). Responda em pt-BR. Estatísticas de ITBI vêm de escrituras agregadas e já ponderadas; quando a ferramenta disser 'Dados insuficientes', não invente números. Visitas, leads, autorizações e avaliações mostram só o que o usuário conectado pode ver. As listas retornam registros, total_registros permitido, pagina e proxima_pagina. Para consultar o histórico completo, use proxima_pagina até null; nunca apresente uma única página como resumo completo. Limite é o tamanho da página, não um teto do histórico. Dados podem mudar durante a consulta de várias páginas.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [estatisticasMercado, listarVisitas, listarLeads, listarAutorizacoes, listarAvaliacoes],
});
