## Diagnóstico

Ao criar uma nova visita (`/visitas/agendar`), o insert em `agendamentos_visita` falha com:

```
function gen_random_bytes(integer) does not exist
```

A causa é o trigger `gerar_token_confirmacao_visita()`, que chama `gen_random_bytes(24)` para gerar o `token_confirmacao`. A função `gen_random_bytes` vive na extensão `pgcrypto` (schema `extensions`), mas o trigger define `SET search_path TO 'public'`, então o Postgres não consegue resolver o nome. Resultado: nenhum agendamento é criado.

## Correção

Recriar a função `public.gerar_token_confirmacao_visita()` via migration, chamando a função qualificada pelo schema:

```sql
NEW.token_confirmacao := encode(extensions.gen_random_bytes(24), 'base64');
```

O restante do trigger (URL-safe, fallback de `token_expira_em`, `SECURITY DEFINER`, `search_path = public`) permanece igual. Nenhuma mudança em frontend, RLS ou schema é necessária — apenas a migration de substituição da função.

Depois da migration, validar criando uma visita de teste em `/visitas/agendar`.