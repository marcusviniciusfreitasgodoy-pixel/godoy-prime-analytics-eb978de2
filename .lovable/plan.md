

## Cadastro Completo de Corretores

### Resumo
Expandir a pagina de Usuarios para incluir gestao completa de corretores com todos os dados profissionais (Nome Completo, WhatsApp, E-mail, CRECI). O sistema ja possui a tabela `profiles` com todos os campos necessarios -- a mudanca e puramente de interface.

### O que muda para o usuario
- Na pagina **Usuarios**, a tabela passara a exibir colunas de **WhatsApp** e **CRECI** alem de Nome, Email e Role
- Um botao **"Editar"** em cada linha abre um modal para editar os dados completos do corretor: Nome Completo, WhatsApp, E-mail, CRECI
- O convite de novo membro continua funcionando como hoje (por email + role), e apos o corretor aceitar, o admin pode completar os dados pelo modal de edicao
- Corretor autonomo (pessoa fisica) continua editando seu proprio perfil em Configuracoes

### Secao Tecnica

**Arquivo 1 (editar): `src/pages/Usuarios.tsx`**

1. Adicionar colunas **WhatsApp** e **CRECI** na tabela de usuarios (ja disponiveis no select de `profiles`)
2. Adicionar coluna de acoes com botao "Editar" (icone de lapis)
3. Adicionar estado para modal de edicao (`editingUser`, `editOpen`)
4. Criar modal `Dialog` com formulario contendo:
   - Nome Completo (input text)
   - WhatsApp (input tel)
   - E-mail (input email)
   - CRECI (input text)
5. Criar mutation `updateProfileMutation` que faz `supabase.from('profiles').update({...}).eq('id', userId)`
6. Atualizar a query existente para incluir `creci` no select (ja retorna `phone` e `email`)

**Nenhuma migracao de banco necessaria** -- a tabela `profiles` ja possui os campos `full_name`, `phone`, `email`, `creci`.

### Fluxo

```text
Admin acessa /usuarios
  |
  v
Tabela exibe: Nome | Email | WhatsApp | CRECI | Role | Acoes
  |
  v
Clica "Editar" em um corretor
  |
  v
Modal abre com campos preenchidos
  |
  v
Salva -> UPDATE profiles SET full_name, phone, email, creci
  |
  v
Tabela atualiza automaticamente
```
