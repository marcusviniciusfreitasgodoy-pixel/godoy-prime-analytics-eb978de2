

# Busca/Filtro + Gráfico Semestral nas Microregiões

## Mudança 1: Campo de busca na lista de Microregiões

### `src/pages/Microbairros.tsx`
- Adicionar estado `searchFilter: string`
- Renderizar um `Input` com ícone `Search` acima da tabela/cards (visível em ambos os modos)
- Filtrar `microbairros` pelo `searchFilter` antes de renderizar, comparando com `microbairro`, `condominioNome` e `displayName` (case-insensitive, sem acentos via `normalizeAccents`)
- Importar `Input` de `@/components/ui/input`, `Search` de `lucide-react`, `normalizeAccents` de `@/lib/utils`

## Mudança 2: Gráfico por semestre em vez de mensal

### `src/components/StreetComparisonChart.tsx`
- Em vez de agrupar por mês (`YYYY-MM`), agrupar os `dados_mensais` por **semestre** (`YYYY-S1` / `YYYY-S2`)
- Calcular a média ponderada de `media_m2` × `transacoes` dentro de cada semestre
- Labels do eixo X: `1°Sem/24`, `2°Sem/24`, `1°Sem/25`, etc.
- Isso elimina meses zerados e produz um gráfico mais limpo e legível

### Lógica de agrupamento (pseudo-código)
```typescript
// Converter mes "YYYY-MM" → semestre "YYYY-S1" ou "YYYY-S2"
const semestre = parseInt(mm) <= 6 ? 'S1' : 'S2';
const key = `${year}-${semestre}`;
// Agregar soma ponderada e peso total por semestre
// Label: "1°Sem/24" ou "2°Sem/25"
```

## Arquivos alterados
1. `src/pages/Microbairros.tsx` — campo de busca + filtro
2. `src/components/StreetComparisonChart.tsx` — agrupamento semestral

