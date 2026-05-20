## Problema

Ao excluir uma característica no Calibrador de Avaliação, o Postgres rejeita com:

```
update or delete on table "valuation_characteristics" violates foreign key
constraint "valuation_responses_characteristic_id_fkey"
```

A característica está referenciada em `valuation_responses` (respostas de avaliações já feitas). Apagar fisicamente quebraria o histórico — não é o que queremos.

## Solução: Soft delete

Trocar o DELETE por um UPDATE que marca `is_active = false`. O hook `useValuationCharacteristics` já filtra por `is_active = true` (linha 81), então o item some das listas e do motor de avaliação imediatamente, mas as respostas históricas permanecem intactas.

### Alterações

**`src/pages/CalibradorAvaliacao.tsx`** — função `handleDeleteCharacteristic` (linhas 241–263):

- Substituir `.delete().eq("id", selectedCharId)` por `.update({ is_active: false }).eq("id", selectedCharId)`.
- Ajustar mensagem do toast para "Característica desativada com sucesso!" (mais honesta).
- Atualizar o texto do modal de confirmação (`showDeleteModal`) para deixar claro que a característica será **desativada** (não aparecerá em novas avaliações), mas o histórico será preservado.

### Não incluído (intencional)

- **Sem alteração de schema/migration.** A FK fica como está para proteger o histórico.
- **Sem CASCADE.** Apagar respostas históricas distorceria avaliações já emitidas.
- Se no futuro for desejado um botão "reativar característica desativada", isso seria um trabalho separado (precisaria de uma tela listando inativos).