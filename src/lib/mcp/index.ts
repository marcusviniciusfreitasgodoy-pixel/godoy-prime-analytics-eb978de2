import { auth, defineMcp } from "@lovable.dev/mcp-js";
import estatisticasMercado from "./tools/estatisticas-mercado";
import { listarAutorizacoes, listarAvaliacoes, listarLeads, listarVisitas } from "./tools/listas";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "godoy-prime-analytics",
  title: "Godoy Prime Analytics",
  version: "0.1.0",
  instructions:
    "Ferramentas de consulta da Godoy Prime Analytics (mercado imobiliário do Rio de Janeiro). Responda em pt-BR. Estatísticas de ITBI vêm de escrituras agregadas e já ponderadas; quando a ferramenta disser 'Dados insuficientes', não invente números. Visitas, leads, autorizações e avaliações mostram só o que o usuário conectado pode ver.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [estatisticasMercado, listarVisitas, listarLeads, listarAutorizacoes, listarAvaliacoes],
});
