

## Plano: Corrigir ruas internas do Santa Mônica Jardins

### Registro
- **ID:** `dbc68746-6b49-4cf2-a969-e2285705393e`
- **Nome:** Santa Mônica Jardins
- **Logradouro atual:** Avenida das Américas

### Correções
1. **Logradouro principal** → atualizar para `Avenida Jardins de Santa Mônica`
2. **Ruas internas** → substituir lista completa por 6 ruas confirmadas:
   - Rua Cartunista Millor Fernandes
   - Rua Poeta Khalil Gibran
   - Rua Escritor Elie Wiesel
   - Rua Escritor Milan Kundera
   - Rua Escritor Umberto Eco
   - Rua Escritor Gabriel Garcia Marquez

### SQL
```sql
UPDATE condominios_mapeamento
SET 
  logradouro_padrao = 'Avenida Jardins de Santa Mônica',
  ruas_internas = ARRAY[
    'Rua Cartunista Millor Fernandes',
    'Rua Poeta Khalil Gibran',
    'Rua Escritor Elie Wiesel',
    'Rua Escritor Milan Kundera',
    'Rua Escritor Umberto Eco',
    'Rua Escritor Gabriel Garcia Marquez'
  ],
  atualizado_em = now()
WHERE id = 'dbc68746-6b49-4cf2-a969-e2285705393e';
```

Nenhuma alteração de código necessária.

