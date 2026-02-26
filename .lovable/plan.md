
# Incluir Mapeamento Completo de Funcionalidades na Pagina de Apresentacao

## Objetivo

Adicionar uma nova secao entre "Modulos" e "Diferenciais" na pagina `/apresentacao` com o mapeamento detalhado de todas as funcionalidades, mostrando para cada uma: a dor que resolve, o beneficio entregue e a persona destinataria.

## Alteracoes no arquivo `src/pages/Apresentacao.tsx`

### 1. Atualizar o array `features` existente (linhas 27-34)

Transformar de formato simples (`desc`) para formato enriquecido com campos `dor`, `beneficio` e `para`:

| Funcionalidade | Dor | Beneficio | Para |
|---|---|---|---|
| Dashboard Analitico | Decisoes baseadas em "achismo", sem visao consolidada do mercado | 4 KPIs em tempo real (R$/m2, Liquidez, Variacao YoY, Ranking) com historico de 60 meses | Corretor, Gerente |
| Motor de Avaliacao | Precificacao por feeling, laudos caros e demorados | Laudo NBR 14653-2 em 5 min com 3 cenarios (pessimista/provavel/otimista) | Corretor |
| Vistoria Digital 3.1 | Vistorias sem padrao, disputas juridicas, relatorios manuais | Score 0-100 automatico, checklist 50+ itens, PDF profissional | Corretor |
| Gestao de Visitas | Agendamento por WhatsApp, fichas em papel, sem controle | Fichas digitais, assinatura eletronica, feedback automatizado, relatorio analitico | Corretor, Gerente |
| Microregioes | Sem dados de tendencia por sub-regiao, analise superficial | Ranking e evolucao por microbairro com mapa interativo de transacoes | Corretor, Gerente |
| CRM e Pipeline | Leads perdidos em WhatsApp, sem follow-up, conversao invisivel | Kanban 8 estagios, captacao automatica, notificacoes email/WhatsApp, conversao rastreavel | Corretor, Gerente |
| Sofia IA | Horas pesquisando dados dispersos em fontes diferentes | Resposta contextual instantanea com dados ITBI, analise de documentos | Corretor |
| Estrategia de Precificacao | Sem metodo para definir preco de lancamento vs. mercado | Diagnostico 9 perguntas, 3 faixas de preco, recomendacao estrategica | Corretor |
| Propostas Digitais | Propostas informais, sem rastreabilidade, aceite verbal | Modelos simplificado/completo, aceite eletronico, historico completo | Corretor |
| Parecer Godoy Prime | Comprador sem validacao independente, risco de pagar acima do mercado | Analise ITBI + vistoria presencial + projecao de valorizacao + margem de negociacao | Comprador Premium |

### 2. Criar nova secao "Funcionalidades e Dores"

Inserir entre a secao "Modulos" (linha 163) e "Diferenciais" (linha 165) uma nova secao completa com:

- Badge "Funcionalidades x Dores"
- Titulo: "Cada funcionalidade resolve uma dor real"
- Subtitulo explicativo
- Grid responsivo (1 coluna mobile, 2 colunas tablet, 3 colunas desktop)
- Cada card mostrando:
  - Icone + titulo (como hoje)
  - Tag colorida vermelha: "Dor:" com texto
  - Tag colorida verde: "Beneficio:" com texto
  - Badge dourado: "Para:" com a persona

### 3. Adicionar secao "Para Quem"

Nova secao horizontal apos o mapeamento com 4 personas:

- **Corretor de Luxo**: Avaliacao + Visitas + CRM + Sofia IA
- **Gerente / Imobiliaria**: Dashboard + Controle operacional + Pipeline
- **Administrador**: Calibradores + Gestao de usuarios + Configuracoes
- **Comprador Premium**: Parecer independente + Transparencia de mercado

### 4. Novos icones necessarios

Adicionar ao import de lucide-react: `Users`, `Settings`, `Search`, `FileSignature`, `Lightbulb`, `UserCheck`

## Detalhes tecnicos

### Estrutura de dados dos cards enriquecidos

```text
Array functionalityMap com objetos contendo:
  - icon: LucideIcon
  - title: string
  - dor: string (1-2 linhas)
  - beneficio: string (1-2 linhas)
  - para: string (persona)
```

### Layout dos cards

Cada card tera:
- Fundo branco com borda sutil e hover shadow
- Icone no topo com fundo accent/20
- Titulo em bold
- Bloco "Dor" com fundo red-50, borda-l-2 red-400, texto red-700
- Bloco "Beneficio" com fundo green-50, borda-l-2 green-400, texto green-700
- Badge inferior dourado com a persona

### Layout das personas

4 cards em grid horizontal (1 col mobile, 2 col tablet, 4 col desktop):
- Icone circular
- Nome da persona em bold
- Lista de modulos associados como badges

## Ordem das secoes na pagina final

1. Hero (sem alteracao)
2. Modulos - manter a secao atual simplificada como visao geral rapida
3. **NOVA - Funcionalidades x Dores** - mapeamento completo com 10 cards
4. **NOVA - Para Quem** - 4 personas
5. Diferenciais (sem alteracao)
6. Contato (sem alteracao)
7. CTA Final (sem alteracao)
8. Footer (sem alteracao)
