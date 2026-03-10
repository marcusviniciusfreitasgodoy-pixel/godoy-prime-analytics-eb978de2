

## Plano: Resolver endereços dos 267 condomínios via join espacial com `logradouros_geo`

### Diagnóstico

- **354 condomínios com ITBI** têm `logradouro_padrao = 'Logradouro não identificado'` — por isso a UI mostra coordenadas
- A tabela `logradouros_geo` tem pontos de ruas com nomes reais
- Join espacial (raio 100m) consegue resolver **267 dos 354** condomínios
- O problema é múltiplos matches por condomínio (ruas próximas); precisamos pegar o mais próximo

### Solução

Criar uma **migração SQL** que faz UPDATE em `condominios_mapeamento` usando o logradouro mais próximo da tabela `logradouros_geo`:

```sql
UPDATE condominios_mapeamento cm
SET logradouro_padrao = sub.logradouro,
    atualizado_em = now()
FROM (
  SELECT DISTINCT ON (cm2.id)
    cm2.id,
    lg.logradouro
  FROM condominios_mapeamento cm2
  JOIN logradouros_geo lg ON ST_DWithin(
    ST_SetSRID(ST_MakePoint(cm2.longitude, cm2.latitude), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lg.longitude, lg.latitude), 4326)::geography,
    100
  )
  WHERE cm2.logradouro_padrao = 'Logradouro não identificado'
  ORDER BY cm2.id, ST_Distance(
    ST_SetSRID(ST_MakePoint(cm2.longitude, cm2.latitude), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lg.longitude, lg.latitude), 4326)::geography
  )
) sub
WHERE cm.id = sub.id;
```

### Resultado esperado

- ~267 condomínios passam de "📍 -23.0147, -43.3042" para nomes reais como "Rua Arquiteto Henrique Mindlin"
- Os ~87 restantes sem match continuam com coordenadas (fallback correto)
- Nenhuma alteração de código — apenas correção de dados

### Impacto
- Apenas dados; a UI já tem a lógica correta de fallback
- Reversível (poderia voltar ao valor anterior se necessário)

