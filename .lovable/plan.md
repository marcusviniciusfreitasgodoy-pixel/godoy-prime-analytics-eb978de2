
## Modulo de Feedback do Corretor com Formulario Customizavel

### Resumo
Criar o modulo de Feedback do Corretor, permitindo que o profissional registre observacoes tecnicas apos cada visita. Alem do formulario em si, sera criada uma secao de configuracao (no estilo do Calibrador de Vistorias existente) onde o admin pode customizar as secoes e campos do formulario.

### O que muda para o usuario
- Na pagina **Visitas**, cada ficha com status "realizada" ganha um botao **"Feedback Corretor"** para registrar observacoes profissionais
- O formulario padrao inclui secoes de: Percepcao de Interesse do Cliente, Estado do Imovel, Potencial de Negociacao e Proximos Passos
- Na **Sidebar** (area de gerente/admin), surge o item **"Calibrador Feedback Corretor"** para customizar os campos do formulario
- Na pagina de configuracao, o admin pode adicionar/editar/remover secoes e campos (similar ao Calibrador de Vistorias), definindo label, tipo de campo (texto, nota 1-5, selecao, checkbox), e ordem de exibicao

### Secao Tecnica

**Passo 1: Migracao SQL -- 3 novas tabelas**

1. `feedback_corretor_config_sections` -- secoes customizaveis do formulario
   - id (uuid PK), section_id (varchar), title (varchar), description (text), display_order (int), is_active (bool), organization_id (uuid), created_at, updated_at

2. `feedback_corretor_config_fields` -- campos dentro de cada secao
   - id (uuid PK), section_id (varchar FK), field_id (varchar), label (varchar), field_type (varchar: text, rating, select, checkbox, textarea), options (jsonb, para tipo select), is_required (bool), display_order (int), is_active (bool), organization_id (uuid), created_at, updated_at

3. `feedbacks_corretor` -- dados preenchidos pelo corretor
   - id (uuid PK), ficha_visita_id (uuid FK fichas_visita), corretor_id (uuid), respostas (jsonb -- armazena campo:valor dinamicamente), notas_gerais (text), proximos_passos (text), created_at

- RLS: todas as tabelas protegidas por `get_user_org_id(auth.uid())`
- Seed: inserir secoes e campos padrao (Percepcao de Interesse, Estado do Imovel, Potencial de Negociacao, Proximos Passos) na migracao
- Habilitar Realtime na tabela `feedbacks_corretor`

**Passo 2 (novo): `src/hooks/useFeedbackCorretorConfig.ts`**
- Hook CRUD para `feedback_corretor_config_sections` e `feedback_corretor_config_fields`
- Segue o padrao de `useVistoriaChecklist.ts` (queries separadas para secoes e campos, mutations para create/update/delete)

**Passo 3 (novo): `src/hooks/useFeedbackCorretor.ts`**
- Hook para `feedbacks_corretor` (listar por ficha_visita_id, criar, verificar se ja existe)
- Segue o padrao de `useFeedbackVisita.ts`

**Passo 4 (novo): `src/pages/CalibradorFeedbackCorretor.tsx`**
- Pagina de configuracao seguindo o padrao visual do `CalibradorVistoria.tsx`
- Accordion com secoes, cada secao mostra seus campos
- Botoes de adicionar/editar/remover secoes e campos
- Cada campo define: label, tipo (text/rating/select/checkbox/textarea), opcoes (se select), obrigatorio, ordem
- Restrito a admin/gerente

**Passo 5 (novo): `src/components/visitas/BrokerFeedbackForm.tsx`**
- Formulario dinamico que carrega secoes e campos da config
- Renderiza cada campo conforme o `field_type`:
  - `rating` -> Slider 1-5
  - `text` -> Input
  - `textarea` -> Textarea
  - `select` -> Select com opcoes do JSONB
  - `checkbox` -> Checkbox
- Salva tudo como JSONB na coluna `respostas` de `feedbacks_corretor`

**Passo 6 (novo): `src/components/visitas/BrokerFeedbackModal.tsx`**
- Dialog que encapsula o `BrokerFeedbackForm` para uso dentro da pagina de Visitas

**Passo 7 (editar): `src/components/visitas/VisitCard.tsx`**
- Adicionar botao "Feedback Corretor" em fichas com status "realizada"
- Abre o `BrokerFeedbackModal`

**Passo 8 (editar): `src/components/AppSidebar.tsx` e `src/components/DemoSidebar.tsx`**
- Adicionar "Calibrador Feedback Corretor" na secao de gerente/admin

**Passo 9 (editar): `src/App.tsx` e `src/pages/DemoLayout.tsx`**
- Adicionar rota `/calibrador-feedback-corretor` apontando para a nova pagina

**Passo 10 (editar): `src/types/visitas.ts`**
- Adicionar interfaces `FeedbackCorretor` e `FeedbackCorretorInsert`

### Campos Padrao (Seed)

```text
Secao 1: Percepcao de Interesse do Cliente
  - Nivel de interesse percebido (rating 1-5)
  - Linguagem corporal (select: positiva / neutra / negativa)
  - Perguntas relevantes feitas (textarea)

Secao 2: Estado do Imovel
  - Condicao geral (rating 1-5)
  - Necessidade de reformas (select: nenhuma / pequenas / medias / grandes)
  - Observacoes sobre o imovel (textarea)

Secao 3: Potencial de Negociacao
  - Probabilidade de fechamento (rating 1-5)
  - Flexibilidade do proprietario (select: baixa / media / alta)
  - Margem de negociacao estimada (text)

Secao 4: Proximos Passos
  - Acao recomendada (select: segunda visita / proposta / descarte / aguardar)
  - Prazo sugerido (text)
  - Observacoes finais (textarea)
```

### Estrutura do JSONB `respostas`

```text
{
  "interesse_percebido": 4,
  "linguagem_corporal": "positiva",
  "perguntas_relevantes": "Cliente perguntou sobre...",
  "condicao_geral": 3,
  ...
}
```

### Fluxo

```text
Admin configura formulario em /calibrador-feedback-corretor
  |
  v
Corretor realiza visita -> status = "realizada"
  |
  v
Corretor clica "Feedback Corretor" no card da ficha
  |
  v
Modal carrega secoes/campos da config -> renderiza formulario dinamico
  |
  v
Corretor preenche -> salva em feedbacks_corretor.respostas (JSONB)
  |
  v
Dados disponiveis para analytics e comparacao com feedback do cliente
```
