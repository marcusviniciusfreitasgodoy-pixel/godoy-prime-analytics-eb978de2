

## Análise

A Edge Function `enrich-condominios-ai` **já utiliza o Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`) com `LOVABLE_API_KEY`. Não há dependência de `ANTHROPIC_API_KEY`.

A mudança real necessária é **atualizar o prompt** com os critérios mais detalhados que você especificou (incluindo Barra Central, Eixo Américas, etc.) e garantir que o contrato de entrada/saída está correto.

## Plano

### 1. Reescrever `supabase/functions/enrich-condominios-ai/index.ts`

Alterações:
- **Prompt atualizado** com os critérios por microbairro expandidos (Barra Central, Eixo Américas, etc.)
- **Campo `confianca`** aceitar "média" (com acento) conforme especificado
- Manter gateway Lovable AI (`google/gemini-3-flash-preview`)
- Manter tratamento de erros 429/402
- Contrato de entrada/saída inalterado

O prompt será substituído pelo texto exato fornecido, com formatação adequada para o modelo retornar JSON puro.

