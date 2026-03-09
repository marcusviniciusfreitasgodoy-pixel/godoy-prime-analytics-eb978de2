

## Plano: Edge Function + Componente de Enriquecimento IA

### Observações importantes

1. **ANTHROPIC_API_KEY não existe** nos secrets do projeto. Preciso solicitar que você a adicione antes de a Edge Function funcionar.

2. **Import named vs default**: A página `InteligenciaTerritorial.tsx` importa `{ EnriquecerCondominios }` (named export), mas seu código usa `export default`. Vou ajustar para `export function EnriquecerCondominios` (named export) para manter compatibilidade.

3. **Seu código JSX está sem as tags HTML** (provavelmente o chat comeu os `<div>`, `<p>`, etc). Vou reconstruir o JSX baseado na lógica e estrutura que você descreveu.

4. **Lovable AI vs Anthropic**: O projeto já tem `LOVABLE_API_KEY` configurada, que dá acesso a modelos como `google/gemini-2.5-pro` sem custo extra de API key. Porém, como você pediu explicitamente Anthropic/Claude, vou seguir com isso — mas preciso que você forneça a chave.

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `supabase/functions/enrich-condominios-ai/index.ts` | Criar — Edge Function com Anthropic |
| `supabase/config.toml` | Adicionar `[functions.enrich-condominios-ai]` com `verify_jwt = false` |
| `src/components/territorial/EnriquecerCondominios.tsx` | Reescrever — componente completo com upload CSV, processamento em lotes, preview de resultados e geração de SQL |

### Passo 1: Solicitar ANTHROPIC_API_KEY
Antes de qualquer implementação, vou pedir para você adicionar a secret via ferramenta segura.

### Passo 2: Edge Function
Código exatamente como você enviou, com CORS headers e chamada à API da Anthropic.

### Passo 3: Componente
Seu componente com as correções:
- `export function` (named) em vez de `export default`
- JSX reconstruído com as tags que o chat omitiu
- Fluxo: upload CSV → preview → processamento em lotes via `supabase.functions.invoke("enrich-condominios-ai")` → tabela de resultados + SQL copiável/downloadável

### Passo 4: config.toml
Adicionar entrada para a nova function.

