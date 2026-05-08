
# Autorização de Captação — Plano de Implementação

Fluxo end-to-end que parte da avaliação concluída, gera o documento de autorização (fiel ao `.docx` enviado), envia ao proprietário por e-mail/WhatsApp e finaliza com assinatura digital pública + PDF auditável.

## Decisões consolidadas
- **MVP com 1 proprietário** (multi-contratante fica como evolução futura).
- **Valor de Avaliação 100% manual** (em branco, preenchido pelo corretor).
- **Visibilidade por organização** (qualquer corretor da imobiliária vê todas).
- **Inclui fluxo de recusa + tabela de auditoria de eventos.**
- **Documento segue versão limpa de 8 cláusulas** (página 2 do `.docx`).

## ETAPA 1 — Campos do proprietário no formulário de avaliação

Adicionar bloco opcional "Dados do Proprietário (para captação)" na Etapa 0 (`Step0Identification.tsx`) com:
- Nome completo, CPF (máscara + validação de dígitos), RG, Órgão emissor, Telefone (DDD), E-mail, CEP, Cidade (default Rio de Janeiro), valor_condominio, valor_iptu.

Migration adiciona à tabela `valuations` (já existente):
- `proprietario_nome, proprietario_cpf, proprietario_rg, proprietario_rg_orgao, proprietario_email, cep, cidade, valor_condominio, valor_iptu` (telefone e proprietário já existem).

## ETAPA 2 — Botão na tela de resultado

Em `Step5Recommendation.tsx`, quando `recommendation_action === 'READY_TO_MARKET'`, exibir botão primário **"Gerar Autorização de Captação"**. Se faltar algum dado obrigatório do proprietário, abre modal de complemento antes de prosseguir para o drawer.

## ETAPA 3 — Migration `autorizacoes_captacao` + `autorizacoes_captacao_eventos`

**Tabela principal** (colunas conforme prompt) com adições:
- `numero, complemento` (do imóvel — fidelidade do endereço)
- `data_vencimento` (calculada na assinatura: `data_assinatura + prazo_dias`)
- `motivo_recusa text`
- `data_recusa timestamptz`
- Trigger: bloqueia UPDATE de campos contratuais quando `status IN ('assinada','recusada')` (permite só colunas de auditoria).
- `codigo` gerado por trigger BEFORE INSERT: `'AUT-' || upper(substr(md5(gen_random_uuid()::text),1,6))`.
- `token_acesso` gerado no momento do "Enviar para Assinatura" (nunca exposto antes).

**Tabela de eventos `autorizacoes_captacao_eventos`**:
- `autorizacao_id, tipo` (`criada|enviada|reenviada|visualizada|assinada|recusada|pdf_gerado`), `ip`, `user_agent`, `metadata jsonb`, `created_at`.

**RLS**:
- `SELECT/INSERT/UPDATE/DELETE` autenticado: `organization_id = get_user_org_id(auth.uid())`.
- Policy pública SELECT por token: `token_acesso IS NOT NULL AND token_acesso = current_setting('request.jwt.claims', true)::jsonb->>'token'` — na prática a leitura pública será via **edge function** `get-autorizacao-publica` (mais seguro que policy aberta), que valida o token e retorna apenas os campos necessários.

**Storage**: bucket privado `autorizacoes-captacao`. PDF acessado via signed URL (válida por 7 dias).

## ETAPA 4 — Drawer de geração

Componente `GerarAutorizacaoDrawer.tsx` com 4 seções:
1. Dados pré-preenchidos da avaliação (todos editáveis).
2. **Valor de Avaliação** + **Valor de Venda Autorizado** (ambos `CurrencyInput`, obrigatórios > 0). Nota explicativa abaixo.
3. Tipo de Gestão (toggle), Prazo (30/60/90/120 — default 90), % Honorários (default 5).
4. **Preview HTML em tempo real** do documento (mesmo HTML usado pelo PDF, garantindo paridade WYSIWYG).

Footer: "Salvar Rascunho" e "Enviar para Assinatura" (com validação de obrigatórios).

## ETAPA 5 — Envio (edge function `enviar-autorizacao`)

1. Gera `token_acesso` (`gen_random_uuid()`), atualiza `status='enviada'`, `data_envio`.
2. Insere evento `enviada`.
3. **E-mail (Resend)** ao proprietário: assunto + link `https://analytics.godoyprime.com.br/autorizacao/{token}` + dados do corretor.
4. **WhatsApp (Z-API)** se houver telefone (E.164), com mensagem padronizada e log em `whatsapp_message_logs`.
5. **Reenvio gera novo token** (invalida o anterior) — botão na listagem.

## ETAPA 6 — Rota pública `/autorizacao/:token`

Página `AutorizacaoPublica.tsx` (sem login):
1. Edge function `get-autorizacao-publica` retorna dados pelo token e registra evento `visualizada` (com IP via `x-forwarded-for` e user-agent). Atualiza `data_visualizacao` e `status='visualizada'` se primeira vez.
2. Renderiza documento mobile-friendly (mesmo HTML do preview).
3. **Checkbox LGPD obrigatório** ("Concordo com o tratamento dos meus dados conforme política de privacidade").
4. Canvas (`react-signature-canvas`) + campo "Digite seu nome completo".
5. Botão **"Assinar e Confirmar"** → edge function `assinar-autorizacao`:
   - Valida token, nome digitado bate com `proprietario_nome` (normalizado), checkbox LGPD aceito.
   - Salva `assinatura_proprietario`, `ip_assinatura_proprietario`, `data_assinatura_proprietario`, `data_vencimento`, `status='assinada'`.
   - Gera PDF com **jsPDF manual render** (logo Godoy Prime + QR Code apontando para URL pública de verificação).
   - Faz upload no bucket privado, salva `pdf_url` (path).
   - Envia e-mail ao corretor: "Documento assinado por [nome]".
   - Insere eventos `assinada` e `pdf_gerado`.
6. Botão secundário **"Recusar"** → modal com motivo opcional → status `recusada`, evento registrado, e-mail ao corretor.
7. Tela final de confirmação.

## ETAPA 7 — Gestão interna `/autorizacoes-captacao`

- Listagem em tabela: Código, Proprietário, Endereço, Valor Avaliação, Valor Venda, Status (badge colorido), Criação, Vencimento, Ações (Ver, Reenviar, Baixar PDF, Copiar Link).
- Filtros: status, período (criação), busca por proprietário/endereço.
- Modal de detalhes com timeline de eventos da auditoria.
- Item "Autorizações" no `AppSidebar.tsx`, dentro do grupo onde está "Histórico de Avaliações".

## Detalhes técnicos

- **Logo + QR Code no PDF**: copiar `parsed-documents://...page_1_image_1_v2.jpg` e `page_2_image_3_v2.jpg` para `src/assets/`. QR aponta para `/autorizacao/verificar/{codigo}` (rota pública read-only de verificação de autenticidade).
- **PDF**: `jsPDF` manual (regra do projeto — sem `html2canvas`). Cláusula 1 com checkbox visual marcado (☒/☐).
- **Validações**: CPF com dígitos verificadores (`utils/cpfValidator.ts` — criar se não existir).
- **CORS**: edge functions com `verify_jwt = false` para `get-autorizacao-publica` e `assinar-autorizacao`.
- **Rate limit**: edge function `assinar-autorizacao` limita 3 tentativas/min por token.
- **i18n**: tudo em pt-BR.
- **Design tokens**: usar Navy/Gold do projeto; sem cores hardcoded fora do PDF.

## Arquivos a criar/editar (resumo)

**Novos:**
- `supabase/migrations/<ts>_autorizacoes_captacao.sql`
- `supabase/functions/enviar-autorizacao/index.ts`
- `supabase/functions/get-autorizacao-publica/index.ts`
- `supabase/functions/assinar-autorizacao/index.ts`
- `src/components/autorizacoes/GerarAutorizacaoDrawer.tsx`
- `src/components/autorizacoes/AutorizacaoDocumentoPreview.tsx`
- `src/utils/autorizacaoPdfExport.ts`
- `src/utils/cpfValidator.ts`
- `src/hooks/useAutorizacoes.ts`
- `src/pages/AutorizacoesCaptacao.tsx`
- `src/pages/AutorizacaoPublica.tsx`

**Editados:**
- `src/components/valuation/Step0Identification.tsx` (campos proprietário)
- `src/components/valuation/Step5Recommendation.tsx` (botão gerar)
- `src/components/AppSidebar.tsx` (item "Autorizações")
- `src/App.tsx` (rotas `/autorizacoes-captacao`, `/autorizacao/:token`, `/autorizacao/verificar/:codigo`)
