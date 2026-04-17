

## Plano: Pesquisa de Prioridades com Imobiliárias (DOCX + PDF) — v2

Adicionar a coluna **"Dor que resolve"** ao lado de cada funcionalidade, mantendo o restante do plano anterior. Isso ajuda o respondente a entender o propósito de cada item antes de priorizar.

### Estrutura de cada módulo

Para cada um dos **21 módulos**:

1. **Subtítulo do módulo** + 1 linha de finalidade
2. **Tabela "Funcionalidades"** com **5 colunas**:
   | Funcionalidade | Dor que resolve | Alta | Média | Baixa |
   |---|---|---|---|---|
3. **Tabela "Informações geradas"** (KPIs/relatórios) com **4 colunas**:
   | Informação | Para que serve | Alta · Média · Baixa |
4. Caixa "Sugestões para este módulo" (3 linhas em branco)

> A coluna "Dor que resolve" reaproveita textualmente o mapeamento já existente em `FunctionalityMapSection.tsx` (ex.: *"Vistorias sem padrão, disputas jurídicas, relatórios manuais"* para Vistoria Digital), garantindo coerência com o discurso comercial da plataforma.

### Módulos cobertos (mesma ordem da v1)

Painel Analítico · Microrregiões · Inteligência Territorial · Pesquisas de Mercado · Motor de Avaliação · Histórico de Avaliações · Vistoria Digital · Histórico de Vistorias · Estratégia de Precificação · Análise de Documentação IA · Documentação Comprador/Vendedor · Histórico de Documentos · Gestão de Visitas · Feedback de Visitas · Propostas Digitais · Pipeline CRM · Gestão de Leads · Sofia IA · Avaliação Pública · Configurações & Branding · Manual/Onboarding/Tour

### Cabeçalho e seção final (inalterados)

- Cabeçalho: título + objetivo (1 parágrafo, ~10 min) + instruções (marcar A/M/B com X)
- Final: funcionalidades ausentes (10 linhas) · 3 módulos essenciais · 3 módulos menos usados · comentários gerais (10 linhas)

### Visual

- Fonte Arial (DOCX) / Helvetica (PDF), A4, margens 2 cm
- Navy `#0C2340` em títulos · Gold `#D4AF37` em separadores · cabeçalho de tabela em Navy com texto branco
- Coluna "Dor que resolve" com largura ~5 cm (texto curto, 1 linha); colunas A/M/B com ~1 cm
- Rodapé: "Pesquisa anônima — Godoy Prime Analytics — 2026" + nº da página
- Estimativa: ~15–18 páginas (3 a mais que a v1 por causa da coluna extra)

### Execução

1. Script único `/tmp/gerar_pesquisa.py`:
   - Estrutura de dados com tuplas `(funcionalidade, dor)` e `(informação, propósito)` por módulo
   - Geração DOCX via `python-docx` (5/4 colunas, shading Navy no header)
   - Conversão para PDF via LibreOffice headless
2. Saída em `/mnt/documents/`:
   - `Pesquisa_Imobiliarias_Godoy_Prime_v2.docx`
   - `Pesquisa_Imobiliarias_Godoy_Prime_v2.pdf`
3. **QA obrigatório:** `pdftoppm` em todas as páginas — verificar overflow da coluna "Dor que resolve", alinhamento das colunas A/M/B e quebras de página no meio de módulos.
4. Entrega via `<lov-artifact>` (DOCX + PDF).

