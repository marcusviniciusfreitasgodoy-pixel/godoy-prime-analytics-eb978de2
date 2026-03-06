

## Problema raiz

A busca do `CondominioSelector` usa `ILIKE` no PostgreSQL, que é case-insensitive mas **NÃO** é accent-insensitive. Ao digitar "santa monica", o filtro `nome_condominio.ilike.%santa monica%` não encontra "Santa Mônica" (com acento circunflexo). Confirmado via query direta no banco.

Isso afeta ambas as abas (Localização e Transações) do módulo Pesquisas de Mercado, e também o Passo 0 da Avaliação.

## Correção

### Arquivo: `src/components/valuation/CondominioSelector.tsx`

A query no backend (linha 50) precisa usar o operador `unaccent()` do PostgreSQL ou buscar de forma mais ampla. Como não temos certeza se a extensão `unaccent` está habilitada, a solução mais segura é:

1. **Buscar com wildcards por palavra** — quebrar o termo em palavras e construir filtros separados para cada palavra, usando variações com e sem acento.
2. **Alternativa mais simples e eficaz**: criar uma busca que traga TODOS os condomínios que contenham cada palavra do termo (usando múltiplos `ilike`), gerando variações com acento para as vogais comuns (a/á/â/ã, e/é/ê, i/í, o/ó/ô/õ, u/ú/ü).

**Solução escolhida**: Gerar padrões ILIKE com wildcards de acento para cada vogal. Ex: "monica" → `m_nica` (o `_` do ILIKE casa com qualquer caractere), garantindo que "mônica", "monica", "mónica" sejam encontrados.

```typescript
// Transforma "santa monica" em "santa m_nica" para ILIKE
function toAccentWildcard(term: string): string {
  return term.replace(/[aeiou]/gi, '_');
}
```

Alteração na query (linha 47-53):
- Usar `toAccentWildcard(normalizedTerm)` no filtro `.or()` para que vogais virem `_` (wildcard de 1 caractere no ILIKE)
- Manter o filtro client-side existente (já funciona com `removeAccents`)

### Arquivos alterados
- `src/components/valuation/CondominioSelector.tsx` — única alteração necessária (substituir vogais por `_` na query ILIKE)

