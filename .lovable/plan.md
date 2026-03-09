

## Fase 2 — Correção de Coordenadas e Desativação

Estou em modo de planejamento, então preciso da sua aprovação para executar. A implementação será uma única migração SQL com uma correção importante:

### Correção necessária no seu SQL

O passo 3 (re-enriquecer `ruas_internas`) referencia `l.nome_logradouro` e `l.geom`, mas a tabela `logradouros_geo` usa `l.logradouro` e `l.latitude`/`l.longitude` (sem coluna `geom`). O SQL corrigido:

```sql
UPDATE condominios_mapeamento c
SET ruas_internas = sub.ruas
FROM (
  SELECT c2.id, ARRAY(
    SELECT DISTINCT l.logradouro
    FROM logradouros_geo l
    WHERE l.latitude BETWEEN c2.latitude - 0.0045 AND c2.latitude + 0.0045
      AND l.longitude BETWEEN c2.longitude - 0.0045 AND c2.longitude + 0.0045
      AND l.logradouro IS NOT NULL
    ORDER BY l.logradouro
  ) as ruas
  FROM condominios_mapeamento c2
  WHERE c2.nome_condominio IN (
    'Jardim Barra','Marina Barra','Residencial Costa Verde',
    'Vila Barra','Barra Infinita','Horizonte Barra','Recreio 013'
  ) AND c2.ativo = true
) sub
WHERE c.id = sub.id;
```

### Plano de execução

Uma migração SQL com os 4 passos:
1. **Desativar 6 registros** (4 fora do RJ + 2 place_id duplicado)
2. **Corrigir coordenadas** dos 7 em bairros limítrofes (seus UPDATEs, sem alteração)
3. **Re-enriquecer `ruas_internas`** dos 7 corrigidos (SQL corrigido acima)
4. Resultado confirmado via query SELECT após migração

