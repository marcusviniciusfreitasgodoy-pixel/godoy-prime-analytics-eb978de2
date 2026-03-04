

## Plano: Criar tabelas de Inteligencia Territorial no banco

### Analise

O SQL fornecido esta quase pronto, mas tem **2 problemas** que preciso corrigir antes de executar:

1. **RLS de `etl_log` e `proprietarios_multiplos`**: referenciam `profiles.role`, que nao existe. O sistema usa a tabela `user_roles` e a funcao `has_role()`. Vou substituir por `has_role(auth.uid(), 'admin'::app_role)`.

2. **Extensao PostGIS**: os campos `geometry(Point, 4326)` etc. requerem a extensao `postgis`. Preciso garantir que esta habilitada com `CREATE EXTENSION IF NOT EXISTS postgis`.

### Execucao

Uma unica migracao SQL com:

- `CREATE EXTENSION IF NOT EXISTS postgis`
- ALTER TABLE `condominios_mapeamento` (14 colunas novas + indice GIST)
- CREATE TABLE `iptu_imoveis` + indices + RLS (SELECT publico)
- CREATE TABLE `edificacoes_geo` + indice GIST + RLS
- CREATE TABLE `lotes_pal` + indice GIST + RLS
- CREATE TABLE `torres_condominios` (FKs para condominios_mapeamento e edificacoes_geo) + RLS
- CREATE TABLE `iptu_logradouro_resumo` + RLS
- CREATE TABLE `etl_log` + RLS (**corrigido**: `has_role(auth.uid(), 'admin'::app_role)`)
- CREATE TABLE `proprietarios_multiplos` + RLS (**corrigido**: idem)

Todas as tabelas novas tem RLS habilitado. Tabelas de dados publicos (iptu, edificacoes, lotes, torres, resumo) permitem SELECT para qualquer usuario autenticado. Tabelas administrativas (etl_log, proprietarios) restritas a admins via `has_role()`.

Nenhuma pagina ou componente sera criado.

