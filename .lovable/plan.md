

## Problema Identificado

A lista de corretores aparece vazia porque existe um erro de **recursao infinita** na politica de seguranca (RLS) da tabela `user_roles`. Isso impede qualquer consulta a essa tabela, incluindo a listagem de corretores no formulario de agendamento.

### Causa Raiz

Existem duas politicas conflitantes na tabela `user_roles`:

1. **"Admin or superadmin can manage roles"** -- faz um SELECT direto na propria tabela `user_roles` dentro da politica RLS, causando recursao infinita
2. **"Admins can manage all roles"** -- usa corretamente a funcao `has_role()` (SECURITY DEFINER), que evita recursao

A politica #1 e redundante e causa o erro. Precisa ser removida.

### Plano de Correcao

**Passo 1: Remover a politica RLS com recursao**

Executar migracao SQL para remover a politica problematica:

```sql
DROP POLICY "Admin or superadmin can manage roles" ON public.user_roles;
```

Isso deixa as duas politicas corretas ativas:
- "Admins can manage all roles" (ALL, usa `has_role()`)
- "Users can view their own roles" (SELECT, `auth.uid() = user_id`)

**Passo 2: Verificar que a politica restante cobre o caso de leitura para corretores**

A politica "Users can view their own roles" permite que cada usuario veja apenas sua propria role. Porem, o hook `useCorretores` precisa listar TODOS os user_ids. Isso significa que precisamos ajustar a abordagem:

- **Opcao A**: Criar uma funcao RPC `SECURITY DEFINER` que retorna a lista de corretores (perfis com roles), sem depender de RLS
- **Opcao B**: Alterar o hook para buscar perfis diretamente (sem passar pela tabela `user_roles`), ja que todos os perfis com `organization_id` preenchido sao potenciais corretores

A **Opcao A** e mais robusta. Criaremos uma funcao `get_corretores_list()` que retorna os perfis de todos os usuarios com roles na mesma organizacao.

**Passo 3: Criar funcao RPC para listar corretores**

```sql
CREATE OR REPLACE FUNCTION public.get_corretores_list()
RETURNS TABLE(id uuid, full_name text, phone text, email text, creci text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  v_org_id := get_user_org_id(auth.uid());
  
  RETURN QUERY
  SELECT p.id, p.full_name, p.phone, p.email, p.creci
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  WHERE p.organization_id = v_org_id
  ORDER BY p.full_name;
END;
$$;
```

**Passo 4: Atualizar o hook `useCorretores.ts`**

Alterar para usar a funcao RPC em vez de duas consultas separadas:

```typescript
const { data, error } = await supabase.rpc('get_corretores_list');
```

### Resultado Esperado

- O erro de recursao infinita desaparece
- A lista de corretores (incluindo "Marcus Godoy") aparece corretamente no formulario de agendamento
- A consulta fica mais eficiente (uma unica chamada RPC em vez de duas queries)

### Secao Tecnica

**Arquivos modificados:**
- `supabase/migrations/` -- nova migracao para remover politica e criar funcao RPC
- `src/hooks/useCorretores.ts` -- usar RPC em vez de queries diretas

**Risco:** Baixo. A politica removida e redundante e causa o bug atual. A funcao RPC usa SECURITY DEFINER, evitando problemas de RLS.

