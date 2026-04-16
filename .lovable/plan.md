
Ótima ideia. Política de retenção evita inflar storage e DB sem perder o histórico útil.

## Política de Retenção — Análises de Documentos

### Estratégia em 2 camadas

| Camada | O que é | Padrão proposto | Motivo |
|---|---|---|---|
| **Arquivo original** (Storage) | PDF/imagem do documento | **30 dias** | Pesado; raramente reaberto após análise |
| **Metadados da análise** (DB) | Status, alertas, dados extraídos, próximos passos | **180 dias** | Leve; útil para histórico/auditoria |

Após 180 dias o registro é apagado por completo. Entre 30 e 180 dias, o usuário ainda vê a análise — só não consegue mais baixar o arquivo original.

### Como funciona

1. **Colunas novas** em `document_analyses`:
   - `file_expires_at` (`created_at + 30 dias`)
   - `expires_at` (`created_at + 180 dias`)
   - Calculadas via trigger no insert.
2. **Edge Function `cleanup-document-analyses`** roda diariamente via `pg_cron` (03:00 BRT):
   - Remove arquivos do bucket onde `file_expires_at < now()` e zera `file_path`.
   - Deleta registros completos onde `expires_at < now()`.
3. **UI no Histórico**:
   - Banner informativo: *"Arquivos disponíveis por 30 dias · Análises mantidas por 180 dias"*.
   - Badge por item: *"Arquivo expira em X dias"* / *"Arquivo expirado"*.
   - Botão **Exportar PDF da análise** no modal — gera relatório leve (jsPDF manual) com dados extraídos, alertas e próximos passos, permitindo arquivamento externo antes da expiração.
4. **Constantes ajustáveis** no topo da Edge Function: `FILE_RETENTION_DAYS = 30`, `ANALYSIS_RETENTION_DAYS = 180`.

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `supabase/migrations/...` | Adiciona `expires_at`, `file_expires_at` + trigger de cálculo |
| `supabase/functions/cleanup-document-analyses/index.ts` | **Novo** — limpa arquivos e registros expirados |
| pg_cron (insert SQL) | Agenda execução diária |
| `src/hooks/useDocumentAnalyses.ts` | Expõe campos de expiração |
| `src/pages/HistoricoDocumentos.tsx` | Banner + badges + botão de exportar PDF |
| `src/utils/documentAnalysisPdfExport.ts` | **Novo** — PDF da análise (jsPDF) |

### Antes de implementar — confirme os prazos

**Arquivo original (storage):** sugiro **30 dias** (alternativas: 15 / 60 / 90).
**Metadados (DB):** sugiro **180 dias** (alternativas: 90 / 365 / sem expiração).

Se aprovar com os padrões, sigo com 30/180. Se preferir outros valores, me diga e ajusto antes de codar.
