
Objetivo: corrigir de forma estrutural a divergência entre as abas Localização e Transações para buscas por condomínio, garantindo consistência dos resultados, dos totais e da lógica de agrupamento.

1. Diagnóstico consolidado
- A divergência acontece porque a aba Transações hoje usa uma expansão mais fraca do condomínio:
  - recebe só `ruas_internas` do `CondominioSelector`
  - não inclui sempre o `logradouro_padrao`
  - não inclui um nome ITBI normalizado
  - não gera variações como `AVN`/`AV`/`AVENIDA`
- Já a aba Localização usa busca mais ampla/fuzzy, por isso encontra registros como `AVN HILDEBRANDO DE ARAUJO GOES`.
- No caso auditado, o condomínio “Santa Mônica Special” está mapeado com `Avenida Hildebrando de Araujo Goes`, enquanto o ITBI está salvo como `AVN HILDEBRANDO DE ARAUJO GOES`.

2. Correção proposta
- Criar uma lógica única de expansão de logradouros de condomínio para toda a aplicação:
  - `logradouro_padrao`
  - `ruas_internas`
  - `logradouro_itbi_normalizado` quando existir
  - versões sem acento
  - versões com abreviações comuns de tipo de via
- Fazer a aba Transações usar essa lista expandida, em vez de depender só de `ruas_internas`.
- Aplicar a mesma lógica também ao modo mapa da aba Transações, para que lista, gráfico e mapa respondam com a mesma base.
- Padronizar o cálculo dos resultados da aba Transações para usar ponderação por `total_transacoes` ao calcular preço médio/m², reforçando a consistência com o modelo agregado do ITBI.

3. Arquivos que devem entrar na implementação
- `src/components/valuation/CondominioSelector.tsx`
  - ampliar o payload do condomínio selecionado para incluir também `logradouro_itbi_normalizado` e uma lista pronta de logradouros de busca
- `src/types/valuation.ts`
  - evoluir o tipo `CondominioSelecionado`
- `src/hooks/useTransactionSearch.ts`
  - trocar o filtro atual por uma busca expandida e padronizada
  - corrigir média por logradouro para ser ponderada por `total_transacoes`
- `src/hooks/useTransactionMapData.ts`
  - aceitar filtro por logradouros expandidos do condomínio
- `src/pages/PesquisasMercado.tsx`
  - repassar a expansão correta para lista, gráfico e mapa
- Opcional, se eu quiser eliminar duplicação futura:
  - criar um helper compartilhado em `src/lib/...` para normalização/expansão de logradouros

4. Comportamento esperado após a correção
- Ao selecionar um condomínio, a aba Transações passará a encontrar o mesmo universo lógico da aba Localização.
- Se existir ITBI sob `AVN`, `AV`, `AVENIDA` ou grafias equivalentes, o sistema consolidará tudo no mesmo resultado de busca do condomínio.
- Exportações passarão a refletir a mesma base encontrada na tela.
- O mapa deixará de divergir da lista quando houver filtro por condomínio.

5. Critério de qualidade
- Se não houver dados reais, o sistema continuará mostrando zero ou “dados insuficientes”.
- Se houver dados com nomes equivalentes, eles devem aparecer de forma consistente em todas as visões.
- A lógica deve privilegiar precisão e consistência, não “forçar resultado”.

6. Validação que farei na implementação
- Buscar “Santa Mônica Special” em Transações com 24 meses e confirmar que aparecem os registros de Hildebrando.
- Comparar contagem e logradouros entre Localização e Transações para o mesmo condomínio.
- Validar lista, gráfico, mapa e exportação com o mesmo filtro.
- Testar outro condomínio com ruas internas e, se possível, um caso com abreviação diferente para garantir que a correção ficou geral, não pontual.

Detalhes técnicos
- Causa raiz identificada: a busca de Transações usa `logradouro.ilike.%<rua_interna>%`, mas a rua interna salva está em forma longa (“Avenida...”) e o ITBI usa forma abreviada (“AVN...”).
- O seletor de condomínio hoje retorna só:
  - `nome`
  - `ruas_internas`
  - `logradouro_padrao`
- A correção ideal é transformar o condomínio selecionado em um “pacote de busca” com múltiplas chaves equivalentes.
- Também recomendo consolidar a regra de média ponderada por `total_transacoes` na aba Transações, porque o banco ITBI é agregado e esse peso é essencial para coerência analítica.
