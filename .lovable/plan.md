
# Gerador de Parecer Técnico Godoy Prime (PTAM)

Novo módulo que permite ao perito emitir um Parecer Técnico de Avaliação Mercadológica editorial (mínimo 15 páginas A4), exportável em PDF via print, com dois pontos de entrada, persistência em banco, storage de fotos e integração à base ITBI e ao Motor de Avaliação já existentes. A palavra "laudo" nunca aparece. Autoridade técnica: Marcus Godoy, Perito TJRJ, CRECI PJ 11.841, ABNT NBR 14.653.

## Arquitetura

- **Rotas novas**
  - `/parecer-tecnico/novo` — parecer em branco
  - `/parecer-tecnico/novo?avaliacaoId=UUID` — pré-preenchido a partir de avaliação existente
  - `/parecer-tecnico/:id` — edição/reemissão de parecer salvo
  - `/pareceres-tecnicos` — histórico (lista)
- **Entrada dupla**
  - Botão "Gerar Parecer Técnico" em `HistoricoAvaliacoes.tsx` e no resultado do `ValuationEngine`
  - Item "Parecer Técnico" na sidebar dentro do grupo Avaliação
- **Layout**: duas colunas (form rolável à esquerda, preview A4 ao vivo à direita), botão fixo "Exportar PDF" → `window.print()`

## Backend (Lovable Cloud)

### Nova tabela `pareceres_tecnicos`

Campos principais (além de `id`, `created_at`, `updated_at`, `organization_id`, `created_by`):

- Vínculos: `avaliacao_id` (nullable, FK para `valuations`)
- Documento: `referencia_documento`, `data_emissao`, `data_referencia`, `status` (rascunho/emitido)
- Sumário: `objetivo`, `finalidade`, `pressupostos`
- Imóvel: `endereco_imovel`, `bairro`, `tipologia`, `area_privativa`, `area_total`, `quartos`, `suites`, `vagas`, `ano_construcao`, `condominio`, `matricula`
- Diagnóstico: `diagnostico_regiao`
- Metodologia: `tipo_tratamento`, `fundamentacao_metodologica`
- Amostra: `comparativos` (jsonb array), `tratamento_amostra`
- Vistoria: `estado_conservacao`, `padrao_acabamento`, `vista`, `posicao_solar`, `reformas`, `observacoes_perito`, `fotos` (jsonb array `{url, legenda}`)
- Riscos: `riscos_estruturais`, `nivel_estrutural`, `riscos_documentais`, `nivel_documental`, `riscos_condominiais`, `nivel_condominial`
- Resultado: `valor_mercado`, `valor_m2_apurado`, `intervalo_valor`, `grau_fundamentacao` (I/II/III), `grau_precisao` (I/II/III)
- Negociação: `faixa_abertura`, `valor_alvo`, `piso_negociacao`, `argumentos` (jsonb array), `alavancagem`
- Conclusão: `conclusao`

RLS org-scoped (`organization_id = get_user_org_id(auth.uid())`), GRANTs para `authenticated` e `service_role`, trigger `updated_at`.

### Bucket de storage `pareceres-fotos`

- Privado, RLS por organização (path prefix `{organization_id}/{parecer_id}/...`)
- Policies: authenticated pode select/insert/update/delete apenas em seu prefixo
- Signed URLs para renderizar fotos no preview e no PDF

## Frontend

### Estrutura de arquivos
- `src/pages/ParecerTecnicoEditor.tsx` — layout 2 colunas
- `src/pages/HistoricoPareceresTecnicos.tsx` — lista
- `src/components/parecer/ParecerForm.tsx` — formulário completo por seções (accordion)
- `src/components/parecer/ParecerPreview.tsx` — documento A4 editorial ao vivo
- `src/components/parecer/sections/` — uma sub-componente por seção (Capa, 01_SumarioExecutivo, 02_Identificacao, ..., 11_Ressalvas)
- `src/components/parecer/PhotoUploader.tsx` — upload múltiplo + legenda + reorder
- `src/hooks/useParecerTecnico.ts` — CRUD + auto-save debounced
- `src/lib/parecer/prefillFromAvaliacao.ts` — mapeia `valuations` + comparativos ITBI para inputs do parecer
- `src/lib/parecer/forbiddenPhrases.ts` — validador que bloqueia "laudo", "valorização garantida", "cheque", "ITBI", "cartório" etc. e alerta no form
- `src/styles/parecer-print.css` — regras `@media print`, footer fixo com contador de página, quebras `break-inside: avoid`

### Identidade visual (escopo local ao módulo)
- Fontes carregadas via `@fontsource/cormorant-garamond`, `@fontsource/lato`, `@fontsource/jetbrains-mono` (Montserrat já existe)
- Tokens do parecer isolados em classes `.parecer-*` no `parecer-print.css` (não altera design system global)
- Paleta navy/gold/off-white/cream/parchment/warm-gray como CSS vars locais
- Radius 1px padrão, fotos 8px, sombras raras, corpo Lato 300 alinhado à esquerda, dados técnicos em JetBrains Mono ALL CAPS
- Logos consumidas das URLs oficiais fornecidas

### Impressão
- `@page { size: A4; margin: 18mm }`
- Form oculto (`display: none`) e preview em largura A4 fluida
- Footer fixo com `position: fixed; bottom: 0` + contador `counter(page)` / `counter(pages)`
- Cada seção com `page-break-before: always` a partir do Sumário; galeria de fotos com `break-inside: avoid` por item
- Dimensionamento (leading, spacing entre seções, tamanho da capa dedicada) calibrado para garantir ≥ 15 páginas com conteúdo padrão

### Integração ITBI + Motor
- Ao abrir com `?avaliacaoId`, `prefillFromAvaliacao` puxa: endereço, bairro, tipologia, áreas, `valor_mercado`, `valor_m2_apurado`, `intervalo_valor`, `grau_fundamentacao/precisao` (herdando da avaliação quando existir), comparativos ITBI reais do payload da valuation, e sugere textos de `diagnostico_regiao` e `fundamentacao_metodologica` (templates editáveis)
- Botão "Buscar comparativos ITBI" dentro da seção 5 reutiliza `useITBITransactions` para adicionar linhas ao array `comparativos`
- Nenhuma alteração no Motor de Avaliação nem em edge functions existentes

### Validações
- Zod schema por seção; auto-save por debounce (2s) no rascunho
- Bloqueio das frases proibidas em tempo real (toast + destaque no campo)
- "Emitir" só habilita quando campos obrigatórios preenchidos e nenhuma frase proibida presente

## Fora de escopo (não faremos agora)
- Assinatura digital criptográfica; a assinatura é o bloco visual editorial já descrito
- Envio por e-mail/WhatsApp do PDF (reaproveitável em iteração futura)
- Edição de PDF pós-geração fora do fluxo de reemissão via editor

## Ordem de implementação
1. Migration: tabela + bucket + RLS + GRANTs
2. Types regenerados; hook CRUD + prefill
3. Editor (form + preview) e componentes de seção
4. CSS de impressão calibrado para ≥ 15 páginas
5. PhotoUploader com storage
6. Botões de entrada (Histórico de Avaliações + Resultado do Motor) e item na sidebar
7. Página de histórico de pareceres
8. QA visual (print preview) e validação das frases proibidas
