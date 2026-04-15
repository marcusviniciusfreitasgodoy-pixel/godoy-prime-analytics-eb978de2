

# Problemas identificados no Mapa e KPIs da Inteligência Territorial

## Diagnóstico

Investiguei o banco de dados e o código. Há **3 problemas distintos**:

### Problema 1 — Mapa mostra apenas ~300 condomínios de 1.349

A função `get_condominios_bbox` tem um `LIMIT 300` (default). Na área visível da Barra da Tijuca existem **1.645 condomínios com coordenadas**, mas só 300 aparecem (priorizados por `preco_medio_m2 DESC`). Por isso parece que só uma região tem dados — na verdade são os 300 mais caros.

**Solução:** Aumentar o limite para 2000 na chamada do hook e na função SQL, garantindo que todos os condomínios do viewport apareçam.

### Problema 2 — KPIs são globais e estáticos, nunca mudam

A função SQL `get_territorial_kpis` não recebe nenhum parâmetro — conta **todos** os 1.906 registros do banco (incluindo inativos). Por isso:
- "Condomínios" mostra 1906 (deveria ser 1602 ativos)
- "Unidades" mostra 39 (total global, sem filtrar por ativo)
- Os valores **nunca mudam** ao selecionar um condomínio ou filtrar na barra lateral

**Solução:** Os KPIs devem ser calculados no frontend a partir dos condomínios **filtrados** (os que aparecem na lista lateral após aplicar filtros). Quando o usuário filtra por logradouro ou aplica o toggle "Somente com histórico ITBI", os cards devem refletir o subconjunto visível.

### Problema 3 — KPIs não filtram por `ativo = true`

A RPC `get_territorial_kpis` não tem `WHERE ativo = true`, inflando o número de condomínios (1906 vs 1602).

**Solução:** Corrigir a RPC e também migrar os KPIs para cálculo frontend baseado nos dados filtrados.

## Plano de implementação

### 1. Migration SQL — Aumentar limite bbox e corrigir filtro ativo

```sql
-- Corrigir get_condominios_bbox: adicionar filtro ativo e aumentar default
CREATE OR REPLACE FUNCTION get_condominios_bbox(...)
  -- Adicionar WHERE c.ativo = true
  -- Aumentar p_limit default para 2000

-- Corrigir get_territorial_kpis: adicionar WHERE ativo = true
```

### 2. Frontend — KPIs dinâmicos baseados nos filtros

No `TerritorialFilters.tsx`, calcular os KPIs a partir da lista `condominios` (todos carregados do bbox) e da lista `filtered` (pós-filtros):

- **Condomínios**: `filtered.length` (total filtrado visível)
- **Com histórico**: `filtered.filter(c => c.preco_medio_m2 > 0).length`
- **Unidades**: `sum(filtered.map(c => c.unidades_estimadas))`
- **R$/m² médio**: média ponderada do `preco_medio_m2` dos filtrados

Assim, ao buscar "Rua Desembargador" ou ativar filtros, os KPIs refletem exatamente o que está na lista.

### 3. Hook — Aumentar limite na chamada

No `useTerritorialData.ts`, alterar `p_limit: 300` para `p_limit: 2000` na chamada de `useCondominiosBbox`.

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | Corrigir `get_condominios_bbox` (filtro ativo, limite 2000) e `get_territorial_kpis` (filtro ativo) |
| `src/hooks/useTerritorialData.ts` | Aumentar `p_limit` para 2000 |
| `src/components/territorial/TerritorialFilters.tsx` | Calcular KPIs dinamicamente a partir dos dados filtrados em vez de usar a RPC estática |

## Resultado esperado

- Mapa mostrará **todos** os condomínios do bairro visível (não apenas 300)
- KPIs **reagirão** aos filtros: buscar logradouro, slider de unidades, toggle ITBI
- Números serão consistentes (sem contar inativos)

