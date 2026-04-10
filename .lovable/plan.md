

## Plano: Ajustar terminologia no template `pos_visita`

### Problema
O termo "Pesquisa de Satisfação" pode ser confundido com avaliação do atendimento, quando na verdade se trata de um feedback sobre o imóvel visitado.

### Alteração
No arquivo `supabase/functions/send-whatsapp/index.ts`, no template `pos_visita`, substituir:

```
⭐ *Pesquisa de Satisfação:*
```

Por:

```
⭐ *Feedback sobre o Imóvel:*
```

### Arquivo afetado
- `supabase/functions/send-whatsapp/index.ts` (1 linha)

