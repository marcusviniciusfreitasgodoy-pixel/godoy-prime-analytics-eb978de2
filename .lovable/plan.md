

## Problema

A Edge Function busca condomínios com `logradouro_padrao LIKE '%não cadastrado%'` e tenta geocodificar. Os 2 registros restantes retornam `ZERO_RESULTS` do Google, mas nunca são marcados como "tentados", causando loop infinito.

## Solução

Modificar a Edge Function `reverse-geocode-condominios` para marcar condomínios que retornam `ZERO_RESULTS` com um logradouro diferente (ex: `"Endereço não localizado"`) em vez de manter `"não cadastrado"`, quebrando o loop.

### Alteração em `supabase/functions/reverse-geocode-condominios/index.ts`

No bloco `else` onde `data.status !== "OK"` ou sem resultados, atualizar o registro:

```typescript
// Quando ZERO_RESULTS, marcar como "não localizado" para não reprocessar
if (data.status === "ZERO_RESULTS") {
  await supabaseAdmin
    .from("condominios_mapeamento")
    .update({
      logradouro_padrao: "Endereço não localizado via coordenadas",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", condo.id);
}
erros++;
```

Isso evita que os mesmos registros sejam reprocessados infinitamente.

### Nenhuma alteração de interface

Apenas a Edge Function será modificada.

