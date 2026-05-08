
# Plano — Pacote de Handoff Técnico: Módulo Autorização de Captação

## Objetivo
Produzir um pacote completo, agnóstico de stack, que permita a outro time de desenvolvimento reimplementar o módulo de **Geração e Emissão de Autorização de Vendas para Captação** exatamente como existe hoje, em qualquer tecnologia (não amarrado a React/Supabase).

## Entregáveis (3 formatos do mesmo conteúdo)

1. **`Handoff-Autorizacao-Captacao.pdf`** — documento executivo navegável com índice, diagramas e screenshots. Ideal para envio direto.
2. **`Handoff-Autorizacao-Captacao.docx`** — versão editável (Word) para o time receptor anotar/comentar.
3. **`handoff-autorizacao-captacao.zip`** — estrutura tipo repositório:
   ```text
   /README.md
   /docs/
     01-visao-produto.md
     02-fluxo-negocio.md
     03-modelo-dados.md
     04-regras-validacao.md
     05-geracao-pdf.md
     06-api-contratos.md
     07-pagina-publica-assinatura.md
     08-integracoes-email-whatsapp.md
     09-auditoria-eventos.md
     10-casos-teste.md
   /schema/schema.sql           (DDL agnóstico Postgres + comentários)
   /schema/rls-policies.md      (regras de acesso traduzidas)
   /api/openapi.yaml            (contratos REST agnósticos)
   /api/examples/*.json         (payloads de exemplo)
   /assets/screenshots/*.png    (fluxo anotado)
   /assets/sample-pdfs/         (PDF rascunho + assinado de exemplo)
   /assets/diagrams/*.mmd       (Mermaid: fluxo + máquina de estados)
   ```

Todos os arquivos serão entregues em `/mnt/documents/`.

## Conteúdo do documento (10 seções)

### 1. Visão de Produto
- Propósito do módulo, atores (Corretor, Proprietário, Sistema), valor de negócio.
- Glossário pt-BR (Autorização de Captação, Imobiliária, Corretor Autônomo).

### 2. Fluxo de Negócio
- Diagrama Mermaid de 3 pontos de entrada → Drawer → Rascunho/Envio → Assinatura → PDF final.
- Máquina de estados: `rascunho → enviada → visualizada → assinada | recusada` (com transições e gatilhos).
- Regra de unicidade: 1 autorização por avaliação.

### 3. Modelo de Dados
- DDL completo de `autorizacoes_captacao` e `autorizacoes_captacao_eventos` (colunas, tipos, defaults, FKs, índices, constraints).
- Bucket de storage `autorizacoes-pdfs`: estrutura de paths (`{org_id}/{autorizacao_id}/{versao}.pdf`), retenção, TTL de signed URL (60s).
- ER diagram (Mermaid).

### 4. Regras de Validação
- Campos obrigatórios x opcionais (proprietário: nome/CPF/email; endereço completo; valor avaliação > 0).
- Máscara monetária BRL: formato `R$ 1.234.567` (sem decimais), `inputMode="numeric"` + regex.
- Checkboxes "Isento" para Condomínio e IPTU.
- Comportamento: highlight vermelho + mensagem inline + Alert de resumo + diálogo de confirmação para opcionais vazios + scroll para o primeiro erro.
- Validações de formato: CPF (algoritmo dos dígitos), e-mail (RFC), CEP (8 dígitos).

### 5. Geração de PDF
- Layout completo (cabeçalho com logo Navy/Gold, blocos de dados, assinatura, QR code, rodapé de auditoria com hash).
- Tipografia: Helvetica regular (evitar bold por bug de kerning), 13pt títulos, 10pt valores.
- Paleta: Navy `#0C2340`, Gold `#D4AF37`.
- Marca d'água diagonal "PRÉ-VISUALIZAÇÃO" para rascunhos.
- Pseudo-código de renderização agnóstico (não amarrado a jsPDF).
- Regras de paginação (assinatura + auditoria devem ficar na mesma página).

### 6. API / Contratos
- OpenAPI 3 com endpoints: `POST /autorizacoes`, `PATCH /autorizacoes/:id`, `POST /autorizacoes/:id/enviar`, `POST /autorizacoes/:id/assinar`, `GET /autorizacoes/publica/:codigo`.
- Payloads JSON de request/response para cada endpoint.
- Códigos de erro padronizados.

### 7. Página Pública de Assinatura
- Rota agnóstica `/autorizacao/:codigo` (sem autenticação, acesso por token).
- Captura de assinatura: dois modos (Desenhar canvas + Digitar nome estilizado).
- Validação: confirmação de identidade (CPF dos últimos dígitos), aceite LGPD.
- Fluxos de "Recusar" e "Assinar".

### 8. Integrações
- **E-mail (Resend ou equivalente SMTP)**: template HTML, variáveis dinâmicas, fallback texto plano.
- **WhatsApp (Z-API ou equivalente)**: payload JSON, template de mensagem com link curto, log de auditoria em tabela `whatsapp_message_logs`.
- Variáveis de ambiente / secrets necessários (lista nominal, sem valores).

### 9. Auditoria
- Tipos de evento: `criada`, `enviada`, `visualizada`, `assinada`, `recusada`, `pdf_gerado`, `pdf_baixado`.
- Quando disparar cada um, payload mínimo, retenção.

### 10. Casos de Teste
- 12+ cenários funcionais (rascunho com campos faltantes, envio sem CPF, assinatura válida, recusa, expiração de signed URL, reemissão, etc.).
- Checklist de QA do PDF (5 itens visuais + 3 de conteúdo).
- Critérios de aceite mensuráveis.

## Screenshots a Capturar (anotados com setas e numeração)

1. Botão "Gerar Autorização" no Passo 5 da Avaliação.
2. Botão na lista do Histórico de Avaliações (com selo "Autorização emitida").
3. Página `/autorizacoes-captacao` com listagem.
4. Modal de seleção de avaliação.
5. Drawer de geração — aba "Dados" com máscaras BRL e checkboxes "Isento".
6. Drawer com erros de validação (highlights vermelhos + Alert de resumo).
7. Diálogo de confirmação de campos opcionais vazios.
8. Pré-visualização do documento (com marca d'água).
9. Página pública de assinatura (modos Desenhar e Digitar).
10. PDF final assinado (página única) — anexado também como arquivo real.

## Como será produzido (técnico)

1. **Montar conteúdo Markdown** das 10 seções em `/tmp/handoff/docs/`.
2. **Capturar screenshots** via `browser--screenshot` navegando pelos 3 pontos de entrada e estados do drawer; anotar com Pillow (números/setas).
3. **Gerar PDFs de exemplo** rodando o utilitário existente `qa-autorizacao2.mjs` adaptado (rascunho + assinado).
4. **Compilar PDF executivo** com ReportLab (capa Navy, índice, conteúdo, screenshots embutidos).
5. **Compilar DOCX editável** com `docx-js` (mesma estrutura, estilos Heading1/2, tabelas com bordas claras).
6. **Empacotar .zip** com toda a árvore Markdown + assets + schema + OpenAPI.
7. **QA visual obrigatório**: converter PDF em imagens, inspecionar todas as páginas; abrir DOCX no LibreOffice headless e gerar thumbnails; validar que o `.zip` extrai e abre sem erros.
8. **Entregar** os 3 arquivos via `<lov-artifact>` em `/mnt/documents/`.

## Premissas
- Especificação **agnóstica**: descreve regras, contratos e fluxos. Trechos de código atual entram apenas como referência opcional em apêndice (não como prescrição).
- Texto integralmente em **pt-BR**.
- Sem dados sensíveis reais (proprietários, CPFs) — exemplos sintéticos.

## Tempo estimado
Geração ~6–10 minutos (a maior parte em screenshots + QA visual de PDF/DOCX).

## Fora de escopo
- Código-fonte real do projeto (o time não receberá React/TypeScript do repositório, apenas a especificação para reimplementar).
- Migrações Supabase específicas — substituídas por DDL Postgres puro.
- Configuração de CI/CD da nova stack.
