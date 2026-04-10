

## Plano: Notificar corretor por WhatsApp ao marcar visita como "realizada"

### Problema
Quando a visita e marcada como "realizada", o sistema envia WhatsApp apenas ao visitante. O corretor responsavel nao recebe nenhuma notificacao por WhatsApp.

### Alteracao

**Arquivo: `src/hooks/useVisitas.ts`** (linhas ~143-166)

Apos o bloco que ja busca o perfil do corretor para envio de email, adicionar envio de WhatsApp ao corretor usando o telefone do perfil (`profile.phone`). Usar o mesmo template `pos_visita` com os mesmos dados, mas direcionado ao corretor.

Logica:
1. O bloco ja faz `supabase.from("profiles").select("email, full_name")` para o `corretor_id`
2. Expandir o select para incluir `phone`
3. Apos enviar o email, verificar se `corretorProfile.phone` existe
4. Se sim, chamar `enviarFichaCompletaPosVisita(corretorProfile.phone, data)` para o corretor
5. Mostrar toast de sucesso/erro

### Codigo resumido da alteracao

```typescript
// Linha ~148: expandir select
.select("email, full_name, phone" as any)

// Linha ~151: expandir tipo
const corretorProfile = profile as unknown as { 
  email: string | null; 
  full_name: string; 
  phone: string | null;
} | null;

// Apos o bloco de email do corretor (~161), adicionar:
if (corretorProfile?.phone) {
  try {
    const resultado = await enviarFichaCompletaPosVisita(corretorProfile.phone, data);
    if (resultado.success) {
      toast.success("WhatsApp enviado ao corretor!");
    }
  } catch (err) {
    console.error("Erro ao enviar WhatsApp ao corretor:", err);
  }
}
```

### Arquivo afetado
- `src/hooks/useVisitas.ts` (1 arquivo, ~10 linhas adicionadas)

