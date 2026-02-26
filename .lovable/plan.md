

# Adicionar Secao de Metricas de Tracao ao PDF One-Pager

## Objetivo

Inserir uma secao "METRICAS DE TRACAO" entre "Diferenciais" e o footer, com dados reais consultados do banco de dados no momento da geracao do PDF.

## Dados reais disponíveis

Com base na consulta ao banco:
- **124.389** transacoes reais ITBI (soma de `total_transacoes`)
- **28.687** registros agregados na base
- **144** bairros mapeados
- **17** avaliacoes realizadas
- **6** vistorias digitais
- **20** usuarios cadastrados
- **1** organizacao ativa
- Historico de **Jan/2020 a Dez/2025** (quase 6 anos)

## Layout da secao

A secao tera um retangulo navy com 4 metricas em linha horizontal, cada uma com:
- Numero grande em dourado (valor real)
- Label descritivo em branco abaixo

Metricas exibidas:
1. **Total de transacoes ITBI** (soma real de `total_transacoes`)
2. **Bairros mapeados** (COUNT DISTINCT bairro)
3. **Avaliacoes realizadas** (COUNT valuations)
4. **Usuarios ativos** (COUNT profiles)

## Detalhes tecnicos

**Arquivo: `src/utils/productOnePagerPdfExport.ts`**

1. Importar o cliente Supabase: `import { supabase } from '@/integrations/supabase/client'`

2. Criar funcao auxiliar `fetchTractionMetrics()` que consulta o banco:
   - `SELECT SUM(total_transacoes) FROM itbi_transactions` para transacoes reais
   - `SELECT COUNT(DISTINCT bairro) FROM itbi_transactions` para bairros
   - `SELECT COUNT(*) FROM valuations` para avaliacoes (filtrado pela org do usuario)
   - `SELECT COUNT(*) FROM profiles` para usuarios (filtrado pela org)
   - Retorna objeto com os 4 valores, com fallbacks seguros caso a query falhe

3. Chamar `fetchTractionMetrics()` no inicio da funcao `exportProductOnePagerPDF`, junto com `fetchCompanyInfoForPDF`

4. Desenhar a secao apos "Diferenciais" (linha 213, onde `y += 28`):
   - Retangulo navy arredondado com largura total do conteudo
   - Titulo "METRICAS DE TRACAO" em dourado centralizado
   - 4 colunas equidistantes, cada uma com numero grande + label
   - Altura estimada: ~22mm

5. Footer permanece inalterado apos a nova secao

## Formatacao dos numeros

- Transacoes: formato com ponto de milhar (ex: "124.389")
- Bairros: numero simples (ex: "144")
- Avaliacoes: numero simples (ex: "17")
- Usuarios: numero simples (ex: "20")

Os dados serao sempre atualizados em tempo real a cada geracao do PDF, garantindo credibilidade conforme a diretriz do projeto.

