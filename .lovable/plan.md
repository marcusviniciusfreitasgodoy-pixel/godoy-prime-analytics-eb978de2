# Editar o modelo de Proposta de Compra

## Diagnóstico

Você está em **/configurar-formularios**, mas hoje essa tela só permite editar 3 formulários:

- Ficha de Visita
- Feedback Cliente
- Feedback Corretor

A **Proposta de Compra** (componentes `ProposalForm.tsx` e `ProposalModelSelector.tsx`, com modelos "Simplificado" e "Completo") **não está cadastrada como um tipo de formulário configurável**. Por isso você não vê nada para editar — a aba não existe.

Além disso, ao contrário da Ficha de Visita (que é totalmente dinâmica via `form_config_sections` / `form_config_fields`), a Proposta hoje tem campos **fixos no código** (valor ofertado, sinal, parcelas, financiamento, validade, etc.), divididos em dois layouts hard-coded: simplificado e completo.

## O que vou fazer

### 1. Adicionar "Proposta de Compra" como tipo de formulário configurável
- Estender o tipo `TipoFormulario` em `src/hooks/useFormConfig.ts` para incluir `"proposta_compra"`.
- Adicionar a aba na tela `/configurar-formularios` com ícone `FileText`, ao lado das outras 3.
- Criar migration SQL inserindo as **seções e campos padrão da Proposta** (seções: Identificação do Proponente, Imóvel, Condições Comerciais, Validade e Aceite) populando `form_config_sections` e `form_config_fields` com `tipo_formulario = 'proposta_compra'`.
- Marcar como `is_locked = true` os campos críticos (nome, CPF, valor ofertado, assinatura) para evitar que sejam excluídos por engano.

### 2. Permitir escolher quais campos aparecem em cada modelo
- Adicionar uma coluna nova `modelos` (text[]) em `form_config_fields` indicando em quais modelos o campo aparece (`['simplificado','completo']` ou só `['completo']`).
- Na UI de edição do campo (já existente), incluir checkboxes "Aparece em: Simplificado / Completo".

### 3. Tornar o `ProposalForm.tsx` dinâmico
- Refatorar `ProposalForm.tsx` para ler a configuração ativa via `useFormConfig("proposta_compra").activeConfig` e renderizar os campos com `DynamicFieldRenderer` (igual a Ficha de Visita).
- Filtrar os campos pelo modelo selecionado (simplificado/completo) usando a nova coluna `modelos`.
- Manter a lógica especial de assinatura, upload de CNH e cálculo de valores que não são campos comuns.

### 4. PDF da proposta
- Atualizar `src/utils/propostaPdfExport.ts` para renderizar dinamicamente os campos configurados, mantendo o cabeçalho/rodapé padrão.

## Detalhes técnicos

**Arquivos alterados/criados:**
- `supabase/migrations/...` — adiciona coluna `modelos text[]` em `form_config_fields`, insere seções/campos padrão da proposta.
- `src/hooks/useFormConfig.ts` — adiciona `"proposta_compra"` ao tipo.
- `src/pages/ConfigurarFormularios.tsx` — adiciona entrada no `TAB_CONFIG`, e checkboxes de modelo no diálogo de campo.
- `src/components/visitas/ProposalForm.tsx` — refator para ler config dinâmica.
- `src/utils/propostaPdfExport.ts` — render dinâmico dos campos.
- `src/integrations/supabase/types.ts` — atualizado automaticamente.

**Compatibilidade:** os campos críticos da tabela `propostas_compra` permanecem (valor_ofertado, cpf_cnpj, assinatura, etc.). Apenas a apresentação/coleta passa a ser configurável; o schema do banco não muda.

## Confirmações antes de implementar

1. Você quer poder **adicionar/remover/renomear campos** da proposta (ex.: criar campo "Origem do recurso"), ou apenas **mostrar/ocultar** os campos existentes?
2. Manter os 2 modelos atuais (Simplificado / Completo) e só configurar quais campos aparecem em cada, ou você quer poder **criar novos modelos** (ex.: "Proposta Comercial")?

Se preferir, posso começar pela versão mais simples: cadastrar a Proposta como tipo configurável com os campos atuais e permitir mostrar/ocultar e reordenar — sem criar modelos novos. É o caminho mais rápido para você conseguir editar hoje.
