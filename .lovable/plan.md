
## Permitir Alterar Estratégia de Precificação Após Confirmação

### Problema
Quando a estratégia é confirmada (status = `'confirmado'`), o botão "Trocar Estratégia" fica `disabled` e não existe nenhum mecanismo para reabrir a seleção. O usuário fica travado.

### Solução
Adicionar um botão "Alterar Estratégia" visível quando o status é `'confirmado'`, permitindo ao usuário voltar para a tela de seleção de estratégias.

### Alterações no arquivo `src/components/pricing/PricingStrategyModule.tsx`

1. **Remover o `disabled` do botão "Trocar Estratégia"** ou, alternativamente, **adicionar um botão "Alterar Estratégia"** que aparece quando o status é `'confirmado'`, executando a mesma lógica do `handleChangeStrategy` (reseta `estrategia_selecionada` para `null` e status para `'analisado'`).

2. **Atualizar o bloco de renderização** (linhas ~449-465): quando `status === 'confirmado'`, mostrar um botão claro de "Alterar Estratégia" em vez de esconder tudo. Exemplo:

```text
+---------------------------------------------+
| [Alterar Estratégia]                        |
| (aparece quando status = confirmado)        |
+---------------------------------------------+
```

3. **Salvar no banco** ao reabrir: chamar `saveToDatabase` com o status `'analisado'` para persistir a reabertura.

### Detalhes técnicos

No bloco de renderização do status `'selecionado'` / `'confirmado'` (linhas 430-468):
- Remover `disabled={state.status === 'confirmado'}` da linha 453
- OU manter o disabled e adicionar um botão separado visível apenas quando confirmado, com um ícone de edição e texto "Alterar Estratégia"
- Ao clicar, chamar `handleChangeStrategy` que já existe e faz exatamente o necessário (reseta seleção e status)
- Adicionar `saveToDatabase` dentro de `handleChangeStrategy` para persistir a mudança

### Arquivo alterado
- `src/components/pricing/PricingStrategyModule.tsx` -- 2 pontos de edição (handleChangeStrategy + bloco de renderização)
