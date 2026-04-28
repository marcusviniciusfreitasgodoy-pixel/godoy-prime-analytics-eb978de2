## Problema

Ao abrir a aba **Proposta de Compra** em "Configurar Formulários", aparece "nenhuma seção". A causa:

- O seed criou 4 seções e 14 campos da proposta com `organization_id = NULL` (template global).
- A RLS de `form_config_sections` / `form_config_fields` exige `organization_id = get_user_org_id(auth.uid())`, então registros NULL ficam invisíveis para qualquer usuário.
- Resultado: a UI carrega zero seções e zero campos.

## Solução

Tratar os registros com `organization_id = NULL` como **template padrão do sistema** que é automaticamente clonado para a organização do usuário no primeiro acesso. Assim cada imobiliária tem sua própria cópia editável, sem perder o modelo padrão.

### 1. Migration de banco

- Atualizar a policy de SELECT de `form_config_sections` e `form_config_fields` para também permitir leitura quando `organization_id IS NULL` (template público de leitura).
- Criar função `seed_proposta_compra_for_org(_org_id uuid)` (SECURITY DEFINER) que:
  - Verifica se já existem seções de `proposta_compra` para a organização; se sim, sai.
  - Copia todas as seções e campos com `organization_id IS NULL` e `tipo_formulario = 'proposta_compra'` para o `_org_id`, preservando `section_id`, ordem, `modelos`, `is_locked`, etc.

### 2. Hook `useFormConfig`

- Em `proposta_compra`, ao detectar que a organização do usuário **não tem** seções próprias, chamar a função de seed via RPC e refazer a query.
- Filtrar a query para exibir apenas registros da organização do usuário (`organization_id = orgId`) — o template global some assim que a cópia é feita.

### 3. UI `ConfigurarFormularios.tsx`

- Mostrar um estado de "Preparando modelo padrão..." enquanto o seed roda na primeira visita.
- Sem mais mudanças visuais; depois do seed, a aba lista as 4 seções e 14 campos editáveis normalmente.

## Resultado esperado

Ao abrir a aba "Proposta de Compra" pela primeira vez, o sistema clona o modelo padrão para a sua organização e exibe as seções (Proponente, Imóvel, Condições, Validade) com todos os campos prontos para edição (renomear, reordenar, ativar/desativar, alternar Simplificado/Completo).