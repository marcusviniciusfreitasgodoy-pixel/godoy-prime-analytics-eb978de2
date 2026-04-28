## Problema

Ao clicar em **Visualizar** em `/configurar-formularios`, a página quebra com:

> Objects are not valid as a React child (found: object with keys {label, value})

### Causa raiz

Vários campos existentes no banco (ex.: `qualificacao_lead`, `nivel_interesse`, `prazo_compra`) têm `options` no formato:

```json
[{ "label": "Frio", "value": "frio" }, { "label": "Morno", "value": "morno" }]
```

Mas o `DynamicFieldRenderer` (usado pelo dialog de pré-visualização) trata cada opção como **string simples**:

```tsx
// src/components/forms/DynamicFieldRenderer.tsx (select e radio)
{options.map((opt: string) => (
  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
))}
```

Quando `opt` é um objeto, `value={opt}` e `{opt}` jogam o erro do React, derrubando a página inteira (ErrorBoundary).

A listagem da página (`ConfigurarFormularios.tsx` linha 288) também imprime `field.options.join(", ")`, gerando `"[object Object], [object Object]"` em vez dos labels reais — funciona, mas fica feio.

## Correção

### 1. `src/components/forms/DynamicFieldRenderer.tsx`

Adicionar um helper que normaliza cada opção para `{ label, value }`, aceitando os 3 formatos suportados:

- `"texto"` → `{ label: "texto", value: "texto" }`
- `{ label, value }` → mantém
- `{ value }` ou `{ label }` → preenche o que faltar

Usar nas branches `select`, `radio` e `checkbox` (essa última hoje nem renderiza opções múltiplas — vamos manter como está, mas blindar).

```tsx
type RawOption = string | { label?: string; value?: string };
const normalizeOptions = (raw: any): { label: string; value: string }[] =>
  Array.isArray(raw)
    ? raw.map((o: RawOption) =>
        typeof o === "string"
          ? { label: o, value: o }
          : { label: String(o?.label ?? o?.value ?? ""), value: String(o?.value ?? o?.label ?? "") }
      ).filter(o => o.value !== "")
    : [];
```

E usar `opt.value` como `key`/`value` e `opt.label` como conteúdo visível.

### 2. `src/pages/ConfigurarFormularios.tsx` — linha 288

Trocar `field.options.join(", ")` por uma renderização que extraia o label de cada item (string ou `{label}`), mostrando algo legível na listagem das seções.

### 3. `openEditField` (linha 122) — pequena melhoria

Hoje, ao editar um campo cujas opções são objetos, o input "Opções (separadas por vírgula)" recebe `"[object Object], [object Object]"`. Vamos extrair o `label` de cada item para o usuário ver e poder editar como texto. (As opções continuarão sendo salvas como array de strings ao salvar, mantendo o comportamento atual de `handleSaveField`.)

## Escopo

- Arquivos editados: `src/components/forms/DynamicFieldRenderer.tsx`, `src/pages/ConfigurarFormularios.tsx`.
- Sem migração de banco — manteremos compatibilidade com ambos os formatos (`string[]` e `{label,value}[]`).
- Sem mudança em `BrokerFeedbackForm`, `FeedbackForm`, `ProposalForm` (eles também usam `DynamicFieldRenderer`, então ganham a correção automaticamente).

## Resultado esperado

- Botão **Visualizar** abre o dialog sem quebrar a página, mesmo para formulários como Feedback Corretor que usam opções `{label,value}`.
- Listagem de campos exibe rótulos legíveis em vez de `[object Object]`.
- Edição de campos com opções no formato objeto mostra os labels editáveis como texto separado por vírgula.