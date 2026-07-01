# Corrigir 3 inconsistências do motor apontadas pelo Analista Imobiliário

## Contexto

O QA apanhou 3 bugs reais quando não há dados de anúncio (`anuncio_stats: null`):
1. Motor calcula gap fake (33,4%) sem ter anúncios.
2. Score de confiança 100 apesar da fonte ausente.
3. Recomenda `READY_TO_MARKET` mesmo quando o próprio motor classifica como `DESALINHADO`.

Regra de negócio confirmada: **anúncios continuam opcionais**, mas o motor deve declarar honestamente quando a fonte está ausente ou insuficiente (< 3 anúncios).

## Mudanças (todas em `src/utils/valuationCalculations.ts`)

### 1. `calculateCombinedPrices` — tratar "sem anúncios" e "amostra insuficiente"

Ampliar o tipo `MarketAlignment` para incluir `'SEM_DADOS'` e `'AMOSTRA_INSUFICIENTE'`.

Aceitar um `AnuncioData` opcional com `count` (número de anúncios encontrados). Se o motor de coleta não passa isso hoje, tratar `count ?? 0`.

Fluxo:
- **`!anuncio || !anuncio.med_m2` (0 anúncios)** → devolver ITBI puro + `market_gap_percentage: null`, `market_alignment: 'SEM_DADOS'`, `gap_impact: 'Sem dados de anúncio disponíveis — avaliação 100% baseada em transações reais (ITBI). Gap de mercado não aplicável.'`
- **`anuncio.count < 3` (1-2 anúncios)** → devolver ITBI puro + `market_gap_percentage: null`, `market_alignment: 'AMOSTRA_INSUFICIENTE'`, `gap_impact: 'Apenas N anúncio(s) encontrado(s) — amostra insuficiente para calcular gap de mercado (mínimo recomendado: 3).'` (Não combinar com peso de 30% se a amostra é ruim.)
- **`count ≥ 3`** → comportamento atual.

Atualizar `trend_percentage` para espelhar `market_gap_percentage` (`null` inclusive) — os consumidores precisam saber que é `null`, não 0.

### 2. `calculateConfidenceScore` — penalizar ausência de anúncios

Assinatura atual recebe `marketGap: number`. Trocar para `marketGap: number | null`.
- Se `marketGap === null` (sem dados ou amostra insuficiente): aplicar penalidade fixa de **-10 pontos** e pular o bloco existente de bônus/penalidade por gap. Documentar no comentário que essa penalidade reflete a incerteza de uma fonte ausente.
- Comportamento atual permanece quando há gap real.

Assim, um laudo sem anúncios não consegue mais atingir 100 — teto passa a ser ~90/93.

### 3. `generateRecommendation` — bloquear `READY_TO_MARKET` quando desalinhado

Antes da "Regra padrão: Pronto para vender", adicionar uma nova regra:
- Se `market_alignment` é `'DESALINHADO'` ou `'CRITICO'` **e** nenhuma das regras anteriores casou, retornar um novo status `REVIEW_PRICING`:
  - `title: 'Revisar Precificação'`
  - `message: 'Gap de mercado alto entre anúncios e transações reais. Revisar posicionamento de preço antes de anunciar.'`
  - `urgency: 'MEDIUM'`

Isso elimina a contradição READY_TO_MARKET × DESALINHADO. `SEM_DADOS` e `AMOSTRA_INSUFICIENTE` continuam elegíveis para READY_TO_MARKET (é o caso saudável de laudo com ITBI robusto), mas com confiança reduzida por causa do item 2.

### 4. UI — refletir os novos estados

`src/components/valuation/Step5Recommendation.tsx` e o card de "Gap de mercado" (verificar em `Step4Results.tsx`):
- Quando `market_gap_percentage === null`, mostrar badge **"Sem dados de anúncio"** ou **"Amostra insuficiente (N anúncios)"** em vez de "Gap: 0%".
- Adicionar case para o novo status `REVIEW_PRICING` no `switch` de ícone/cor (linhas 323 e 343).

Não vou mudar PDFs nem cálculos históricos — só os pontos onde o motor decide e a UI comunica.

### 5. Ajustes de tipos

`src/types/valuation.ts`:
- `market_gap_percentage: number | null`
- `market_alignment` inclui `'SEM_DADOS' | 'AMOSTRA_INSUFICIENTE'`
- `RecommendationResult['status']` inclui `'REVIEW_PRICING'`

Fazer TypeScript apontar todos os consumidores que precisam tratar `null` — corrigir cada um (formatação com `?.toFixed()` ou fallback para "N/A").

## Validação

- Rodar avaliação sem anúncios (caso do print) e conferir:
  - Painel do motor mostra "Sem dados de anúncio" no lugar de "Gap 0%/EQUILIBRADO".
  - Score de confiança cai para ~85-90.
  - Recomendação continua consistente (READY_TO_MARKET permitido, mas com badge de fonte parcial).
- Rodar avaliação simulando 2 anúncios: alignment vira `AMOSTRA_INSUFICIENTE`, gap null.
- Rodar avaliação com gap real > 20% e ver `REVIEW_PRICING` em vez de READY_TO_MARKET.
- Reexecutar o QA (`Rodar QA do laudo`) para confirmar que o parecer agora converge nesses cenários.

## Escopo

Frontend only. Sem migrações, sem mudanças em edge functions, sem alteração no fluxo de coleta de anúncios (que hoje já é opcional).
