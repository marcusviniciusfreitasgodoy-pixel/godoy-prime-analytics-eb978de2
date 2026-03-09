

## Plano: Substituir upload CSV por busca direta no Supabase

### O que muda

O componente `EnriquecerCondominios.tsx` será reescrito para:

1. **Remover**: `parseCSV`, drag-and-drop, `FileReader`, `Upload` icon, `fileRef`, `dragOver` state, step `"upload"`
2. **Adicionar**: `useEffect` que carrega dados do Supabase ao montar, estado `"loading"` com spinner, tabela de preview com `Table` components
3. **Manter intacto**: processamento em lotes, Edge Function, geração de SQL, seções de progresso e resultados

### Fluxo novo

```text
[Monta componente]
       │
       ▼
  loading (spinner)
       │
       ▼ supabase.from("condominios_mapeamento")
         .select("id, nome_condominio, microbairro, logradouro_padrao, endereco_completo")
         .eq("ativo", true).order("microbairro")
       │
       ▼
  ready (tabela preview + badges de contagem + botão "Enriquecer X condomínios")
       │
       ▼ click
  processing (lotes de 6 → Edge Function)
       │
       ▼
  done (stats + SQL + resultados)
```

### Arquivo editado

| Arquivo | Mudança |
|---|---|
| `src/components/territorial/EnriquecerCondominios.tsx` | Reescrever — remover CSV, adicionar fetch Supabase + tabela preview |

### Detalhes técnicos

- States: `"loading" | "ready" | "processing" | "done"` (remove `"upload"`)
- Novo estado `loadError` para exibir erro de carregamento com botão retry
- Preview: tabela com `Table/TableHeader/TableBody/TableRow/TableCell` mostrando até 50 registros com scroll
- Badges de resumo: total de condomínios, número de lotes, número de microbairros
- Botão "Processar novamente" no final chama `loadCondominios()` em vez de resetar para upload

