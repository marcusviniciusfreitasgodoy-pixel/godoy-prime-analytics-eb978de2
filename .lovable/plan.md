
## Sistema Unificado de Configuracao de Formularios

### Resumo
Hoje apenas o **Feedback do Corretor** possui sistema de configuracao dinamica (tabelas `feedback_corretor_config_sections/fields` + Calibrador). Os outros dois formularios -- **Ficha de Visita** e **Feedback do Cliente** -- possuem campos fixos no codigo (hardcoded). O objetivo e estender o mesmo padrao de configuracao para esses dois formularios, permitindo que o admin adicione, edite, reordene e exclua campos customizados, enquanto os campos essenciais do sistema ficam protegidos (flag `bloqueado`).

### Abordagem escolhida

Em vez de criar tabelas separadas para cada formulario (como foi feito para o Feedback Corretor), sera criada uma **tabela unificada** inspirada na documentacao de referencia. Isso centraliza a gestao e evita duplicacao de logica.

**Da documentacao de referencia, o que faz sentido adotar:**
- Tabela unificada com coluna `tipo_formulario` (discriminador)
- Flag `bloqueado` para campos do sistema que nao podem ser excluidos
- Tipos de campo expandidos: `text`, `textarea`, `select`, `radio`, `checkbox`, `number`, `date`, `email`, `telefone`, `rating`
- Drag-and-drop para reordenacao (dnd-kit ja instalado)
- Campos padrao (seed) com `bloqueado: true` para cada tipo

**O que NAO sera adotado (nao se aplica ou e complexidade excessiva):**
- `escala_nps` e `assinatura` como tipos de campo (NPS nao e usado nos formularios atuais; assinatura ja tem componente proprio separado)
- Logica condicional em cascata (pode ser adicionada futuramente, mas nao e necessaria agora)
- Preview desktop/mobile lado a lado no editor (o padrao Accordion atual do Calibrador ja funciona bem)
- Coluna `respostas_customizadas` JSONB nos formularios existentes -- os campos customizados serao salvos em uma coluna JSONB dedicada nas tabelas `fichas_visita` e `feedbacks_visita`

### O que muda para o usuario

1. O item "Calibrador Feedback" na sidebar sera renomeado para **"Configurar Formularios"** e levara a uma pagina com 3 abas:
   - **Ficha de Visita** -- campos do Termo de Apresentacao
   - **Feedback Cliente** -- campos do formulario publico
   - **Feedback Corretor** -- campos ja existentes (migrados para a tabela unificada)

2. Em cada aba, o admin vera as secoes com seus campos (padrao Accordion), podendo:
   - Adicionar/editar/excluir secoes e campos customizados
   - Reordenar campos via drag-and-drop
   - Campos do sistema aparecem com badge "Sistema" e nao podem ser excluidos

3. Os formularios de preenchimento (`NovaFichaVisita`, `FeedbackForm`, `BrokerFeedbackForm`) passam a renderizar campos extras dinamicamente alem dos campos fixos do sistema

### Secao Tecnica

**Passo 1: Migracao SQL**

Criar tabela unificada `form_config_sections` e `form_config_fields`:

```sql
-- Secoes
CREATE TABLE form_config_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_formulario VARCHAR NOT NULL, -- 'ficha_visita' | 'feedback_cliente' | 'feedback_corretor'
  section_id VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Campos
CREATE TABLE form_config_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_formulario VARCHAR NOT NULL,
  section_id VARCHAR NOT NULL,
  field_id VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  field_type VARCHAR NOT NULL, -- text|textarea|select|radio|checkbox|number|date|email|telefone|rating
  placeholder VARCHAR,
  help_text VARCHAR,
  options JSONB,
  is_required BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false, -- campos do sistema
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

- RLS por `organization_id` (mesmo padrao das tabelas existentes)
- Trigger `set_organization_id` em ambas
- Adicionar coluna `campos_customizados JSONB` nas tabelas `fichas_visita` e `feedbacks_visita`
- Migrar dados existentes de `feedback_corretor_config_sections/fields` para as novas tabelas com `tipo_formulario = 'feedback_corretor'`
- Seed com campos padrao `is_locked = true` para os 3 tipos

**Passo 2: Hook unificado `src/hooks/useFormConfig.ts`**

- Substitui `useFeedbackCorretorConfig.ts`
- Recebe `tipoFormulario` como parametro
- CRUD para sections e fields filtrados por tipo
- Queries: `['form-config', tipoFormulario]`

**Passo 3: Pagina unificada `src/pages/ConfigurarFormularios.tsx`**

- Substitui `CalibradorFeedbackCorretor.tsx`
- 3 abas (Ficha de Visita | Feedback Cliente | Feedback Corretor)
- Cada aba mostra Accordion com secoes/campos (reutiliza padrao visual existente)
- Drag-and-drop via `@dnd-kit/sortable` para reordenar campos dentro de secoes
- Campos com `is_locked` mostram badge "Sistema" e botao excluir desabilitado
- Tipos de campo expandidos no modal: text, textarea, select, radio, checkbox, number, date, email, telefone, rating
- Campos placeholder e texto de ajuda no modal de edicao

**Passo 4: Componente `src/components/forms/DynamicFieldRenderer.tsx`**

- Componente reutilizavel que renderiza um campo baseado em seu `field_type`
- Aceita `value`, `onChange`, `disabled`
- Suporta todos os tipos: text, textarea, select, radio, checkbox, number, date, email, telefone, rating

**Passo 5: Adaptar formularios existentes**

5a. `NovaFichaVisita.tsx`:
- Apos os campos fixos do sistema, buscar campos customizados de `form_config_fields` com `tipo_formulario = 'ficha_visita'`
- Renderizar via `DynamicFieldRenderer` em uma secao "Campos Adicionais"
- Salvar respostas em `fichas_visita.campos_customizados` (JSONB)

5b. `FeedbackForm.tsx`:
- Apos os campos fixos (avaliacao geral, efeito uau, etc.), renderizar campos customizados
- Salvar em `feedbacks_visita.campos_customizados` (JSONB)

5c. `BrokerFeedbackForm.tsx`:
- Migrar para usar a nova tabela unificada em vez de `feedback_corretor_config_sections/fields`
- Manter comportamento identico (ja e 100% dinamico)

**Passo 6: Atualizacoes de navegacao**

- `AppSidebar.tsx`: renomear "Calibrador Feedback" para "Configurar Formularios", URL `/configurar-formularios`
- `App.tsx`: nova rota `/configurar-formularios` + redirect da rota antiga
- Manter rota `/calibrador-feedback-corretor` como redirect para compatibilidade

**Passo 7: Cleanup**

- Marcar `feedback_corretor_config_sections` e `feedback_corretor_config_fields` como deprecated (manter para rollback, remover em versao futura)
- Remover hook `useFeedbackCorretorConfig.ts` apos migracao

### Campos Padrao (Seed) por Tipo

**Ficha de Visita** (is_locked = true):
- Secao "Identificacao do Cliente": nome, CPF, telefone, email, RG, endereco
- Secao "Identificacao do Imovel": endereco imovel, condominio, unidade, codigo, proprietario, valor
- Secao "Intermediacao": corretor, data/hora, notas

**Feedback Cliente** (is_locked = true):
- Secao "Avaliacao Geral": avaliacao_geral (rating), conexao_imovel (rating), atende_necessidades (checkbox)
- Secao "Efeito UAU": efeito_uau (checkbox multiplo), efeito_uau_detalhe (textarea)
- Secao "Pontos de Atencao": o_que_mais_gostou, o_que_menos_gostou, ponto_resistencia, sugestoes
- Secao "Interesse e Proposta": nivel_interesse (radio), percepcao_valor (radio), gostaria_fazer_proposta (checkbox)

**Feedback Corretor** (migrar dados existentes):
- Secoes e campos ja cadastrados na tabela atual

### Arquivos criados/editados

```text
CRIADOS:
  src/hooks/useFormConfig.ts
  src/pages/ConfigurarFormularios.tsx
  src/components/forms/DynamicFieldRenderer.tsx

EDITADOS:
  src/pages/NovaFichaVisita.tsx (adicionar secao de campos customizados)
  src/components/visitas/FeedbackForm.tsx (adicionar secao de campos customizados)
  src/components/visitas/BrokerFeedbackForm.tsx (apontar para tabela unificada)
  src/components/AppSidebar.tsx (renomear item)
  src/App.tsx (nova rota + redirect)

REMOVIDOS (apos migracao):
  src/hooks/useFeedbackCorretorConfig.ts
  src/pages/CalibradorFeedbackCorretor.tsx
```
