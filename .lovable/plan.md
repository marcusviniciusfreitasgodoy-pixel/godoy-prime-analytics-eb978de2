

## Plano: Corrigir ruas internas do Condomínio Malibu

### Situação atual
O registro **Malibu** (`608d7a6b`) tem 5 ruas internas, algumas incorretas ou com grafia errada:
- `RUA MARGARIDA VALLADAO` (manter, corrigir grafia)
- `RUA DARIO COELHO` (remover)
- `Rua Maisa` (corrigir para "Rua Maysa")
- `Rua Conchita de Morais` (manter)
- `Rua Ariosto Berna` (manter)

### Correção
Substituir a lista completa por 7 ruas confirmadas pelo usuário:

1. Rua Margarida Valladão *(manter, padronizar)*
2. Rua Conchita de Morais *(manter)*
3. Rua Ariosto Berna *(manter)*
4. Rua Maysa *(corrigir grafia)*
5. Rua Mesquitinha *(adicionar)*
6. Rua Jorge Natal da Costa *(adicionar)*
7. Rua Dick Farney *(adicionar)*

**Removidas:** Rua Dario Coelho (não pertence ao Malibu)

### SQL (via insert tool)
```sql
UPDATE condominios_mapeamento
SET ruas_internas = ARRAY[
  'Rua Margarida Valladão',
  'Rua Conchita de Morais',
  'Rua Ariosto Berna',
  'Rua Maysa',
  'Rua Mesquitinha',
  'Rua Jorge Natal da Costa',
  'Rua Dick Farney'
],
atualizado_em = now()
WHERE id = '608d7a6b-c4e6-4d8f-bd6a-b3fc885ac453';
```

Nenhuma alteração de código necessária.

