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
  version: "0.3.0",
  instructions:
    "Ferramentas de consulta da Godoy Prime Analytics (mercado imobiliário do Rio de Janeiro). Responda em pt-BR. Estatísticas de ITBI vêm de escrituras agregadas e já ponderadas; quando a ferramenta disser 'Dados insuficientes', não invente números. listar_transacoes_mercado traz cada escritura individual (só imóvel, data e valor, sem dados pessoais) e serie_mensal_mercado agrega mês a mês; ambas devolvem valores nominais da época (deflacionado: false), que não devem ser comparados diretamente com a estatística corrigida no tempo de estatisticas_mercado. Visitas, leads, autorizações e avaliações mostram só o que o usuário conectado pode ver. As listas retornam registros, total_registros permitido, pagina e proxima_pagina. Para consultar o histórico completo, use proxima_pagina até null; nunca apresente uma única página como resumo completo. Limite é o tamanho da página, não um teto do histórico. Dados podem mudar durante a consulta de várias páginas.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [estatisticasMercado, listarTransacoesMercado, serieMensalMercado, listarVisitas, listarLeads, listarAutorizacoes, listarAvaliacoes],
});
