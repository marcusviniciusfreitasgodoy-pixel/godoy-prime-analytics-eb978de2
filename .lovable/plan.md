

## Plano Atualizado (2 correções)

### 1. Ordenar categorias alfabeticamente (A → B → C → D → E)

**Arquivo:** `src/hooks/useValuationCharacteristics.ts`

Na função `groupCharacteristicsByCategory`, após construir o objeto `grouped`, ordenar as chaves alfabeticamente antes de retornar:

```typescript
const sortedKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
const sortedGrouped: typeof grouped = {};
for (const key of sortedKeys) {
  sortedGrouped[key] = grouped[key];
}
return sortedGrouped;
```

### 2. Mover aba "Doc" para o início (antes da categoria A)

**Arquivo:** `src/components/valuation/Step3Questionnaire.tsx`

Atualmente a aba "Doc" é renderizada **após** todas as categorias no `TabsList`, e a navegação sequencial usa `[...Object.keys(groupedChars), "doc"]`. Alterações:

- Mover o `TabsTrigger value="doc"` para **antes** do `map` das categorias no `TabsList`
- Alterar a ordem do array de navegação de `[...Object.keys(groupedChars), "doc"]` para `["doc", ...Object.keys(groupedChars)]` nas 3 ocorrências (botão anterior, botão próximo, e `disabled` checks) — linhas ~239, ~244, ~300, ~305
- Alterar o `grid-cols-6` para manter o layout (já comporta 5 categorias + doc)
- Alterar o `useState('A')` inicial para `useState('doc')` para que a aba Doc seja a primeira exibida ao entrar no questionário

### Arquivos alterados
- `src/hooks/useValuationCharacteristics.ts`
- `src/components/valuation/Step3Questionnaire.tsx`

