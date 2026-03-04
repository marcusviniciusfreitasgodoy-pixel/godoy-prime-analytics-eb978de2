

## Atualizar texto de logradouro não identificado

Executar um UPDATE simples na tabela `condominios_mapeamento` para substituir o texto técnico por uma mensagem mais honesta e clara para o usuário final.

### Operação

Usar a ferramenta de inserção/atualização de dados (não migration) para executar:

```sql
UPDATE condominios_mapeamento
SET logradouro_padrao = 'Localização identificada — endereço não cadastrado'
WHERE logradouro_padrao = 'Endereço não identificado';
```

Isso afetará os ~421 registros restantes que ainda têm o texto antigo.

### Impacto
- Sem alteração de schema
- Sem alteração de código frontend (o texto é exibido dinamicamente)
- Mensagem mais transparente: comunica que a localização geográfica existe mas o endereço formal não consta nos registros da prefeitura

