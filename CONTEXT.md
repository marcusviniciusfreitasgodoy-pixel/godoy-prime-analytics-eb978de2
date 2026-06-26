# CONTEXT.md — Godoy Prime Analytics

> Constituição do projeto. Regras invioláveis que qualquer agente (humano ou IA) deve respeitar antes de tocar em código, dados ou comunicação com o usuário.  
> Última atualização: 2026-06-26.

---

## 1. Identidade do Produto

- **Nome**: Godoy Prime Analytics
- **Operadora**: Godoy Prime Realty
- **Domínios**:
  - Plataforma autenticada: `https://analytics.godoyprime.com.br`
  - Avaliação pública (funil de compradores): rota `/avaliacao` no mesmo domínio
- **Público**: Corretores Autônomos e Imobiliárias atuando no Rio de Janeiro, com foco em Barra da Tijuca.
- **Proposta**: unir dados oficiais ITBI/IPTU + IA contextual (Sofia) + fluxo completo de avaliação, vistoria, visitas, propostas e CRM em ambiente seguro e multi-tenant.

---

## 2. Idioma e Terminologia (pt-BR estrito)

- Todo texto de UI, e-mail, PDF, WhatsApp, logs visíveis e mensagens de erro em **português do Brasil**.
- Vocabulário obrigatório:
  - **Corretor Autônomo** (nunca "agente" ou "broker")
  - **Imobiliária** (nunca "agência")
  - **Painel Analítico** (nunca "Dashboard" na UI final)
  - **Feedback** (não confundir com "Pesquisa")
  - **Parecer Godoy Prime** = serviço independente de validação técnica
- Expandir abreviações em endereços exibidos: `AVN → Avenida`, `R → Rua`, etc. Usar Title Case.

---

## 3. Marca e Design System

- **Paleta primária**: Navy `#0C2340` + Gold `#D4AF37`.
- **Estilo**: minimalista premium. Sem gradientes roxos/indigo genéricos. Sem fontes default (Inter/Poppins) como assinatura visual.
- **Tokens semânticos** em `index.css` + variantes shadcn. **Nunca** usar `text-white`, `bg-black`, `bg-[#...]` direto em componentes.
- Exceções permitidas: PDFs (jsPDF) e componentes de export têm hex hardcoded por limitação técnica.
- **Mobile**: cards e dashboards empilham em 1 coluna; nada de scroll horizontal.
- **Nunca** usar linhas decorativas sob títulos (assinatura visual de IA).

---

## 4. Arquitetura e Backend

- **Stack**: React 18 + Vite 5 + Tailwind v3 + TypeScript 5. Sem Next/Vue/Angular.
- **Backend**: Lovable Cloud (Supabase gerenciado). Nunca dizer "Supabase" ao usuário — usar "Lovable Cloud", "backend", "banco", "auth", "funções", "storage".
- **Multi-tenancy**: isolamento por `organization_id` em `profiles`. Toda RLS deve usar `get_user_org_id(auth.uid())`.
- **RBAC**: três papéis em `user_roles` (tabela separada, nunca em `profiles`):
  - `admin` — superusuário da organização
  - `gerente` — gestor de Imobiliária (visão organizacional)
  - `corretor` — Corretor Autônomo (visão apenas dos próprios registros)
- **SECURITY DEFINER** para `has_role()` e helpers de RLS, sempre com `SET search_path = public` (ou `extensions` quando usar `gen_random_bytes`).
- **Edge Functions** sempre com headers CORS e validação de sessão antes de usar credenciais.

---

## 5. Regras Duras de Dados

### 5.1 ITBI (Prefeitura do Rio)
- Base agregada: **sempre ponderar por `total_transacoes`** em médias/medianas.
- Janela histórica padrão: 5 anos, excluindo ano corrente salvo expansão explícita.
- Fallback ano corrente: usar ano anterior se < 30 registros / < 100 transações reais.
- Busca por logradouro: **união cross-bairro** (street name em todos os bairros simultaneamente). Ex.: Camorim ⇄ Barra da Tijuca.
- Tipologia `Comercial` agrega lojas e salas comerciais.
- IQR safety band mínima de 20% quando IQR < 15%.

### 5.2 IPTU 2025
- Métricas `area_media_unidade` e `tot_imoveis_oficial` vêm do `iptu_2025_logradouro`.
- Join principal por código `cl`. Fallback por nome normalizado quando `cl` ausente.

### 5.3 Territorial / Condomínios
- `condominios_mapeamento` cobre ~1.567 registros; sempre filtrar `.eq("ativo", true)`.
- `ruas_internas` (array) trata condomínios multi-rua. **Proibido** incluir vias públicas (Av. das Américas etc.).
- Geocoding em 4 camadas; otimizar custo Google Maps priorizando Barra.
- Spatial join: `ST_DWithin` 150m, WGS84 (EPSG:4326).
- Reverse geocoding: raio 500m.

### 5.4 Avaliação (Engine)
- Engines distintos para **Casa** (bônus de terreno) e **Apartamento**.
- Mínimo de 1 transação para emitir parecer. Comunidades fechadas: fallback reduzido (3 transações).
- Base manual sobrescreve cálculo e propaga bounds proporcionalmente.
- Logradouros ultra-exclusivos (ex.: Rua Iposeira) têm override manual.
- Avaliação pública: **freemium 2 avaliações por e-mail**.

---

## 6. Padrões Técnicos Obrigatórios

| Tema | Regra |
|---|---|
| Supabase queries | **Sempre** `.limit(5000)` para escapar do truncamento silencioso de 1000 linhas |
| PDF | `jsPDF` manual. **Nunca** `html2canvas`. Relatórios 5-7 páginas |
| Inputs de moeda | `inputMode="numeric"` + regex. **Nunca** `<input type="number">` |
| Mapas | Google Maps JS API + Places API (New). Sem Leaflet |
| Voz / Sofia | STT apenas. **Sem TTS** (limitação mobile) |
| IA | Lovable AI Gateway por padrão (`gemini-3-flash-preview` para enriquecimento, `gemini-2.5-pro` para documentos) |
| Edge Functions | Retry com backoff exponencial; batching (6 registros para enriquecimento AI, 20 para condomínios) |
| Cache local | `CACHE_VERSION` bumpado a cada mudança de shape; safeguard contra cache de dados inconsistentes |
| Auth social | Google OAuth ativado por padrão; `redirect_uri` = `window.location.origin` (nunca rota protegida) |
| Comunicação | Z-API (WhatsApp) + Resend (e-mail). Links públicos sempre via `getPublicAppUrl()` → `analytics.godoyprime.com.br` |

---

## 7. Segurança e Privacidade

- RLS habilitada em toda tabela `public`. `GRANT` explícito por papel na mesma migration que cria a tabela.
- Tabelas com PII (`valuations`, `fichas_visita`, `autorizacoes_captacao`, `propostas_compra`, `whatsapp_message_logs`):
  - `admin` / `gerente`: escopo organizacional
  - `corretor`: apenas registros próprios
- `iptu_imoveis`, `disponibilidade_corretor`, `organization_invites`, `valuation_*`, `vistoria_checklist_*`, `sofia_knowledge_base`: restritos a authenticated / membros da organização.
- Logs com PII (`whatsapp_message_logs`) restritos a admin/gerente.
- **Nunca** checar admin via `localStorage`/`sessionStorage`. Sempre via `has_role()` server-side.
- **Nunca** expor `SUPABASE_SERVICE_ROLE_KEY` ou senha do banco — indisponíveis no Lovable Cloud.
- **Nunca** mencionar Supabase dashboard, URL do projeto ou project ref ao usuário.

---

## 8. Honestidade de Dados (Princípio Editorial)

- **Precisão > polimento de UI.** Quando faltar dado, exibir `"Dados insuficientes"` em vez de número enganoso.
- Marketing usa apenas ITBI real. Proibido testimoniais fake ou números inflados.
- Badges de transparência explicam natureza agregada do ITBI e do IPTU.
- Banner âmbar quando dados são unificados entre bairros adjacentes.

---

## 9. Planos e Preços

| Plano | Preço | Foco |
|---|---|---|
| Starter | R$ 197/mês | Corretor Autônomo iniciante |
| Pro | R$ 497/mês | Corretor Autônomo / pequena imobiliária |
| Enterprise | R$ 997/mês | Imobiliária com múltiplos corretores |

Controle de features via hook `usePlanFeatures()`. **Nunca** decidir feature flag no cliente sem fallback server-side.

---

## 10. Fluxos Críticos (não quebrar sem aviso)

1. **Confirmação de Visita pelo Cliente**: token público em `agendamentos_visita.token_confirmacao`, rota `/visitas/confirmar/:token`, válido até a hora da visita. Notifica corretor via Resend após confirmar / cancelar / reagendar.
2. **Ciclo de Visita**: WhatsApp duplo trigger (corretor + cliente). Mensagem pós-visita com tom suave ("nos ajude a registrar"), nunca alarmista.
3. **Vistoria Digital**: checklists separados Casa × Apartamento, auto-scoring por categoria.
4. **PDF Ficha de Visita**: 1 página A4 estrita.
5. **Valuation ↔ Vistoria**: fluxo bidirecional de dados; um alimenta o outro.
6. **Modo Demonstração**: ambiente read-only com mock data, sem onboarding/tour.

---

## 11. Anti-padrões (NÃO FAZER)

- ❌ Adicionar coluna `role` em `profiles` ou em qualquer tabela que não seja `user_roles`.
- ❌ Usar `html2canvas` para gerar PDF.
- ❌ Esquecer `.limit(5000)` em query Supabase.
- ❌ Hardcodar cores fora do design system em componentes React.
- ❌ Mostrar URL de preview Lovable em mensagem para cliente final.
- ❌ Incluir via pública (Av. das Américas, Av. Olof Palme) em `ruas_internas` de condomínio.
- ❌ Cachear resultado com zero em anos recentes quando volume total > 200.
- ❌ Pedir ao usuário que cole `SUPABASE_SERVICE_ROLE_KEY` ou senha do banco.
- ❌ Re-introduzir TTS na Sofia.
- ❌ Usar `<input type="number">` para valores monetários.

---

## 12. Onde mais contexto vive

- **Memória do projeto**: `mem://index.md` + ~80 arquivos `mem://...` (decisões granulares por feature/dado).
- **Plano ativo**: `.lovable/plan.md`.
- **Segurança**: documento de security memory mantido via `security--update_memory`.
- **Briefing executivo**: `/mnt/documents/godoy-prime-funcionalidades.pdf`.

Qualquer agente novo deve ler, nesta ordem: este `CONTEXT.md` → briefing executivo → `mem://index.md` → arquivos `mem://` relevantes à tarefa.