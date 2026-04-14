

## Plano: Corrigir filtro da Edge Function `enrich-places-details` e processar os 274 pendentes

### Problema identificado
A função `enrich-places-details` filtra por `google_editorial_summary IS NULL` (linha 78), mas o Google não retorna `editorialSummary` para a maioria dos condomínios residenciais. O campo permanece `null` após o enriquecimento, causando reprocessamento infinito dos mesmos registros.

### Correção
1. **Alterar o filtro na Edge Function** — trocar `.is("google_editorial_summary", null)` por `.is("google_place_types", null)` OU usar um filtro combinado que verifica se `google_place_types` é null ou vazio. Assim a função só processa registros que realmente não foram enriquecidos ainda.

2. **Executar o enriquecimento em lotes** — após o deploy, chamar a função em lotes de 50 até processar todos os 274 pendentes (6 chamadas).

### Alteração técnica

**Arquivo:** `supabase/functions/enrich-places-details/index.ts`
- Linha 78: trocar `.is("google_editorial_summary", null)` por `.or("google_place_types.is.null,google_place_types.eq.{}")` para filtrar apenas registros sem types preenchidos.

### Sequência
1. Corrigir o filtro → deploy automático
2. Executar 6 chamadas de `limit: 50` para cobrir os 274 pendentes
3. Confirmar contagem final de registros com `google_place_types` preenchido

