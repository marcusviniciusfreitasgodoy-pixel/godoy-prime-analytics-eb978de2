

# Reforcar Politica de Senhas

## Resumo

A vulnerabilidade e parcialmente valida. O sistema atual aceita senhas fracas (minimo 6 caracteres, sem requisitos de complexidade). A correcao envolve adicionar validacao no frontend nos dois pontos de criacao/alteracao de senha, e configurar o backend para exigir senhas mais fortes.

## O que muda para o usuario

- Ao criar conta (via convite) ou redefinir senha, o sistema exigira:
  - Minimo de 8 caracteres
  - Pelo menos 1 letra maiuscula
  - Pelo menos 1 letra minuscula
  - Pelo menos 1 numero
  - Pelo menos 1 caractere especial (!@#$%...)
- Um indicador visual de forca da senha aparecera em tempo real
- Mensagens de erro claras em portugues indicando o que falta

## O que NAO muda

- Usuarios existentes nao serao afetados (suas senhas atuais continuam funcionando)
- O fluxo de login permanece identico
- Nenhuma funcionalidade existente sera quebrada

## Detalhes tecnicos

### 1. Criar hook `usePasswordValidation`
- Novo arquivo `src/hooks/usePasswordValidation.ts`
- Validacao com regex para cada criterio (maiuscula, minuscula, numero, especial, tamanho)
- Retorna lista de criterios atendidos/pendentes e score de forca (fraca/media/forte)

### 2. Criar componente `PasswordStrengthIndicator`
- Novo arquivo `src/components/ui/password-strength.tsx`
- Barra visual com cores (vermelho/amarelo/verde)
- Lista de checklist mostrando cada criterio atendido ou nao

### 3. Atualizar `ResetPassword.tsx`
- Integrar o hook e o componente de forca
- Bloquear submit se a senha nao atender todos os criterios
- Alterar mensagem de erro de "6 caracteres" para os novos requisitos

### 4. Atualizar `ConviteAceitar.tsx`
- Mesma integracao do hook e componente de forca no campo de criacao de senha
- Bloquear submit ate senha estar forte o suficiente

### 5. Configurar backend
- Usar a ferramenta de configuracao de autenticacao para definir `min_password_length: 8` no backend

### Arquivos afetados
- `src/hooks/usePasswordValidation.ts` (novo)
- `src/components/ui/password-strength.tsx` (novo)
- `src/pages/ResetPassword.tsx` (modificado)
- `src/pages/ConviteAceitar.tsx` (modificado)

