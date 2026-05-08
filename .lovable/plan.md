## Validação do PDF da Autorização de Captação

### Diagnóstico atual

O PDF é gerado por `src/utils/autorizacaoPdfExport.ts` (jsPDF + QRCode), mas é **chamado em apenas um ponto**: `AutorizacaoPublica.tsx`, no momento em que o proprietário assina pelo link público. O blob é convertido para base64 e enviado à edge `assinar-autorizacao`, que faz upload no bucket privado `autorizacoes-pdfs` e grava o caminho em `autorizacoes_captacao.pdf_url`.

**Lacunas identificadas:**

1. **Sem download na tela de gestão** (`AutorizacoesCaptacao.tsx` → `DetalheAutorizacao`): mesmo após `status = assinada` e `pdf_url` salvo, não existe botão de "Baixar PDF". O corretor não consegue obter o documento final.
2. **Sem pré-visualização em PDF** antes do envio: o drawer mostra apenas o `AutorizacaoDocumentoPreview` em HTML; não é possível gerar/baixar um PDF de rascunho para conferência.
3. **Sem QA visual** do PDF gerado com dados reais — campos obrigatórios, formatação, paginação, QR, assinaturas, footer ainda não foram inspecionados visualmente.
4. **Validação de campos obrigatórios** existe no drawer (`errors`), mas só cobre nome, CPF, e-mail, endereço, bairro, valor avaliação e valor venda. O PDF, porém, depende também de: `cidade` (sempre default OK), `prazo_dias`, `percentual_honorarios`, `tipo_gestao` (têm defaults). OK, mas vale documentar.

### Etapas do plano

**1. Validação por execução real (sem mexer em código de produção)**
- Escrever script Node em `/tmp/test-autorizacao-pdf.mjs` que importa o util via build local e gera 3 PDFs amostrais cobrindo cenários:
  - (a) **Rascunho** (sem assinaturas, sem QR, sem auditoria)
  - (b) **Assinado completo** (com assinatura PNG, QR, IP, data/hora, vencimento)
  - (c) **Cláusulas longas** (forçando page break) — verificar paginação e footer "Página X de Y"
- Converter cada PDF em imagens via `pdftoppm` e inspecionar:
  - Header Navy + Gold + código + data
  - Bloco CONTRATANTES com todos os campos obrigatórios (nome, CPF, e-mail) e opcionais (RG, telefone)
  - Bloco IMÓVEL (endereço completo, bairro/cidade/CEP, condomínio R$/mês, IPTU R$/ano, quartos/vagas)
  - Box dourado de valores (avaliação + venda em destaque)
  - 8 cláusulas com checkbox de exclusividade refletindo `tipo_gestao`
  - Local/data + assinaturas lado a lado + auditoria + QR + footer
- Listar problemas encontrados e propor ajustes (hyphenation, overflow, contraste, alinhamento).

**2. Adicionar botão "Baixar PDF" na tela de gestão (`AutorizacoesCaptacao.tsx → DetalheAutorizacao`)**

Comportamento por status:
- **Rascunho/Enviada/Visualizada** → "Baixar Pré-visualização (PDF)": chama `generateAutorizacaoPdf(aut)` no client e dispara `downloadBlob` com nome `Autorizacao_{codigo}_PREVIA.pdf`. Marca d'água "PRÉ-VISUALIZAÇÃO" não-vinculante (adicionar parâmetro `watermark?: string` em `generateAutorizacaoPdf`).
- **Assinada** → "Baixar PDF Assinado": busca o arquivo do bucket privado via `supabase.storage.from('autorizacoes-pdfs').createSignedUrl(aut.pdf_url, 60)` e abre/baixa. Fallback: se `pdf_url` ausente, regenera client-side (reusa assinatura PNG já gravada em `assinatura_proprietario`).
- **Recusada** → não exibe botão de download.

**3. Garantir que o util suporte modo "prévia"**
- Pequena extensão de `generateAutorizacaoPdf(a, { baseUrl, watermark })`: quando `watermark` presente, desenhar texto diagonal cinza em todas as páginas. Mantém retrocompatibilidade (default sem watermark).

**4. Confirmar campos obrigatórios cobertos**
- Reler `errors` em `GerarAutorizacaoDrawer.tsx` e adicionar validações faltantes detectadas durante QA do PDF (ex.: cidade vazia rara, prazo > 0, honorários entre 1–10).

### Detalhes técnicos

- Bucket é privado → uso obrigatório de `createSignedUrl`. Já existe RLS pelo `organization_id`.
- O util já foi inspecionado: usa `helvetica` (sem riscos de glyphs ausentes), QR via `qrcode` package, paginação manual com `addPage()` quando `y + ... > pageH - 60`.
- Não usa `html2canvas` (alinhado à memória do projeto).
- O fluxo público (`AutorizacaoPublica.tsx`) **não muda** — o PDF lá continua sendo gerado client-side e enviado para storage.

### Arquivos a tocar

- `src/utils/autorizacaoPdfExport.ts` — adicionar `watermark` opcional
- `src/pages/AutorizacoesCaptacao.tsx` — adicionar botão de download em `DetalheAutorizacao`
- `src/components/autorizacoes/GerarAutorizacaoDrawer.tsx` — (eventual) reforço de validações detectadas no QA

### Entregável de QA

Resumo no chat com:
- Capturas dos 3 PDFs renderizados (cenários a/b/c)
- Lista de issues encontradas + correções aplicadas
- Confirmação de campos obrigatórios validados