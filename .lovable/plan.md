

## Diagnóstico: Dois problemas distintos

### Problema 1: Limite de 1000 linhas do Supabase (Dados históricos)
A imagem mostra 5581 transações em 2021 e **zero** para 2022-2025. Confirmei no banco que Barra da Tijuca tem dados em todos os anos (2021: 1062 registros, 2022: 736, 2023: 832, 2024: 960, 2025: 886 = ~4476 total).

O Supabase retorna no **máximo 1000 linhas** por query por padrão. A query de fallback para bairro em `useHistoricalTransactionAnalysis.ts` (linha 221-228) não tem `.limit()` explícito, então retorna apenas as primeiras 1000 linhas ordenadas por `data_transacao ASC` — que são **todas de 2021** (1062 registros, truncados em 1000). Anos posteriores nunca chegam ao cliente.

Isso afeta tanto o fluxo com condomínio quanto sem condomínio.

### Problema 2: Seleção de condomínio (já corrigido mas precisa validar)
A correção `toAccentWildcard` foi aplicada e funciona no banco (confirmei: `nome_condominio ILIKE '%s_nt_ m_n_c_%'` retorna "Santa Mônica Residências"). Se o usuário ainda não vê resultados, pode ser um problema de build/deploy. Sem erros no console.

## Plano de correção

### Arquivo: `src/hooks/useHistoricalTransactionAnalysis.ts`

1. **Query de fallback para bairro (linha 221-228)**: Adicionar `.limit(5000)` para garantir que todos os registros dos 5 anos sejam retornados.

2. **Query de logradouro (linha 175-183)**: Adicionar `.limit(5000)` por segurança.

3. **Query de condomínio/ruas internas (linha 152-160)**: Adicionar `.limit(5000)` por segurança.

### Resultado esperado
- Gráfico histórico mostrará transações para todos os 5 anos (2021-2025)
- Dados de condomínio (quando selecionado via CondominioSelector) usarão as ruas internas corretamente

