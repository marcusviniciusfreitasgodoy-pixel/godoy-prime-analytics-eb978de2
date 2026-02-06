
# Plano: Exportacao PDF do Dashboard de Feedbacks Analiticos

## Objetivo

Adicionar botao "Exportar PDF" no dashboard de feedbacks que gera um relatorio profissional com KPIs e representacoes visuais dos graficos, seguindo o template visual padrao Godoy Prime (header navy/gold, footer com CRECI).

---

## Abordagem Tecnica

Como Recharts renderiza em SVG no browser e jsPDF nao suporta SVG nativamente, os graficos serao representados como **tabelas e barras desenhadas manualmente** no PDF (mesmo padrao usado no restante do projeto). Isso garante qualidade e consistencia visual sem depender de canvas ou html2canvas.

---

## Estrutura do PDF (3-4 paginas)

### Pagina 1 - Capa + KPIs
- Header padrao Godoy Prime (via `drawGodoyHeader`)
- Subtitulo: "Relatorio Analitico de Feedbacks de Visitas"
- 4 KPI boxes em grid 2x2:
  - Avaliacao Media (estrelas)
  - Taxa de Proposta (%)
  - Percepcao Valor Justo (%)
  - Total de Feedbacks
- Conexao Emocional Media (barra visual)

### Pagina 2 - Distribuicao e Percepcao
- Secao "Distribuicao de Avaliacoes": barras horizontais desenhadas com `doc.rect()` para cada nota (1-5 estrelas)
- Secao "Nivel de Interesse": tabela com barras coloridas (Muito Alto, Alto, Medio, Baixo)
- Secao "Percepcao de Valor": tabela com barras coloridas (Abaixo, Justo, Acima)

### Pagina 3 - Tendencias + Efeitos UAU
- Secao "Evolucao da Satisfacao Mensal": tabela com mes, media, quantidade + mini barras
- Secao "Efeitos UAU Mais Citados": barras horizontais com contagem

### Pagina 4 - Feedbacks Recentes
- Tabela compacta com: Data, Visitante, Endereco, Nota
- Rodape com disclaimer e data de geracao

---

## Arquivos Envolvidos

| Arquivo | Acao |
|---|---|
| `src/utils/feedbackAnalyticsPdfExport.ts` | **NOVO** - Funcao `exportFeedbackAnalyticsPdf(analytics)` que gera o PDF usando jsPDF + pdfTemplate |
| `src/components/visitas/FeedbackAnalyticsDashboard.tsx` | **Editar** - Adicionar botao "Exportar PDF" e botao "Enviar por Email" no topo do dashboard |

### Detalhes de implementacao

**`feedbackAnalyticsPdfExport.ts`:**
- Importa `drawGodoyHeader`, `drawSectionTitle`, `applyFootersToAllPages`, `BRAND_COLORS`, `getMaxContentY`, `fetchCompanyInfoForPDF` de `pdfTemplate.ts`
- Recebe `FeedbackAnalytics` como parametro
- Desenha barras horizontais com `doc.setFillColor()` + `doc.rect()` proporcionais ao valor maximo
- Retorna instancia `jsPDF` (compativel com `SendPdfEmailDialog`)

**`FeedbackAnalyticsDashboard.tsx`:**
- Adicionar no topo (antes dos KPIs) uma row com botoes:
  - `Download` (icone FileDown) - chama `exportFeedbackAnalyticsPdf` e salva localmente
  - `Enviar por Email` (icone Mail) - abre `SendPdfEmailDialog` com `documentType: 'feedback_analytics'`
- Integrar com `SendPdfEmailDialog` existente passando `generatePdf` como callback
- Adicionar `'feedback_analytics'` como novo `DocumentType` no `pdfEmailService.ts`

**`src/utils/pdfEmailService.ts`:**
- Adicionar `'feedback_analytics'` ao tipo `DocumentType`

