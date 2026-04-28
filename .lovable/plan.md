
# Plano: Múltiplos Agentes de IA para Análise de Documentos

Permitir que você escolha **qual agente de IA** usar a cada upload de documento, equilibrando velocidade, custo e profundidade conforme a complexidade do documento.

---

## Agentes que serão disponibilizados

Quatro perfis cuidadosamente escolhidos para cobrir os cenários reais do corretor:

| Agente | Modelo (interno) | Quando usar | Velocidade | Profundidade |
|---|---|---|---|---|
| **Análise Rápida** | google/gemini-3-flash-preview | Triagem rápida, IPTU, condomínio, declarações simples | Muito rápida (~5s) | Boa |
| **Análise Equilibrada** | google/gemini-2.5-flash | Documentos do dia a dia, contratos padrão | Rápida (~10s) | Muito boa |
| **Análise Profunda** *(padrão atual)* | google/gemini-2.5-pro | Matrículas, escrituras, certidões de ônus reais | Média (~20-30s) | Excelente |
| **Análise Jurídica Premium** | openai/gpt-5 | Pareceres complexos, múltiplas cláusulas, due diligence crítica | Lenta (~30-45s) | Máxima |

> Os nomes mostrados na tela serão amigáveis (ex.: "Análise Rápida"), sem expor detalhes técnicos do modelo.

---

## O que muda na interface (página Documentação)

1. **Novo seletor de agente** acima da área de upload, com:
   - Cards visuais para cada um dos 4 agentes (ícone, nome, descrição curta, badge de velocidade)
   - Padrão pré-selecionado: **Análise Profunda** (mantém o comportamento atual)
   - Tooltip explicando "quando usar cada um"

2. **Indicação visual no resultado**: cada análise no histórico mostrará qual agente foi usado (badge discreto), para você comparar resultados.

3. **Memória da última escolha**: o seletor lembra o último agente escolhido (localStorage), para não precisar reconfigurar a cada upload.

---

## Mudanças técnicas (resumo)

1. **Edge function `analyze-document`**:
   - Aceitar parâmetro `model` no body da requisição
   - Validar contra whitelist de 4 modelos permitidos (segurança)
   - Ajustar `reasoning.effort` automaticamente: `high` para Pro/GPT-5, `medium` para Flash, `low` para Flash-preview
   - Manter fallback para `gemini-2.5-pro` se nenhum modelo for enviado (compatibilidade)

2. **Banco de dados** (`document_analyses`):
   - Adicionar coluna `modelo_usado` (text) para registrar qual agente gerou a análise
   - Migração simples, sem perda de dados existentes

3. **Componente `DocumentAnalyzer.tsx`**:
   - Novo subcomponente `AgentSelector` com os 4 cards
   - Estado `selectedAgent` propagado no `fetch` para a edge function
   - Persistência em localStorage

4. **Histórico de Documentos** (`HistoricoDocumentos.tsx`):
   - Novo badge "Agente: [nome]" ao lado do tipo de documento
   - Filtro opcional por agente usado

---

## Considerações importantes

- **Custo**: cada agente tem custo diferente no Lovable AI. O agente "Premium" (GPT-5) consome mais créditos por análise. O texto explicativo no seletor avisará isso.
- **Limite de páginas**: continua em 5 páginas por documento (limite atual da função), independente do agente.
- **Resultado estruturado**: todos os 4 agentes retornam o mesmo JSON estruturado, garantindo compatibilidade total com o histórico, PDFs e checklists já existentes.
- **Sem quebra**: análises antigas (sem `modelo_usado`) continuarão funcionando — o badge simplesmente não aparecerá nelas.

---

## Arquivos que serão alterados

- `supabase/functions/analyze-document/index.ts` — aceitar `model` parametrizado
- `src/components/DocumentAnalyzer.tsx` — adicionar seletor de agente
- `src/components/AgentSelector.tsx` *(novo)* — UI dos 4 cards
- `src/pages/HistoricoDocumentos.tsx` — exibir agente usado
- `src/hooks/useDocumentAnalyses.ts` — adicionar `modelo_usado` ao tipo
- **Migração SQL** — adicionar coluna `modelo_usado` em `document_analyses`

Após aprovar, eu implemento tudo e você poderá testar imediatamente escolhendo agentes diferentes para um mesmo documento e comparar os resultados.
