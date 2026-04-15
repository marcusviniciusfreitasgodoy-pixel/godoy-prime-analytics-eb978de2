

# Documentação Técnica Completa para Migração — Godoy Prime Analytics

## Objetivo

Gerar um pacote de documentação técnica completo (PDF executivo + arquivos Markdown detalhados) que permita a uma equipe externa replicar integralmente a plataforma em outra infraestrutura.

## Escopo do Documento

O pacote cobrirá **8 seções principais**:

### 1. Visão Geral da Plataforma
- Propósito, público-alvo, modelo SaaS (Starter/Pro/Enterprise)
- Stack tecnológico: React 18, Vite 5, Tailwind CSS, TypeScript, Supabase (PostgreSQL + PostGIS + Auth + Edge Functions + Storage)
- Arquitetura dual: domínio autenticado (Analytics) + domínio público (Avaliação)

### 2. Mapa Completo de Rotas e Módulos (35+ páginas)
- Todas as rotas públicas e protegidas com controle de acesso (admin, gerente, corretor)
- Descrição funcional de cada módulo: Dashboard, Pesquisas de Mercado, Avaliação Imobiliária, Vistoria Digital, Inteligência Territorial, CRM/Pipeline, Visitas, etc.

### 3. Schema do Banco de Dados (48 tabelas)
- DDL completo de todas as tabelas com tipos, defaults, constraints
- Políticas RLS detalhadas por tabela
- Enums: `app_role`, `status_visita`, `uso_imovel`, `origem_agendamento`, etc.
- Relacionamentos e foreign keys

### 4. RPCs e Funções SQL (~25 funções customizadas)
- Assinatura, parâmetros e lógica de cada função: `enriquecer_condominios_com_itbi`, `identificar_condominios_pal`, `get_territorial_kpis`, `get_condominios_bbox`, `atualizar_resumo_logradouros`, `normalizar_logradouro`, `has_role`, `get_user_org_id`, etc.
- Triggers: `handle_new_user`, `set_organization_id`, `generate_visit_code`

### 5. Edge Functions (39 funções serverless)
- Código-fonte completo de cada função com descrição do propósito
- Categorização: Ingestão de dados, Geocodificação, Enriquecimento, Comunicação, IA, Público
- Dependências externas e secrets necessários

### 6. Secrets e Integrações Externas (14 secrets)
- Lista de todas as variáveis de ambiente necessárias
- APIs externas: Google Maps/Places/Geocoding, Resend (e-mail), Z-API (WhatsApp), ElevenLabs (TTS), Lovable AI Gateway
- Instruções de obtenção de cada credencial

### 7. Lógicas de Negócio Críticas
- Motor de Avaliação: cálculo ITBI + anúncios (70/30), IQR outliers, ajustes por características, caps
- Vistoria Digital: scoring, checklists dinâmicos (Casa vs Apartamento)
- Estratégia de dados em 3 camadas (ITBI + IPTU + Geoespacial)
- Enriquecimento espacial: ST_DWithin 150m, algoritmo PAL
- Microbairros: classificação em 8 regiões
- KPIs: janela rolling 12 meses, média/mediana ponderada

### 8. Geração de PDFs e Exportações
- Padrão jsPDF manual (sem html2canvas)
- Templates: Avaliação, Vistoria, Ficha de Visita, Proposta, Feedback, One-Pager
- Exportação XLSX com branding

## Entregáveis

| Arquivo | Formato | Conteúdo |
|---------|---------|----------|
| `godoy-prime-migration-guide.pdf` | PDF ~40-60 páginas | Documento executivo com todas as 8 seções, diagramas ASCII, tabelas |
| `docs/01-visao-geral.md` | Markdown | Stack, arquitetura, dependências |
| `docs/02-rotas-modulos.md` | Markdown | Mapa completo de rotas e funcionalidades |
| `docs/03-database-schema.md` | Markdown | DDL, RLS, enums, triggers |
| `docs/04-rpcs-functions.md` | Markdown | Funções SQL com assinaturas |
| `docs/05-edge-functions.md` | Markdown | Código e descrição de cada Edge Function |
| `docs/06-secrets-integracoes.md` | Markdown | Variáveis de ambiente e APIs externas |
| `docs/07-logicas-negocio.md` | Markdown | Cálculos, fórmulas, regras |
| `docs/08-pdfs-exportacoes.md` | Markdown | Templates e padrões de geração |

## Processo de Geração

1. Script Python que lê o codebase, queries SQL e memory files
2. Gera os 8 arquivos Markdown em `/mnt/documents/docs/`
3. Consolida tudo em um PDF executivo via `reportlab`
4. QA visual de cada página do PDF

## Observações

- O documento incluirá **trechos de código reais** das Edge Functions e hooks
- Schemas SQL serão extraídos diretamente do banco via queries
- As políticas RLS serão documentadas tabela a tabela
- Estimativa: ~15 minutos de geração

