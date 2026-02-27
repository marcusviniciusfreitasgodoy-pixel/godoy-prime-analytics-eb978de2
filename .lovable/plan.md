

## Ajustes no Resumo Executivo (Preview HTML + PDF)

Duas alterações principais em dois arquivos: o preview HTML (`OnePagerPreview.tsx`) e a exportação PDF (`productOnePagerPdfExport.ts`).

---

### 1. Remover "Parecer Godoy Prime" das Funcionalidades Detalhadas

Será removido de ambos os arquivos (preview e PDF).

### 2. Adicionar 5 novas Funcionalidades Detalhadas

Serão adicionadas ao array `detailedModules` em ambos os arquivos, no padrão Dor/Entrega:

| Funcionalidade | Dor | Entrega |
|---|---|---|
| **Pesquisa de Mercado** | Sem acesso a dados reais de transações por localização e tipologia | Pesquisa por logradouro, bairro e microbairro com dados ITBI oficiais e filtros por tipologia |
| **Agendamento de Visitas** | Cliente depende do corretor para agendar, processo lento por WhatsApp | Agendamento automático pelo cliente com disponibilidade online e confirmação instantânea |
| **Análise de Documentação IA** | Revisão manual de documentos consome horas e gera erros | Upload de imagem/PDF com análise automática por IA, extração de campos e alertas |
| **Documentação Comprador e Vendedor** | Sem controle dos documentos necessários, esquecimentos geram atrasos | Lista de verificação completa para comprador e vendedor com progresso rastreável |
| **Gestão de Contatos e CRM** | Contatos dispersos em WhatsApp, sem funil estruturado | Quadro de 8 estágios, captura de contatos, acompanhamento e notificações automáticas |

### 3. Arquivos alterados

- **`src/components/apresentacao/OnePagerPreview.tsx`** -- atualizar array `detailedModules` (remover Parecer, adicionar 5 novos). Total passará de 6 para 10 cards, o grid 2 colunas se ajusta automaticamente.
- **`src/utils/productOnePagerPdfExport.ts`** -- mesma alteração no array `detailedModules` da Page 2 do PDF, com ajuste no `cellH` para acomodar 10 itens (5 linhas x 2 colunas).

### Detalhes Técnicos

- O grid `grid-cols-2` do preview HTML acomoda automaticamente os 10 cards.
- No PDF, o `cellH` será reduzido de 40 para ~32mm para que 5 linhas caibam na página A4.
- O conteúdo das dores do mercado (Página 1) permanece inalterado, pois já foi atualizado nas iterações anteriores.

