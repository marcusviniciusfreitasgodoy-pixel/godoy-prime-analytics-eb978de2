

# Diferenciar condomínios duplicados + Corrigir dados de "Torres" em ruas de casas

## Problemas identificados

### 1. Nomes duplicados na lista lateral
10 registros da Rua Lourenço Filho aparecem com o mesmo nome porque `nome_condominio = "Rua Lourenço Filho"` (placeholder). Sem diferenciador visual, o usuário não sabe qual é qual.

### 2. "Torres" em rua de casas (dados incorretos)
Os 10 registros mostram entre 5 e 16 "torres", mas a Rua Lourenço Filho é uma rua exclusivamente de casas. O campo `numero_torres` foi preenchido automaticamente pelo algoritmo PAL (que conta footprints de edificações por lote), e cada footprint de casa foi contado como "torre". Isso é **dado incorreto** que confunde o corretor.

**Origem do problema:** O `algoritmo_pal` agrupa lotes e conta edificações (footprints) dentro de cada agrupamento, armazenando o resultado em `numero_torres`. Para condomínios verticais isso faz sentido (cada torre = um bloco). Para loteamentos de casas, cada casa vira uma "torre" — gerando números absurdos.

## Solução

### Parte 1 — Diferenciar nomes duplicados no display
**Arquivo:** `src/components/territorial/TerritorialFilters.tsx`

Aprimorar `getCondoDisplayName` para quando o nome é placeholder (igual ao logradouro):
- Se tiver `numero_inicio` → "Rua Lourenço Filho, 123"
- Se não tiver número → usar coordenadas abreviadas como sufixo para distinguir (ex: "Rua Lourenço Filho · loc. A")
- Na sub-linha, substituir "X torres" por "X edificações" quando `fonte_identificacao = 'algoritmo_pal'` e não houver `padrao_construtivo` definido, pois o algoritmo conta footprints e não torres reais

### Parte 2 — Corrigir label "torres" → "edificações" para registros PAL sem classificação
**Arquivo:** `src/components/territorial/TerritorialFilters.tsx`

No componente `CondoRow`, quando `fonte_identificacao === 'algoritmo_pal'` e `padrao_construtivo` é null, exibir "X edif." em vez de "X torres". Isso reflete com precisão o que o dado significa: contagem de footprints, não torres de um prédio.

### Parte 3 — Nota explicativa no painel de detalhes
**Arquivo:** `src/components/territorial/CondominioDetailPanel.tsx`

Quando o condomínio selecionado tem `fonte_identificacao = 'algoritmo_pal'`, adicionar um badge/nota discreta: "Identificado por algoritmo — dados podem necessitar de revisão manual".

## Impacto nos dados

- **Não altera dados no banco** — apenas muda como são exibidos
- Corretores deixam de ver "16 torres" numa rua de casas
- Lista lateral fica navegável mesmo com múltiplos registros no mesmo logradouro

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/territorial/TerritorialFilters.tsx` | `getCondoDisplayName` com diferenciador; label "edif." para PAL |
| `src/components/territorial/CondominioDetailPanel.tsx` | Badge "Identificado por algoritmo" |

