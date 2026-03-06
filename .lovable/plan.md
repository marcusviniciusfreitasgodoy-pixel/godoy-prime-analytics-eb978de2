

## Limpeza de registros antigos do etl_log

**Situação atual:** ~50+ registros de erro duplicados na tabela `etl_log` com `fonte = 'reverse_geocoding'`, todos gerados pelo loop infinito que já foi corrigido.

**Ação:** Executar um DELETE via insert tool para remover todos os registros de `reverse_geocoding` exceto o mais recente (`da20b93c-60ae-4374-b707-ded9c90d6e57`).

```sql
DELETE FROM etl_log 
WHERE fonte = 'reverse_geocoding' 
  AND id != 'da20b93c-60ae-4374-b707-ded9c90d6e57';
```

Nenhuma alteração de código ou schema necessária.

