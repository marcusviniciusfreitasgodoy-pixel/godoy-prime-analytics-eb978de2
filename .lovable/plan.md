# Apresentação de Funcionalidades — PDF + Markdown

Gerar dois artefatos entregáveis em `/mnt/documents/` com o mapa completo de funcionalidades da Godoy Prime Analytics, sem alterar o código do app.

## Entregáveis

1. `godoy-prime-funcionalidades.md` — versão Markdown (para edição/colagem).
2. `godoy-prime-funcionalidades.pdf` — versão PDF executiva (paleta Navy #0C2340 / Gold #D4AF37, tipografia limpa, ~4-6 páginas).

## Estrutura do conteúdo (idêntica nos dois formatos)

Cabeçalho com nome da plataforma, subtítulo ("Painel Analítico Imobiliário para Corretores e Imobiliárias") e data.

**Seções:**

1. **Visão Geral** — 3-4 linhas sobre proposta de valor (dados ITBI reais + IA + operação completa de visitas/avaliações).
2. **Inteligência de Mercado**
   - Painel Analítico (KPIs 60 meses, R$/m², Liquidez, YoY, Classificação)
   - Microrregiões (8 microbairros da Barra, evolução e ranking)
   - Pesquisa de Mercado (ITBI + IPTU, valor venal vs preço real)
   - Inteligência Territorial (mapa de 1.567 condomínios, ficha por logradouro)
3. **Avaliação e Precificação**
   - Motor de Avaliação (laudo 5 min, 3 cenários, PDF completo/simplificado)
   - Estratégia de Precificação (diagnóstico 9 perguntas, 3 faixas)
   - Calibradores de Avaliação (ajuste de 30+ variáveis)
4. **Operação de Visitas**
   - Agendamento de Visitas (disponibilidade do corretor)
   - Gestão de Visitas (fichas digitais, assinatura eletrônica)
   - Vistoria Digital (checklist 50+ itens, score 0-100)
   - Feedback Analítico de Visitas (dashboard, ranking, PDF)
   - Propostas Digitais (aceite eletrônico)
5. **CRM e Captação**
   - Pipeline CRM (Kanban 8 estágios, métricas)
   - Avaliação Pública (captação passiva de compradores)
   - Autorizações de Captação (geração + assinatura pública)
6. **IA e Documentação**
   - Sofia IA (resposta contextual com dados ITBI)
   - Análise de Documentos IA (Gemini 2.5 Pro + RAG)
   - Documentação Comprador/Vendedor (checklist dinâmico)
   - Base de Conhecimento (Sofia KB jurídico)
7. **Personalização e Administração**
   - Formulários Personalizáveis (ficha de visita, feedback)
   - Branding/White-Label (logo, nome em PDFs)
   - Calibradores de Vistoria
   - Gestão de Usuários e Papéis (admin/gerente/corretor)
   - WhatsApp Z-API + Logs de Mensagens
   - Onboarding e Tour Guiado

Cada item segue o padrão **Funcionalidade → Entrega objetiva** (1 linha de benefício mensurável, no estilo do `FunctionalityMapSection`).

8. **Rodapé** — domínio `analytics.godoyprime.com.br` e contato.

## Detalhes técnicos

- Fonte de verdade: `src/components/apresentacao/FunctionalityMapSection.tsx` (já mapeia 21 funcionalidades com dor/benefício) + rotas em `src/App.tsx` para garantir cobertura completa.
- PDF gerado via `reportlab` (Python) com Platypus, cabeçalho colorido Navy, divisores Gold, sem ícones bitmap (apenas tipografia + caixas coloridas).
- QA obrigatório: `pdftoppm` → inspeção página a página antes de entregar.
- Saída final apresentada com tags `<presentation-artifact>` para download imediato.

Nenhum arquivo do projeto será modificado.