

## Diagnóstico

O gráfico mostra transações (6 em 2024, 4 em 2025, 2 em 2026) mas **preço R$/m² aparece como "-"** (zero). O motivo:

Os valores de `valor_m2` das ruas internas do condomínio Santa Mônica Residências são **R$ 5.546 a R$ 6.270/m²**. O filtro de outliers mínimos para Barra da Tijuca está configurado em **R$ 8.000/m²** (linha 77 do hook). Todos os valores legítimos do condomínio são descartados como "outliers".

```
// Dados reais do condomínio:
RUA NELSON RODRIGUES      → R$ 5.640/m²  (< 8.000 → DESCARTADO)
RUA NELSON RODRIGUES      → R$ 5.546/m²  (< 8.000 → DESCARTADO)
RUA JOAO GERALDO KUHLMANN → R$ 6.270/m²  (< 8.000 → DESCARTADO)
```

O limite mínimo de R$ 8.000 foi definido para o bairro como um todo (onde a maioria dos imóveis está acima desse valor), mas condomínios como Santa Mônica têm valores legitimamente mais baixos.

## Correção

### Arquivo: `src/hooks/useHistoricalTransactionAnalysis.ts`

Quando a busca é por **ruas internas de condomínio** (`ruasInternas`), usar um limite mínimo de outlier **reduzido** (ex.: 50% do limite do bairro, mínimo R$ 3.000). A lógica é que dados já filtrados por ruas específicas de um condomínio são inerentemente mais confiáveis e não devem ser descartados pelo filtro genérico do bairro.

Alteração na linha ~124-125 (após definir `outlierMinLimit`):

```typescript
// Para condomínios, aceitar valores mais baixos (dados já são filtrados por ruas específicas)
const effectiveMinLimit = (ruasInternas && ruasInternas.length > 0) 
  ? Math.min(outlierMinLimit * 0.5, 3000)
  : outlierMinLimit;
```

E na linha ~257, usar `effectiveMinLimit` em vez de `outlierMinLimit`:

```typescript
if (typeof v === 'number' && v >= effectiveMinLimit && v <= outlierLimit) {
```

### Resultado esperado
- Valores de R$ 5.546–6.270/m² passarão no filtro (> R$ 3.000)
- Gráfico e tabela mostrarão preço/m² para 2024, 2025 e 2026
- Variação de preço ano a ano será calculada corretamente

