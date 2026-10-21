-- Consulta de escrituras individuais por usuários autenticados (2026-10-21).
--
-- Decisão do dono do produto: valores e datas de escrituras individuais podem
-- ser consultados por usuários autenticados, preservando token e RLS da base,
-- sem nomes das partes, CPF ou outros dados pessoais. A tabela crua
-- itbi_escrituras permanece só para admin (RLS de admin mantida); a view
-- itbi_escrituras_mercado expõe apenas imóvel, data e valor — sem complemento,
-- CEP, cod_lote ou cod_quadra, colunas que combinadas elevam o risco de
-- reidentificação.
--
-- Controle de acesso: Postgres não suporta RLS em views, então o acesso é
-- controlado por GRANT — SELECT só para authenticated e service_role; anon e
-- PUBLIC não têm nenhum privilégio. A view roda com os privilégios do dono
-- (security_invoker = false), lendo a base sem abrir a tabela crua.
--
-- Filtro da view igual à fonte de estatisticas_mercado: uso residencial,
-- escrituras aceitas na ingestão (aceita), tipologias de imóvel (exclui Outro).
-- Quando o cinto pré-agregação marcar escrituras fora do cinto (aceita=false),
-- a view passa a refleti-las automaticamente.

CREATE OR REPLACE VIEW public.itbi_escrituras_mercado
WITH (security_invoker = false) AS
SELECT
  e.id,
  e.bairro,
  e.data_transacao,
  e.logradouro,
  e.numero,
  e.tipologia,
  e.area_m2,
  e.valor_transacao,
  e.valor_m2
FROM public.itbi_escrituras e
WHERE e.uso = 'Residencial'
  AND e.aceita
  AND e.tipologia <> 'Outro';

REVOKE ALL ON public.itbi_escrituras_mercado FROM anon, PUBLIC;
GRANT SELECT ON public.itbi_escrituras_mercado TO authenticated, service_role;

COMMENT ON TABLE public.itbi_escrituras IS
  'ITBI por escritura, planilhas ITBI_TRANSACOES_* da SMF. Só transferências de 100%. Leitura crua só admin; consultas autenticadas passam pela view itbi_escrituras_mercado (só imóvel, data e valor, sem dados pessoais).';

COMMENT ON VIEW public.itbi_escrituras_mercado IS
  'Escrituras individuais (uso residencial, aceitas) sem dados pessoais: só imóvel, data e valor. SELECT só para authenticated e service_role (GRANT); a base itbi_escrituras continua só admin.';