

## Corrigir Campos de Formulario Invisiveis

### Causa Raiz
Os dados de seed foram inseridos com `organization_id = NULL`, mas as politicas de seguranca (RLS) exigem que `organization_id` corresponda a organizacao do usuario logado. Como `NULL` nao e igual a nenhum valor, todos os registros ficam invisiveis.

### Solucao
Uma migracao SQL para:

1. Atualizar todos os registros existentes em `form_config_sections` e `form_config_fields` que estao com `organization_id = NULL`, preenchendo com o `organization_id` correto da organizacao principal (`a0000000-0000-0000-0000-000000000001`).

2. Adicionar um trigger `BEFORE INSERT` em ambas as tabelas para preencher automaticamente `organization_id` usando a funcao `set_organization_id()` que ja existe no sistema -- garantindo que futuros registros nunca fiquem com `NULL`.

### Secao Tecnica

Arquivo a criar: uma nova migracao SQL com:

```sql
-- Corrigir registros existentes
UPDATE form_config_sections SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE form_config_fields SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Triggers para auto-preencher organization_id em novos registros
CREATE TRIGGER set_form_config_sections_org BEFORE INSERT ON form_config_sections
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();
CREATE TRIGGER set_form_config_fields_org BEFORE INSERT ON form_config_fields
  FOR EACH ROW EXECUTE FUNCTION set_organization_id();
```

Nenhuma alteracao de codigo necessaria. Apos a migracao, os campos aparecerao automaticamente na pagina.

