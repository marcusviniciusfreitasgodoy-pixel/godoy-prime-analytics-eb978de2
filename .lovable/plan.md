# Padronizar pontos de emissão da Autorização de Captação

## Objetivo
Hoje o botão **"Gerar Autorização de Captação"** só aparece em um lugar muito restrito (Passo 5, e apenas quando a recomendação for `READY_TO_MARKET`). Vamos expandir para 4 pontos de entrada consistentes em todo o ecossistema.

## Mudanças

### 1. Passo 5 — Recomendação Final (`Step5Recommendation.tsx`)
- Remover a condição `result.recommendation.status === "READY_TO_MARKET"`.
- Mostrar o botão **sempre que houver**: `proprietario` preenchido + `result.provavel > 0` + `valuationId` salvo.
- Quando faltar dado, exibir tooltip explicando o que falta (ex.: "Preencha CPF do proprietário no Passo 0").
- Manter o estilo Navy `#0C2340`.

### 2. Diálogo pós-avaliação ("Realizar vistoria completa?")
- Localizar o diálogo (provavelmente em `Step5Recommendation.tsx` ou `ValuationEngine.tsx`).
- Transformar em **3 ações** lado a lado:
  - **Realizar Vistoria Completa** (atual)
  - **Gerar Autorização de Captação** (novo, destaque Navy)
  - **Apenas Gerar Relatório PDF** (atual)
- Selecionar "Gerar Autorização" abre o `GerarAutorizacaoDrawer` já existente, pré-preenchido.

### 3. Histórico de Avaliações (`HistoricoAvaliacoes.tsx`)
- Adicionar nova coluna/ação **"Autorização"** em cada linha:
  - Se já existe autorização vinculada (via `autorizacoes_captacao.avaliacao_id`): botão **"Ver Autorização"** que leva a `/autorizacoes-captacao` filtrado.
  - Se não existe: botão **"Gerar Autorização"** que abre o `GerarAutorizacaoDrawer` reaproveitando os dados da avaliação salva.
- Buscar na query inicial um `LEFT JOIN` lógico (subselect) para saber quais avaliações já têm autorização.

### 4. Página Autorizações de Captação (`AutorizacoesCaptacao.tsx`)
- Adicionar botão **"Nova Autorização"** no header (ao lado dos KPIs).
- Ao clicar, abrir modal **"Selecionar Avaliação"**:
  - Lista as últimas 50 avaliações do corretor (busca por proprietário/endereço).
  - Mostra: data, endereço, proprietário, valor provável, badge se já tem autorização.
  - Ao selecionar, abre o `GerarAutorizacaoDrawer` pré-preenchido com aquela avaliação.

### 5. Pré-preenchimento padronizado (`GerarAutorizacaoDrawer`)
Criar helper `mapAvaliacaoToAutorizacao(avaliacao)` que converte qualquer avaliação salva para o `AutorizacaoFormData`, garantindo que os 4 pontos de entrada usem a mesma lógica de preenchimento (proprietário, CPF/RG, endereço, valor sugerido = `result.provavel`, condomínio, IPTU).

## Detalhes técnicos

- **Sem mudanças de schema** — `autorizacoes_captacao.avaliacao_id` já existe.
- **Sem mudanças em edge functions** — `enviar-autorizacao`, `assinar-autorizacao`, `get-autorizacao-publica` permanecem.
- **Query nova no Histórico**: 1 SELECT em `autorizacoes_captacao` filtrado pelos `avaliacao_id` da página atual, mapeado em `Map<avaliacao_id, autorizacao>` no client.
- **Componente reutilizável**: extrair `<GerarAutorizacaoButton avaliacao={...} variant="..." />` para evitar duplicar lógica de pré-condições nos 4 pontos de entrada.
- **i18n**: tudo em pt-BR seguindo termos "Autorização de Captação" e "Corretor Autônomo / Imobiliária".

## Arquivos afetados
- `src/components/valuation/Step5Recommendation.tsx` (visibilidade + diálogo)
- `src/components/valuation/ValuationEngine.tsx` (se o diálogo final estiver lá)
- `src/pages/HistoricoAvaliacoes.tsx` (botão por linha + query autorizações)
- `src/pages/AutorizacoesCaptacao.tsx` (botão "Nova Autorização" + modal seletor)
- `src/components/autorizacoes/GerarAutorizacaoButton.tsx` (novo, wrapper)
- `src/components/autorizacoes/SelecionarAvaliacaoModal.tsx` (novo)
- `src/utils/autorizacaoMapper.ts` (novo, `mapAvaliacaoToAutorizacao`)
- `src/hooks/useAutorizacoes.ts` (nova query `useAutorizacoesByAvaliacaoIds`)

## Resultado
Após implementar, o corretor poderá emitir Autorização de Captação a partir de:
1. **Passo 5** da Avaliação (sempre que tiver dados mínimos)
2. **Diálogo final** da Avaliação (ação principal lado a lado com Vistoria/PDF)
3. **Histórico de Avaliações** (qualquer avaliação anterior)
4. **Página Autorizações** (botão "Nova Autorização" → escolhe avaliação)

Sem duplicidade: se a avaliação já tem autorização, os pontos 1, 3 e 4 mostram "Ver Autorização" em vez de criar nova.
