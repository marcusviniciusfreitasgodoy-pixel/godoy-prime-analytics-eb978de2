# Atualizar One-Pager PDF e a apresentaçao com Mapeamento Funcionalidades x Dores x Beneficios

## Objetivo

Reescrever o PDF One-Pager para incluir o mapeamento completo de funcionalidades, dores que resolvem e beneficios entregues, conforme a analise apresentada. O PDF passara de 1 para 2 paginas para acomodar o conteudo enriquecido.

## Estrutura do PDF (2 paginas)

### Pagina 1 (manter layout atual com ajustes)

1. **HEADER** - Sem alteracoes
2. **O MERCADO** - Sem alteracoes
3. **A DOR DO MERCADO** - Enriquecer com as 4 dores mapeadas:
  - Assimetria de informacao (precificacao baseada em anuncios inflados)
  - Custo do erro (R$ 100K-300K por transacao mal precificada)
  - Operacao manual (fichas em papel, controle por WhatsApp)
  - Falta de inteligencia de mercado (sem dados de tendencia por microbairro)
4. **A SOLUCAO - MODULOS** - Atualizar os 4 cards com formato "Dor -> Beneficio":
  - **Motor de Avaliacao**: Dor: precificacao por "achismo" | Beneficio: laudo NBR 14653-2 em 5 min com 3 cenarios
  - **Vistoria Digital 3.1**: Dor: vistorias sem padrao, disputas juridicas | Beneficio: score 0-100 automatico, PDF profissional
  - **CRM + Pipeline**: Dor: leads perdidos em WhatsApp, sem follow-up | Beneficio: Kanban 8 estagios, conversao rastreavel
  - **Sofia IA**: Dor: horas pesquisando dados dispersos | Beneficio: resposta contextual instantanea com dados ITBI
5. **DIFERENCIAIS** - Sem alteracoes
6. **METRICAS DE TRACAO** - Sem alteracoes

### Pagina 2 (nova)

7. **FUNCIONALIDADES DETALHADAS** - Grid com 6 modulos adicionais em formato compacto (titulo + dor + beneficio + persona):
  - Dashboard Analytics (4 KPIs, graficos 60 meses)
  - Microbairros (ranking e evolucao por sub-regiao)
  - Gestao de Visitas (agendamento, fichas digitais, assinatura)
  - Propostas Digitais (modelos simplificado/completo, aceite eletrônico)
  - Estrategia de Precificacao (diagnostico 9 perguntas, 3 faixas)
  - Parecer Godoy Prime (validacao independente para compradores)
8. **PARA QUEM** - Barra horizontal com 4 personas:
  - Corretor de Luxo: avaliacao + visitas + CRM
  - Gerente/Imobiliaria: dashboard + controle operacional
  - Administrador: calibradores + gestao de usuarios
  - Comprador Premium: parecer independente + transparencia
9. **FOOTER** - Mesmo padrao

## Detalhes tecnicos

**Arquivo: `src/utils/productOnePagerPdfExport.ts**`

1. Atualizar array `modules` (linha 169) com novo formato incluindo campo `dor` e `beneficio` ao inves de `lines` generico
2. Atualizar array `dorLines` (linha 142) com as 4 dores principais mapeadas
3. Apos a secao de metricas (linha 278), adicionar `doc.addPage()` para pagina 2
4. Na pagina 2, desenhar grid 3x2 com os 6 modulos adicionais usando layout compacto (cada card ~38mm altura)
5. Desenhar secao "PARA QUEM" com 4 colunas de personas
6. Aplicar footer na pagina 2 com `drawGodoyFooter`
7. Ajustar `doc.save()` para o final apos pagina 2

## Formatacao dos cards de modulo (pagina 1)

Cada card tera:

- Titulo em navy bold (8.5pt)
- Linha "Dor:" em vermelho escuro (7pt) - 1 linha
- Linha "Beneficio:" em verde escuro (7pt) - 1 linha  
- Aumentar `cellH` de 28 para 32mm para acomodar

## Formatacao dos cards detalhados (pagina 2)

Cada card tera:

- Titulo em navy bold (8pt)
- "Dor:" em vermelho escuro italic (6.5pt)
- "Entrega:" em verde escuro (6.5pt)  
- "Para:" badge com persona em gold (6pt)
- Fundo cinza claro com borda gold sutil