

## Plano: Filtrar condomínios sem histórico e corrigir KPI R$/m² médio

### Problemas identificados

1. **Lista poluída**: O filtro "Somente com histórico ITBI" está desativado por padrão, mostrando centenas de condomínios "Sem histórico" que não agregam valor visual
2. **KPI R$/m² médio mostrando "—"**: A RPC `get_territorial_kpis` retorna o valor correto (R$ 8.991), mas pode haver um problema de tipo (retorno como string em vez de number) que faz o check `kpis?.preco_medio_m2_barra` falhar

### Correções

**Arquivo:** `src/components/territorial/TerritorialFilters.tsx`

1. Alterar o estado inicial de `somenteComItbi` de `false` para `true` — assim a lista mostra apenas condomínios com dados de preço por padrão
2. Fazer cast numérico no valor do KPI R$/m² para garantir que valores retornados como string sejam tratados corretamente

**Impacto**: Apenas a visualização padrão muda. O usuário pode desativar o filtro manualmente para ver todos os condomínios.

