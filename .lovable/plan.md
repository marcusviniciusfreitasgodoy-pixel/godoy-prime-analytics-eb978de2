

## Plano: Visualizar feedback completo + exportar PDF individual + excluir feedbacks de teste

### 1. Excluir feedbacks de teste do banco
Criar uma migration SQL para deletar os 3 feedbacks vinculados a ficha TESTE-001 (`ficha_visita_id = '9edc9c89-e56d-42ff-8d5f-17b57d5d9414'`):

```sql
DELETE FROM feedbacks_visita 
WHERE ficha_visita_id = '9edc9c89-e56d-42ff-8d5f-17b57d5d9414';
```

### 2. Criar modal de detalhe do feedback individual
**Novo arquivo:** `src/components/visitas/FeedbackDetailModal.tsx`

Um Dialog que exibe todos os campos do feedback de forma organizada:
- Dados da visita (visitante, endereco, data, codigo)
- Avaliacao geral (estrelas visuais)
- Conexao com imovel
- Efeitos UAU selecionados
- O que mais/menos gostou
- Ponto de resistencia, sugestoes
- Nivel de interesse, percepcao de valor
- Valor que ofertaria (formatado em R$)
- Proposta (sim/nao)
- Campos customizados (se houver)
- Botao "Exportar PDF" no header do modal

### 3. Tornar cards clicaveis na FeedbacksList e nos feedbacks recentes do Analytics
**Arquivo:** `src/components/visitas/FeedbacksList.tsx`
- Adicionar state para feedback selecionado
- Ao clicar no card, abrir `FeedbackDetailModal` com os dados completos
- Expandir o select da query para trazer todos os campos necessarios

**Arquivo:** `src/components/visitas/FeedbackAnalyticsDashboard.tsx`
- Na lista de feedbacks recentes, tornar cada item clicavel, abrindo o mesmo modal

### 4. Criar exportacao PDF do feedback individual
**Novo arquivo:** `src/utils/feedbackIndividualPdfExport.ts`

PDF com marca Godoy Prime (usando `pdfTemplate.ts`) contendo:
- Header com logo e dados da empresa
- Titulo "Feedback da Visita - [codigo]"
- Secoes organizadas: dados da visita, avaliacoes, comentarios, interesse/proposta
- Footer com disclaimer

### Arquivos afetados
- Migration SQL (delete feedbacks teste)
- `src/components/visitas/FeedbackDetailModal.tsx` (novo)
- `src/utils/feedbackIndividualPdfExport.ts` (novo)
- `src/components/visitas/FeedbacksList.tsx` (tornar cards clicaveis)
- `src/components/visitas/FeedbackAnalyticsDashboard.tsx` (feedbacks recentes clicaveis)

