
# Documentacao de Emergencia -- Godoy Prime Analytics

## 1. Visao Geral do Projeto

Plataforma de inteligencia imobiliaria para a Barra da Tijuca (Rio de Janeiro) que utiliza dados oficiais de transacoes ITBI para fornecer analises de mercado, avaliacoes de imoveis e gestao operacional para corretores e gestores imobiliarios.

**Dominio de producao:** analytics.godoyprime.com.br
**URL publicada (Lovable):** https://godoy-prime-analytics.lovable.app
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS + Lovable Cloud (Supabase)

---

## 2. Acessos e Credenciais

### 2.1 Lovable
- **Projeto:** https://lovable.dev/projects/21300eff-b88e-4ba4-b7ae-0a699fcd2df5
- Todas as alteracoes de codigo sao feitas aqui ou via GitHub

### 2.2 GitHub
- Repositorio conectado via integracao bidirecional do Lovable
- Push para o GitHub sincroniza automaticamente com o Lovable e vice-versa

### 2.3 Backend (Lovable Cloud / Supabase)
- **Project ID:** ldiadiezzooivgittjvj
- **URL:** https://ldiadiezzooivgittjvj.supabase.co
- **Anon Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (armazenada em .env como VITE_SUPABASE_PUBLISHABLE_KEY)
- Acesso ao painel backend via Lovable Cloud (aba Cloud no editor)

### 2.4 Secrets Configurados (Edge Functions)
| Secret | Finalidade |
|--------|-----------|
| SUPABASE_URL | URL do projeto |
| SUPABASE_ANON_KEY | Chave publica |
| SUPABASE_SERVICE_ROLE_KEY | Chave administrativa (NUNCA expor no frontend) |
| SUPABASE_DB_URL | Conexao direta ao banco |
| SUPABASE_SOURCE_URL | URL do projeto fonte (sincronizacao) |
| SUPABASE_SOURCE_ANON_KEY | Chave publica do projeto fonte |
| SUPABASE_SOURCE_SERVICE_KEY | Chave service_role do projeto fonte |
| RESEND_API_KEY | Envio de emails (Resend) |
| RESEND_FROM_EMAIL | Remetente de emails |
| LOVABLE_API_KEY | Integracoes com IA (Lovable AI Gateway) |
| EVOLUTION_API_KEY | WhatsApp via Evolution API |
| EVOLUTION_API_URL | URL da instancia Evolution |
| EVOLUTION_INSTANCE_NAME | Nome da instancia WhatsApp |
| ELEVENLABS_API_KEY | Text-to-speech |
| GOOGLE_MAPS_API_KEY | Google Maps |
| GOOGLE_GEOCODING_API_KEY | Geocodificacao |
| CRON_SECRET | Autenticacao de cron jobs |

### 2.5 Dominio Customizado
- **Producao:** analytics.godoyprime.com.br (configurado via Lovable Settings > Domains)
- **Projeto separado:** avaliacao.godoyprime.com.br (landing page publica -- outro projeto Lovable)

---

## 3. Arquitetura de Dois Projetos

A plataforma e dividida em dois projetos Lovable independentes:
1. **Godoy Prime Analytics** (este projeto) -- dashboard autenticado em analytics.godoyprime.com.br
2. **Godoy Prime Avaliacao** -- landing page publica em avaliacao.godoyprime.com.br

Essa separacao isola o ambiente operacional do ambiente de captacao de leads.

---

## 4. Sistema de Autenticacao e RBAC

### 4.1 Niveis de Acesso (3 roles)
| Role | Descricao |
|------|-----------|
| `admin` | Acesso total a todos os modulos |
| `gerente` | Acesso expandido (Calibradores + Leads) |
| `corretor` | Acesso basico (Dashboard, Avaliacoes, Vistorias, etc.) |

### 4.2 Implementacao Tecnica
- Roles armazenados na tabela `user_roles` (separada de `profiles`)
- Funcao `has_role(_user_id, _role)` com SECURITY DEFINER para evitar recursao RLS
- Hook `useAuth` consulta role via `user_roles` e expoe flags: `isAdmin`, `isGerente`, `isAdminOrGerente`
- `AuthContext` compartilha estado de auth globalmente
- `ProtectedRoute` redireciona para `/auth` se nao autenticado, ou `/` se sem permissao
- Trigger `handle_new_user()` atribui role `corretor` automaticamente a novos usuarios
- Trigger `handle_new_user_profile()` cria perfil na tabela `profiles`

### 4.3 Mapa de Rotas por Permissao

**Publicas (sem autenticacao):**
| Rota | Funcionalidade |
|------|---------------|
| `/auth` | Login/Cadastro |
| `/reset-password` | Recuperacao de senha |
| `/avaliacao` | Avaliacao publica (captacao de leads) |
| `/apresentacao` | Landing page marketing |
| `/demo/*` | Ambiente demonstrativo completo |
| `/politica-privacidade` | Politica de privacidade |
| `/visitas/feedback` | Landing feedback de visita |
| `/visitas/feedback/:codigo` | Formulario de feedback |
| `/visitas/assinatura` | Landing assinatura de visita |
| `/visitas/assinatura/:codigo/:tipo` | Assinatura digital |

**Autenticadas (qualquer role):**
| Rota | Funcionalidade |
|------|---------------|
| `/` | Dashboard principal |
| `/microbairros` | Ranking e analise de microregioes |
| `/pesquisas-mercado` | Busca avancada em transacoes ITBI |
| `/avaliacao-imobiliaria` | Motor de Avaliacao Godoy Prime |
| `/historico-avaliacoes` | Historico de avaliacoes salvas |
| `/vistoria-digital` | Checklist de vistoria |
| `/historico-vistorias` | Historico de vistorias |
| `/visitas` | Gestao de agendamento de visitas |
| `/visitas/agendar` | Formulario de agendamento |
| `/visitas/disponibilidade` | Gestao de disponibilidade do corretor |
| `/visitas/ficha/:id` | Ficha completa da visita |
| `/documentacao` | Documentacao do sistema |
| `/manual` | Manual e tour guiado |
| `/onboarding` | Fluxo de onboarding |
| `/configuracoes` | Configuracoes da empresa e perfil |

**Gerente + Admin:**
| Rota | Funcionalidade |
|------|---------------|
| `/calibrador-avaliacao` | Calibrar pesos das 26 caracteristicas de avaliacao |
| `/calibrador-vistoria` | Calibrar checklist de vistoria |
| `/leads` | CRM de leads |

**Somente Admin:**
| Rota | Funcionalidade |
|------|---------------|
| `/base-conhecimento` | Base de conhecimento da Sofia (IA) |
| `/usuarios` | Gestao de usuarios e roles |

---

## 5. Funcionalidades e Regras de Negocio

### 5.1 Dashboard (`/`)
- **KPIs Year-to-Date:** Preco Medio (R$/m2) com breakdown Apto vs Casa, Liquidez (volume total vendido), Variacao Anual YoY, Bairro Mais Valorizado
- **Grafico de evolucao:** 60 meses com abas Geral, Por Tipologia, Variacao%
- **Ranking de microbairros:** barra horizontal por preco/m2
- **Ferramentas de busca (3 abas):**
  - Localizacao: busca por rua/condominio com filtros
  - Transacoes: filtro por faixa de valor
  - IA Valuation: avaliacao rapida com inputs basicos
- **Regra:** Disclaimer obrigatorio "ferramenta estatistica, nao substitui laudo PTAM"
- **Exportacao:** CSV do dashboard

### 5.2 Motor de Avaliacao Godoy Prime (`/avaliacao-imobiliaria`)
- **Formula base:** 70% ITBI (12 meses) + 30% Anuncios (30 dias)
- **26 caracteristicas** em 5 categorias com pesos calibraveis
- **Caps por tipo:** Casa +-35%, Apartamento +-30%, ajuste total max +-30%
- **Bonus terreno (casas):** +6% a -4% baseado na proporcao terreno/area construida
- **Cenarios triplos:** Pessimista / Provavel / Otimista
- **Multiplicador de documentacao:** OK (1.0), Pendente, Irregular, Incompleta (bloqueia)
- **Confianca:** Score 0-100 mapeado para 4 niveis (VERDE/AMARELO/LARANJA/VERMELHO)
- **Gap de Mercado:** Classificacao EQUILIBRADO/MODERADO/DESALINHADO/CRITICO baseada na discrepancia anuncios vs ITBI
- **PDF profissional:** Alinhado com NBR 14653-2

### 5.3 Vistoria Digital (`/vistoria-digital`)
- Checklists dinamicos para Casa e Apartamento
- Categorias com pesos calibraveis (via Calibrador Vistoria)
- Score final, contagem de itens criticos
- Vinculacao com avaliacao existente
- Geracao de PDF

### 5.4 Agendamento de Visitas (`/visitas`)
- Dashboard analitico com KPIs e graficos de evolucao
- Ranking de corretores
- Fichas de visita com codigo unico (formato VIS-YYYYMMDD-XXXX)
- Status: agendada > confirmada > realizada / cancelada
- Feedback publico via link (sem autenticacao)
- Assinatura digital do visitante e corretor
- Badges de proximidade temporal (Hoje, Amanha, Em X dias)
- Notificacoes por email e WhatsApp (confirmacao, lembrete, cancelamento, reagendamento)
- Gestao de disponibilidade por corretor

### 5.5 Gestao de Leads / CRM (`/leads`)
- Captacao automatica via avaliacao publica (`/avaliacao`)
- KPIs: totais, compra, venda, convertidos
- Filtros por interesse, status, busca textual
- Exportacao CSV
- Notificacoes automaticas (email via Resend + WhatsApp via Evolution API)
- Rate limiting para prevenir abuso
- Funcao `check_lead_exists` e `update_lead_by_email` para upsert seguro

### 5.6 Pesquisas de Mercado (`/pesquisas-mercado`)
- Busca avancada em transacoes ITBI
- Filtros por rua, condominio, tipologia, area, finalidade
- Resultados com mediana e desvio padrao
- Mapa de transacoes (Leaflet + Google Maps)
- Comparacao entre ruas

### 5.7 Microregioes (`/microbairros`)
- Ranking de microbairros por preco/m2
- Graficos de evolucao por microbairro
- View materializada `view_ranking_microbairros`

### 5.8 Ambiente Demo (`/demo/*`)
- Replica completa do dashboard sem autenticacao
- Dados mocados via `DemoContext`
- Banner permanente indicando modo demonstrativo
- Sidebar e Header proprios (DemoSidebar, DemoHeader)

### 5.9 Configuracoes (`/configuracoes`)
- Perfil do corretor (nome, telefone, email, CRECI)
- Dados da empresa (PJ/PF, nome, CNPJ, telefone, endereco, CRECI, website)
- Upload de logo da empresa (Storage bucket `company-assets`)
- Metodo de filtro de outliers (IQR)
- Configuracoes de notificacao WhatsApp
- Gestao de cache de analise historica
- Enriquecer/Merge condominios (admin)

### 5.10 Assistente Sofia (IA)
- Chat de mercado via edge function `chat-mercado`
- Analise de documentos via `analyze-document`
- Modelo: google/gemini-2.5-flash (via Lovable AI Gateway)
- Base de conhecimento editavel por admins (`/base-conhecimento`)
- Text-to-speech via ElevenLabs

### 5.11 Documentacao e Manual
- `/documentacao` -- Documentacao tecnica do sistema
- `/manual` -- Manual interativo com tour guiado (react-joyride)
- Tour progressivo por pagina com barra de progresso

---

## 6. Banco de Dados -- Tabelas Principais

| Tabela | Descricao |
|--------|-----------|
| `itbi_transactions` | Transacoes oficiais ITBI (fonte primaria de dados) |
| `valuations` | Avaliacoes salvas com todos os parametros e resultados |
| `valuation_responses` | Respostas individuais das 26 caracteristicas por avaliacao |
| `valuation_characteristics` | Definicao das 26 caracteristicas (calibraveis) |
| `valuation_documentation_factors` | Multiplicadores de documentacao (calibraveis) |
| `vistorias` | Vistorias digitais salvas |
| `vistoria_checklist_categories` | Categorias do checklist (calibraveis) |
| `vistoria_checklist_items` | Itens individuais do checklist |
| `pricing_strategies` | Estrategias de precificacao vinculadas a avaliacoes |
| `condominios_mapeamento` | Mapeamento de condominios com coordenadas |
| `logradouros_geo` | Dados geograficos de logradouros |
| `logradouros_normalizacao` | Normalizacao de nomes de ruas |
| `microbairros_geo` | Coordenadas e limites de microbairros |
| `leads` | Leads capturados com dados de contato e interesse |
| `profiles` | Perfis de usuario (nome, telefone, CRECI) |
| `user_roles` | Roles de acesso (admin/gerente/corretor) |
| `user_activity_logs` | Log de atividades por usuario |
| `fichas_visita` | Fichas de visita com assinaturas |
| `feedbacks_visita` | Feedbacks de visitantes |
| `agendamentos_visita` | Agendamentos com status e notificacoes |
| `disponibilidade_corretor` | Horarios disponiveis por corretor |
| `notification_settings` | Configuracoes de notificacao por usuario |
| `company_settings` | Configuracoes globais da empresa |
| `ia_valuation_weights` | Pesos legados de avaliacao (sincronizados) |
| `bairros_cache` | Cache de bairros para busca rapida |
| `sofia_knowledge_base` | Base de conhecimento da IA Sofia |
| `rate_limit_log` | Controle de rate limiting |

**Views:**
- `view_ranking_microbairros` -- Ranking agregado de microbairros
- `view_user_activity_summary` -- Resumo de atividades por usuario

**Enums:**
- `app_role`: admin, corretor, gerente
- `status_visita`: agendada, confirmada, realizada, cancelada
- `tipo_servico_visita`: visita, avaliacao, consultoria, fotografia
- `origem_agendamento`: site, indicacao, whatsapp, instagram, facebook, google, outro
- `nivel_interesse_visita`: baixo, medio, alto, muito_alto
- `percepcao_valor_visita`: abaixo, justo, acima
- `uso_imovel`: Residencial, Comercial

---

## 7. Edge Functions (Backend Serverless)

| Funcao | JWT | Descricao |
|--------|-----|-----------|
| `sync-tables` | Sim | Sincroniza condominios e pesos do projeto fonte |
| `sync-itbi-prefeitura` | Sim | Importa transacoes ITBI da prefeitura |
| `sync-itbi-daily` | Nao | Cron job diario de sincronizacao ITBI |
| `import-itbi` | Sim | Importacao manual de ITBI |
| `import-csv-itbi` | Sim | Importacao de ITBI via CSV |
| `seed-condominios` | Sim | Seed inicial de condominios |
| `chat-mercado` | Nao | Chat IA Sofia (Gemini via Lovable AI) |
| `analyze-document` | Nao | Analise de documentos com IA |
| `classify-microbairros` | Nao | Classificacao automatica de microbairros |
| `enrich-condominios` | Nao | Enriquecimento de dados de condominios |
| `merge-condominios` | Sim | Merge de condominios duplicados |
| `lead-operations` | Nao | CRUD de leads (rate limited) |
| `send-lead-notification` | Nao | Notificacao de novo lead (email + WhatsApp) |
| `send-pdf-email` | Nao | Envio de PDF por email |
| `send-visit-email` | Nao | Email de confirmacao de visita |
| `send-visit-reminder` | Nao | Lembrete de visita |
| `send-whatsapp` | Nao | Envio de WhatsApp via Evolution API |
| `elevenlabs-tts` | Nao | Text-to-speech |
| `geo-logradouro` | Nao | Geocodificacao de logradouros |
| `get-google-maps-key` | Nao | Fornece chave do Google Maps ao frontend |
| `public-itbi-stats` | Nao | Estatisticas publicas de ITBI |
| `public-bairro-suggestions` | Nao | Sugestoes de bairros (publico) |
| `sync-bairros-cache` | Nao | Atualiza cache de bairros |
| `sync-logradouros-geo` | Nao | Sincroniza dados geograficos de logradouros |
| `email-hook` | -- | Hook de email (configuracao interna) |

---

## 8. Integracoes Externas

| Servico | Finalidade | Secret |
|---------|-----------|--------|
| **Resend** | Envio de emails transacionais | RESEND_API_KEY, RESEND_FROM_EMAIL |
| **Evolution API** | WhatsApp Business | EVOLUTION_API_KEY, EVOLUTION_API_URL, EVOLUTION_INSTANCE_NAME |
| **Google Maps** | Mapas e geocodificacao | GOOGLE_MAPS_API_KEY, GOOGLE_GEOCODING_API_KEY |
| **ElevenLabs** | Text-to-speech para Sofia | ELEVENLABS_API_KEY |
| **Lovable AI** | Chat IA e analise de documentos | LOVABLE_API_KEY (auto-provisionado) |
| **Projeto Fonte (Supabase)** | Sincronizacao de dados via Vault | SUPABASE_SOURCE_URL, SUPABASE_SOURCE_SERVICE_KEY |

---

## 9. PWA e Funcionalidades Offline

- Configurado via `vite-plugin-pwa`
- Icones PWA: 192x192 e 512x512
- Banner de atualizacao (`PWAUpdateBanner`)
- Indicador de atualizacao (`UpdateIndicator`)

---

## 10. Seguranca

- **RLS habilitado** em todas as tabelas sensiveis (29 tabelas)
- **Rate limiting** em endpoints publicos via funcao `check_rate_limit`
- **Vault do Supabase** para credenciais do projeto fonte
- **SECURITY DEFINER** em funcoes criticas (`has_role`, `get_vault_secret`, etc.)
- **Funcoes publicas** (feedback, assinatura) usam funcoes DB dedicadas que retornam apenas dados nao-sensiveis
- **Validacao com Zod** em formularios do frontend

---

## 11. Deploy

- **Frontend:** Publicar via botao "Publish" no Lovable (requer clique manual em "Update")
- **Backend (Edge Functions):** Deploy automatico ao salvar codigo
- **Migracoes de banco:** Aplicadas automaticamente via Lovable Cloud
- **Dominio customizado:** analytics.godoyprime.com.br (configurado em Settings > Domains)

---

## 12. Procedimentos de Emergencia

### Reverter codigo
1. No Lovable, use o historico de versoes para restaurar uma versao anterior
2. Ou via Git: `git revert` no repositorio GitHub

### Banco de dados corrompido
1. Acesse Lovable Cloud > Database
2. Use "Run SQL" para corrigir dados manualmente
3. Verifique se o ambiente correto (Test vs Live) esta selecionado

### Edge function falhando
1. Verifique logs em Lovable Cloud > Edge Functions > Logs
2. Verifique se todos os secrets estao configurados
3. Redeploy automatico ao editar o codigo

### Usuario bloqueado
1. Admin acessa `/usuarios` para verificar/alterar role
2. Caso admin bloqueado: acessar banco via Lovable Cloud e corrigir `user_roles`
