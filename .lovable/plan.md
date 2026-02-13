

# Auditoria Completa de Seguranca - Resultados

## Resumo Executivo

Auditei todas as politicas RLS (40 tabelas), 25+ Edge Functions, e 2 buckets de storage. O projeto tem uma postura de seguranca **boa**, com isolamento multi-tenant funcional. Encontrei **4 vulnerabilidades reais** que merecem correcao e **3 melhorias recomendadas**.

---

## VULNERABILIDADES REAIS (Correcao Recomendada)

### 1. [MEDIA] Profiles: SELECT publico sem autenticacao

A politica `Users can view their own profile` usa `roles: {public}`, permitindo que requisicoes **nao autenticadas** (usando apenas a anon key) consultem perfis por ID, expondo nomes, emails e telefones de funcionarios.

**Correcao:** Alterar a politica para exigir autenticacao (`authenticated` em vez de `public`).

```sql
DROP POLICY "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);
```

---

### 2. [MEDIA] Agendamentos: INSERT permite injecao de organization_id arbitrario

A politica `Public can create agendamentos` permite que anonimos insiram registros com **qualquer** `organization_id` valido (basta que nao seja NULL). Um atacante que conheca um UUID de organizacao pode inserir agendamentos falsos em qualquer empresa.

**Correcao:** Mover a criacao publica de agendamentos para uma Edge Function com validacao, similar ao `public-submit`.

```sql
-- Remover politica permissiva
DROP POLICY "Public can create agendamentos" ON public.agendamentos_visita;

-- A politica de INSERT autenticado tambem tem problema:
-- (organization_id = get_user_org_id(auth.uid())) OR (organization_id IS NOT NULL)
-- O "OR" torna a restricao inutil. Corrigir:
DROP POLICY "Org members can create agendamentos" ON public.agendamentos_visita;
CREATE POLICY "Org members can create agendamentos" ON public.agendamentos_visita
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_org_id(auth.uid()));
```

Criar uma Edge Function `public-submit` com action `agendamento` para o formulario publico.

---

### 3. [MEDIA] Storage: Upload anonimo irrestrito no bucket documentos-proposta

A politica `Anyone can upload documentos proposta` permite que qualquer pessoa faca upload de arquivos sem autenticacao, sem limites de tamanho e sem validacao de tipo. Isso pode ser abusado para:
- Esgotar a cota de armazenamento
- Hospedar arquivos maliciosos

**Correcao:** Restringir uploads a serem feitos atraves da Edge Function `public-submit` (action `proposta`), que ja tem rate limiting. Na politica de storage, remover INSERT anonimo.

```sql
DROP POLICY "Anyone can upload documentos proposta" ON storage.objects;
-- Upload passara a ser feito via Edge Function com service_role
```

---

### 4. [BAIXA] Leaked Password Protection desativado

O sistema de autenticacao nao verifica se senhas escolhidas pelos usuarios foram comprometidas em vazamentos de dados conhecidos.

**Correcao:** Ativar nas configuracoes de autenticacao (Lovable Cloud > Auth Settings).

---

## MELHORIAS RECOMENDADAS (Nao sao vulnerabilidades criticas)

### 5. [INFO] feedbacks_visita: INSERT publico sem validacao de ficha

As politicas `Anon pode criar feedback` e `Autenticado pode criar feedback` usam `WITH CHECK (true)`. Embora a Edge Function `public-submit` ja valide a existencia da ficha e verifique duplicatas, as politicas diretas permitem bypass.

**Melhoria:** Substituir por politicas que exijam `ficha_visita_id` valido:

```sql
DROP POLICY "Anon pode criar feedback" ON public.feedbacks_visita;
DROP POLICY "Autenticado pode criar feedback" ON public.feedbacks_visita;
-- INSERT sera feito exclusivamente via public-submit (service_role)
```

---

### 6. [INFO] leads: INSERT publico com WITH CHECK (true)

A politica `Qualquer pessoa pode se cadastrar como lead` permite INSERT sem restricoes. Embora o `lead-operations` Edge Function tenha rate limiting e validacao, a politica direta pode ser explorada para inserir dados massivos.

**Melhoria:** Remover a politica de INSERT publico e forcar todo INSERT via Edge Function:

```sql
DROP POLICY "Qualquer pessoa pode se cadastrar como lead" ON public.leads;
-- INSERT sera feito exclusivamente via lead-operations (service_role)
```

---

### 7. [INFO] Extensions no schema public

As extensoes `pg_trgm` e possivelmente `pgcrypto` estao instaladas no schema `public`. A melhor pratica e move-las para o schema `extensions`.

**Melhoria:** Mover para schema dedicado (baixa prioridade, nao afeta seguranca diretamente).

---

## O QUE ESTA BEM (Nao requer acao)

- **Isolamento multi-tenant**: Todas as tabelas de negocio usam `get_user_org_id(auth.uid())` corretamente
- **Roles em tabela separada**: `user_roles` com `has_role()` SECURITY DEFINER - padrao correto
- **RLS ativo em todas as 40 tabelas**: Nenhuma tabela sem RLS
- **Edge Functions sensiveis protegidas**: `sync-tables`, `import-itbi`, `merge-condominios` exigem JWT
- **Rate limiting persistente**: Via tabela `rate_limit_log` no PostgreSQL
- **RPCs SECURITY DEFINER**: `check_lead_exists`, `update_lead_by_email`, `increment_lead_evaluation` protegem dados de leads
- **Bucket company-assets**: Leitura publica (logos) e escrita restrita a admins - correto
- **Sem XSS**: Uso de `dangerouslySetInnerHTML` apenas com conteudo estatico

---

## Detalhes Tecnicos da Implementacao

### Ordem de execucao recomendada:

1. **Primeiro**: Corrigir politica de profiles (item 1) - mudanca simples e sem risco
2. **Segundo**: Corrigir politicas de agendamentos (item 2) - requer nova action na Edge Function `public-submit`
3. **Terceiro**: Restringir storage (item 3) - requer mover upload para Edge Function
4. **Quarto**: Remover INSERT publico de leads e feedbacks (itens 5 e 6) - ja usam Edge Functions
5. **Por ultimo**: Ativar leaked password protection (item 4)

### Impacto nas funcionalidades existentes:

- Itens 1 e 4: Zero impacto, correcoes puras
- Itens 2, 3, 5, 6: Requerem que os formularios publicos ja usem as Edge Functions (o que ja e o caso para leads e feedbacks, mas precisa ser verificado para agendamentos)

