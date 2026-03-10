

## Plano: Corrigir ruas internas — mover do Aventura Center para o Mansões

### Situação atual

**Aventura Center** (`d58b4372`) tem 18 ruas internas atribuídas:
Rua Augusto Presgrave, Rua Luiz Mario Miranda, Rua Thales de Aquino Coelho, Rua Benjamin Pesset, Rua Esther Scliar, Praça Heleno Claudio Fragoso, Rua Bolitreau Fragoso, Avenida Ruy Antunes Correa, Rua Procurador Machado Guimarães, Rua Wolmer da Silveira Netto, Avenida Di Cavalcanti, Rua Procurador Luis Orlando Cardoso, Rua Horus Vital Brazil, Rua Jorge Dodsworth Martins, e duplicatas em formato maiúsculo.

**Mansões** (`9dafbfe7`) tem apenas 5 ruas (subset das acima, em maiúsculo).

### Correção

1. **Transferir todas as ruas do Aventura Center para o Mansões**, consolidando a lista sem duplicatas e com nomes padronizados.

2. **Esvaziar as ruas internas do Aventura Center** (ou atribuir apenas as que realmente pertençam a ele, se houver).

### SQL (via insert tool — é UPDATE de dados, não de schema)

```sql
-- Atualizar Mansões com a lista completa de ruas
UPDATE condominios_mapeamento
SET ruas_internas = ARRAY[
  'Rua Augusto Presgrave',
  'Rua Luiz Mario Miranda',
  'Rua Thales de Aquino Coelho',
  'Rua Benjamin Pesset',
  'Rua Esther Scliar',
  'Praça Heleno Claudio Fragoso',
  'Rua Bolitreau Fragoso',
  'Avenida Ruy Antunes Correa',
  'Rua Procurador Machado Guimarães',
  'Rua Wolmer da Silveira Netto',
  'Avenida Di Cavalcanti',
  'Rua Procurador Luis Orlando Cardoso',
  'Rua Horus Vital Brazil',
  'Rua Jorge Dodsworth Martins',
  'Rua Noite Estrelada'
],
atualizado_em = now()
WHERE id = '9dafbfe7-5d1c-4cf1-9442-759235fb4279';

-- Limpar ruas do Aventura Center
UPDATE condominios_mapeamento
SET ruas_internas = '{}',
    atualizado_em = now()
WHERE id = 'd58b4372-5f8c-4e11-a516-754c90b786b2';
```

### Resultado
- Mansões passa a ter 15 ruas internas (sem duplicatas)
- Aventura Center fica com lista vazia (pode ser preenchido depois com suas ruas reais)
- Nenhuma alteração de código necessária

