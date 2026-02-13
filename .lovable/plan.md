

## Corrigir os 2 Erros de Seguranca

### Erro 1: Leads com acesso publico irrestrito

**Diagnostico**: Este problema ja foi corrigido no banco de dados. As politicas permissivas antigas (`Permitir leitura publica de leads por email` e `Permitir atualizacao publica de leads`) foram removidas em migracoes anteriores. Atualmente existem apenas 3 politicas na tabela `leads`:

- `Qualquer pessoa pode se cadastrar como lead` (INSERT publico -- necessario para captura de leads)
- `Org admins can manage leads` (ALL para admins autenticados)
- `Org admins/gerentes can view leads` (SELECT para admins/gerentes autenticados)

**Acao**: Atualizar o finding do scanner de seguranca para refletir que o problema ja foi resolvido.

---

### Erro 2: Chave service_role exposta em arquivo de migracao

**Diagnostico**: O arquivo `supabase/migrations/20251205033247_31ebc268-0147-493a-bc8c-7558618b5df3.sql` contem a URL e a chave service_role de um projeto externo hardcoded diretamente no SQL:

```
vault.create_secret('https://wlnwspjobfdjftyffqne.supabase.co', ...)
vault.create_secret('eyJhbGciOiJ...', ...)
```

**Acao**: Substituir os valores reais por placeholders no arquivo de migracao. Os segredos ja estao armazenados de forma segura no Vault do banco -- a migracao ja foi executada e os valores estao la. O arquivo de migracao fica apenas como historico no codigo, mas nao deve conter credenciais.

O arquivo sera editado para conter comentarios explicativos e valores placeholder, como:

```sql
SELECT vault.create_secret(
  'REPLACE_WITH_SOURCE_URL',
  'source_project_url',
  '...'
);

SELECT vault.create_secret(
  'REPLACE_WITH_SERVICE_KEY',
  'source_project_service_key',
  '...'
);
```

---

### Secao Tecnica

**Arquivos a modificar:**
- `supabase/migrations/20251205033247_31ebc268-0147-493a-bc8c-7558618b5df3.sql` -- remover credenciais hardcoded

**Acoes no scanner de seguranca:**
- Deletar o finding `leads_full_access` (ja resolvido no banco)
- Deletar o finding `rpc_bypassed_by_rls` (consequencia do anterior, tambem resolvido)
- Deletar o finding `service_key_in_migration` apos remover a chave do arquivo

Nenhuma mudanca de codigo frontend necessaria.
