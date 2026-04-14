

## Plano: Fortalecer a análise de documentos e base de conhecimento

### Alteração 1: Atualizar modelo do analisador de documentos
**Arquivo:** `supabase/functions/analyze-document/index.ts`
- Trocar `model: "google/gemini-2.5-flash"` para `model: "google/gemini-2.5-pro"`
- O modelo Pro tem raciocínio superior para extrair dados de documentos complexos (matrículas, certidões, contratos)

### Alteração 2: Integrar base de conhecimento ao analisador
**Arquivo:** `supabase/functions/analyze-document/index.ts`
- Antes de chamar a IA, buscar artigos relevantes da `sofia_knowledge_base` (categoria "documentacao", "legislacao", "due_diligence")
- Injetar esse conhecimento no prompt do sistema para que a IA dê alertas mais específicos e fundamentados (ex: "Conforme Lei 6.015/1973, Art. 167...")

### Alteração 3: Funcionalidade de importação em massa na Base de Conhecimento
**Arquivo:** `src/pages/BaseConhecimento.tsx`
- Adicionar botão "Importar CSV" que aceita arquivo com colunas: categoria, título, conteúdo, palavras-chave, fonte
- Processar e inserir em lote na tabela `sofia_knowledge_base`

### Resultado esperado
- Análise de documentos mais precisa e com alertas fundamentados na legislação
- Possibilidade de alimentar rapidamente a base com conteúdo especializado

