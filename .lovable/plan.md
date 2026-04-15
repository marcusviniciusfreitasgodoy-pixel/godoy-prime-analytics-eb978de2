

# Corrigir busca e filtros na Inteligência Territorial

## Problemas identificados

1. **`somenteComItbi` default `true`** — Só 354 de 1.602 condos têm ITBI. A maioria dos logradouros fica invisível ao abrir a página, incluindo condos sem transações registradas.

2. **Mapa desconectado da lista** — Quando a busca retorna 0 no sidebar, o mapa ainda mostra TODOS os markers (lógica na linha 159: `filteredCondos.length > 0 || condominios.length === 0 ? filteredCondos : condominios`). Isso causa confusão: o usuário vê markers no mapa mas a lista diz "0 condomínios".

3. **Mapa deveria refletir os filtros** — Quando o usuário busca um logradouro, o mapa deveria destacar apenas os resultados filtrados. Quando nenhum resultado é encontrado, o mapa deveria manter os markers mas indicar visualmente que a busca não encontrou nada.

## Solução

### 1. Alterar default de `somenteComItbi` para `false`
**Arquivo:** `src/components/territorial/TerritorialFilters.tsx`
- Mudar `useState(true)` para `useState(false)` na linha 108
- Assim todos os condomínios aparecem por padrão, e o usuário pode ativar o filtro ITBI quando quiser

### 2. Mapa sempre reflete os filtros
**Arquivo:** `src/pages/InteligenciaTerritorial.tsx`
- Simplificar a linha 159: sempre passar `filteredCondos` para o mapa
- `condominios={filteredCondos}`
- Isso garante que mapa e sidebar estejam sempre sincronizados

### 3. Mensagem de busca vazia mais útil
**Arquivo:** `src/components/territorial/TerritorialFilters.tsx`
- Quando a busca retorna 0 mas há condominios carregados, sugerir "Limpar filtros" com botão para resetar busca e filtros

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/territorial/TerritorialFilters.tsx` | Default ITBI OFF, botão "Limpar filtros" |
| `src/pages/InteligenciaTerritorial.tsx` | Mapa sempre usa `filteredCondos` |

