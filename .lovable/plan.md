

## Plano: Melhorar análise de Certidão de Ônus Reais e outros documentos

### Problema
O prompt atual é genérico — lista tipos de documento mas não detalha os campos a extrair de cada um. Para documentos complexos como a Certidão de Ônus Reais, isso resulta em análises superficiais.

### Alteração 1: Prompt especializado por tipo de documento
**Arquivo:** `supabase/functions/analyze-document/index.ts`
- Expandir o `BASE_SYSTEM_PROMPT` com instruções detalhadas para cada tipo de documento
- Para **Certidão de Ônus Reais** especificamente:
  - Extrair: nº matrícula, RGI, comarca, proprietário(s), CPF/CNPJ, descrição do imóvel, área, todos os registros (R-) e averbações (AV-), ônus ativos (hipotecas, penhoras, alienações fiduciárias, usufrutos, cláusulas restritivas), data de emissão
  - Classificar cada ônus como ativo/cancelado
  - Alertar sobre ônus que impedem a venda
- Instruções similares para: IPTU, Quitação Condominial, Certidão de Casamento, Contrato Social, Distribuidores
- Habilitar **reasoning** (`reasoning: { effort: "high" }`) para análise mais profunda

### Alteração 2: Seed de artigos de legislação cartorária
**Migração SQL** para inserir artigos na `sofia_knowledge_base`:
- Lei 6.015/1973 (Lei de Registros Públicos) — artigos relevantes sobre matrículas, registros e averbações
- Tipos de ônus reais e seus efeitos legais
- Checklist de due diligence para Certidão de Ônus
- Prazos de validade de certidões

### Resultado esperado
- Extração detalhada de todos os registros e averbações da matrícula
- Identificação precisa de ônus que bloqueiam a transação
- Alertas fundamentados em legislação específica
- Análise mais profunda via reasoning do modelo

