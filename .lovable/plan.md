# Passo 3 — Edge function `/analista-imobiliario` (QA)

## Escopo
Camada de auditoria que critica a saída do motor de avaliação **sem recalcular**. Recebe o resultado do laudo, busca o dado oficial isolado via `/parecer-nucleo`, e delega ao LLM a produção do parecer conforme system prompt fornecido literalmente.

## Componentes

### 1. Nova edge function `supabase/functions/analista-imobiliario/index.ts`

**Entrada** (POST JSON, JWT do usuário autenticado obrigatório):
- `avaliacao_id?: string` — se presente, busca a linha em `valuations` e monta `resultado_motor` a partir dela
- `resultado_motor?: object` — objeto de saída do laudo (usado quando `avaliacao_id` não vier ou como override)
- `identificacao: { logradouro, bairro, numero?, nome_condominio?, tipologia?, periodo_meses? }` — passa para `/parecer-nucleo`

Regra: pelo menos um entre `avaliacao_id` e `resultado_motor` é obrigatório. Se ambos vierem, `resultado_motor` prevalece.

**Fluxo interno**:
1. `getClaims` valida JWT do usuário. Extrai `userId`.
2. Se `avaliacao_id` presente: `SELECT` em `valuations` com JWT do usuário (respeita RLS existente) e monta `resultado_motor` mapeando os campos:
   - `final_value_min/med/max` → pessimista/provável/otimista
   - `confidence_score` + `confidence_level`
   - `spread_percentage`, `trend_percentage`, `trend_direction`
   - `total_adjustment`, `auto_capped`
   - `recommendation_action`, `recommendation_title`, `recommendation_details` (jsonb — contém A–E até fazermos a migração de colunas discretas do Passo 1)
   - `itbi_min/med/max_m2`, `itbi_transaction_count`
   - `anuncio_min/med/max_m2`, `anuncio_fontes`
   - `documentation_status/factor/notes`, `base_price_selected/custom_m2`
   - `logradouro`, `bairro`, `numero`, `nome_condominio`, `property_area_m2`, `property_type`, `quartos`, `suites`, `banheiros`, `vagas`, `andar`, `area_terreno_m2`, `tipo_avaliacao`
3. Chama `/parecer-nucleo` via `fetch` HTTP interno (mesma origem, JWT do usuário no header). Isso preserva rate limit e log no `parecer_nucleo_rate_log`.
4. Se `/parecer-nucleo` retornar 4xx/5xx, propaga erro claro; NÃO tenta preencher lacunas.
5. Monta duas seções separadas no `messages` do LLM:
   - Bloco A `RESULTADO DO MOTOR` — JSON bruto do resultado_motor
   - Bloco B `NUCLEO` — JSON bruto retornado por `/parecer-nucleo`
6. Chama Lovable AI Gateway em `google/gemini-3-flash-preview` (default; trocamos no Passo 5 se necessário) com:
   - `system`: **texto literal do system prompt fornecido no Passo 3**, sem uma vírgula alterada. Guardado como constante `SYSTEM_PROMPT` no arquivo.
   - `messages`: dois turnos de `user` — um por bloco (A e B) com prefixo `=== RESULTADO DO MOTOR ===` e `=== NUCLEO ===`.
   - `response_format: { type: "json_object" }` para forçar JSON válido.
7. Valida que a resposta é JSON parsável. Se não for, tenta 1 retry (não infinito). Se falhar de novo, retorna 502 com `error: "modelo devolveu formato inválido"` — não tenta consertar/reescrever a saída do modelo.
8. Retorna o JSON produzido pelo modelo tal como veio (com `nucleo`, `contexto`, `parecer`, `status: "rascunho"`). Sem pós-processamento.

**Guardrails**:
- Zero pós-processamento além de `JSON.parse` para validar
- Zero preenchimento de lacunas server-side
- Zero uso de `service_role`
- Zero persistência (função só retorna, per user choice)
- Rate limit próprio na função: 20 chamadas/60s por usuário via nova tabela `analista_imobiliario_rate_log` (mesmo padrão do núcleo, RLS por `auth.uid()`)
- Errors do gateway (429/402) propagados com mensagem clara

### 2. Nova migração — rate log
Cria `public.analista_imobiliario_rate_log` (user_id, endpoint, ip_hash, status, timestamps), RLS por `auth.uid()`, grants SELECT/INSERT para `authenticated`. **Não** concede grant para `parecer_nucleo_ro` (firewall).

### 3. Segredos
- `LOVABLE_API_KEY` — provisiono com `ai_gateway--create` se ainda não existir
- Nenhum outro secret novo

## Fora do escopo deste passo
- Persistência do parecer (usuário optou por só retornar)
- Colunas discretas `ajuste_a..ajuste_e` em `valuations` (decisão do Passo 1 fica para quando o Analista precisar dessa granularidade estruturada)
- Chamada do modelo via AI SDK — mantido em `fetch` direto do gateway HTTP porque é uma chamada one-shot com `response_format: json_object`, e o AI SDK aqui adicionaria complexidade sem benefício
- Frontend/UI — nada; função é chamada por script/frontend em fase posterior

## Ordem de execução
1. Provisiono `LOVABLE_API_KEY` (idempotente)
2. Migração `analista_imobiliario_rate_log`
3. Escrevo `supabase/functions/analista-imobiliario/index.ts` com o SYSTEM_PROMPT literal
4. Deploy
5. Teste rápido via `curl_edge_functions` (esperado 401 sem sessão — confirma que o guard funciona)

## Validação
- Confirmar que o system prompt no arquivo bate byte-a-byte com o texto entre os delimitadores `--- SYSTEM PROMPT DO AGENTE ---`
- Confirmar que a chamada a `/parecer-nucleo` reusa o JWT do usuário original (não do serviço)
- Confirmar que `resultado_motor` e `nucleo` chegam ao modelo em turnos separados, não concatenados
