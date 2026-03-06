
Objetivo: corrigir o fluxo completo de condomínio fechado, já que você confirmou falha em todos os pontos (sem sugestões de condomínio, sem ITBI no Passo 1 e sem análise histórica no Passo 4).

Diagnóstico confirmado
1) Busca de condomínio está sensível a acento (ex.: “Santa Monica” não encontra “Santa Mônica”).
2) Passo 4 não usa ruas internas do condomínio (hook é chamado só com logradouro+bairro).
3) Reprocessamento incompleto: ao mudar condomínio, o ITBI pode não recalcular por já existir `itbiData`.
4) UX sem estado de erro/empty-state (“não aparece nada” fica sem explicação).

Plano de implementação

1. Corrigir busca do CondominioSelector (accent-insensitive + mais robusta)
- Arquivo: `src/components/valuation/CondominioSelector.tsx`
- Manter query no backend, mas adicionar filtro final em memória com normalização de acentos:
  - comparar `nome_condominio`, `logradouro_padrao` e `ruas_internas` normalizados.
- Melhorar ordenação por relevância (match no início > contém > mais transações).
- Exibir estado “Nenhum condomínio encontrado” no dropdown para não parecer vazio quebrado.

2. Garantir seleção inteligente de condomínio no Passo 0
- Arquivo: `src/components/valuation/Step0Identification.tsx`
- Ao selecionar logradouro que traga `nome_condominio`, tentar resolver automaticamente `condominioSelecionado` (não só preencher texto).
- Ao alterar condomínio (selecionar/limpar), limpar `itbiData` para forçar recálculo no Passo 1 com as ruas internas corretas.

3. Forçar recálculo correto do ITBI no Passo 1
- Arquivo: `src/components/valuation/Step1Location.tsx`
- Ajustar `autoFetchITBI` para não bloquear quando `condominioSelecionado` mudar e já existir `itbiData`.
- Recalcular com `.or()` das `ruas_internas` sempre que houver condomínio selecionado.
- Adicionar alerta de “sem dados encontrados para os filtros atuais” com orientação de ação (logradouro/condomínio).

4. Corrigir análise histórica no Passo 4 (principal lacuna atual)
- Arquivo: `src/components/valuation/Step4Results.tsx`
- Passar `state.condominioSelecionado?.ruas_internas` para `useHistoricalTransactionAnalysis`.
- Assim o gráfico histórico deixa de usar só a rua única e passa a considerar todas as ruas internas (incluindo cenário com 2026).

5. Corrigir cache da análise histórica para contexto de condomínio
- Arquivos:
  - `src/hooks/useHistoricalTransactionAnalysis.ts`
  - `src/utils/historicalAnalysisCache.ts`
- Incluir `ruasInternas` (ou hash delas) na chave do cache.
- Evitar reaproveitar cache de “logradouro simples” em consultas de “condomínio expandido”.
- Resultado: elimina casos onde a tela mostra vazio por cache incompatível.

Validação pós-implementação (E2E)
1) Passo 0: digitar “Santa Monica” (sem acento) deve listar “Santa Mônica Residências”.
2) Selecionar condomínio deve mostrar resumo com quantidade de ruas internas.
3) Passo 1 deve preencher faixa ITBI usando conjunto das ruas internas.
4) Passo 4 deve exibir gráfico/resumo histórico (sem ficar em branco) com dados do contexto do condomínio.
5) Repetir teste trocando condomínio/logradouro para garantir recálculo e cache correto.
