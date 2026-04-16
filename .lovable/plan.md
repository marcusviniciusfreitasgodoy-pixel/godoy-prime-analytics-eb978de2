

## Diagnóstico

A função `analyze-document` **não envia a data atual** no prompt para o modelo de IA (Gemini). Isso faz com que o modelo use seu **conhecimento interno de "data de treinamento"**, que pode ser de 2024 ou início de 2025.

Quando o documento mostra "15/04/2026", o modelo interpreta como **data futura** porque, na sua referência interna, ainda estamos em 2024/início de 2025. Por isso disparou o alerta crítico.

**Hoje é 16/04/2026** (data real do sistema), e o documento é de 15/04/2026 — ou seja, foi emitido **ontem**, totalmente válido. O alerta é um **falso positivo**.

### Onde está o problema

`supabase/functions/analyze-document/index.ts` (linha ~264-268):
```ts
const userContent = [
  { type: 'text', text: `Analise este documento imobiliário...` },
  // ❌ Nenhuma menção à data atual
];
```

O `BASE_SYSTEM_PROMPT` também não inclui a data de referência.

## Correção Proposta

### 1. Injetar a data atual no prompt (servidor-side)

No início do handler em `analyze-document/index.ts`, calcular a data atual em pt-BR e incluir tanto no system prompt quanto no user content:

```ts
const hoje = new Date().toLocaleDateString('pt-BR', { 
  day: '2-digit', month: '2-digit', year: 'numeric',
  timeZone: 'America/Sao_Paulo'
});

const systemPrompt = BASE_SYSTEM_PROMPT 
  + `\n\n## DATA DE REFERÊNCIA\nA data atual é **${hoje}**. Use SEMPRE esta data como referência para validar prazos, vencimentos, datas de emissão e detectar datas futuras. NÃO use seu conhecimento interno de data — use apenas a data fornecida aqui.`
  + knowledgeContext;
```

E também no `userContent[0].text`:
```ts
text: `Data atual: ${hoje}. Analise este documento imobiliário (${images.length} página(s))...`
```

### 2. Reforçar regra anti-alucinação de data

Adicionar nas REGRAS GERAIS do prompt:
> "9. Para validar datas futuras/vencidas, use EXCLUSIVAMENTE a data de referência fornecida no início. Nunca use sua data de treinamento."

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/analyze-document/index.ts` | Injetar `hoje` (America/Sao_Paulo) no system prompt + user message; adicionar regra 9 |

## Resultado esperado

Documentos emitidos até a data atual deixam de ser marcados como "data futura". O modelo passa a usar a data real do sistema (16/04/2026) como referência, eliminando esse tipo de falso positivo em todas as análises (certidões, declarações, comprovantes, etc.).

