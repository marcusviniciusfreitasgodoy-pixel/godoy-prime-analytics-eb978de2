## Contexto importante (correção conceitual)

ATRAÇÃO **não é o valor mais barato** — é o **menor markup sobre o Valor Justo** (+4% por padrão), pensado para venda rápida. A relação correta é:

```
Valor Justo (R$ 3.735.095)  ──►  base de cálculo
   ATRAÇÃO  = base × 1,04   (~ +4%, venda rápida)
   MERCADO  = base × 1,08   (~ +8%, padrão)
   PREMIUM  = base × 1,12   (~ +12%, sem pressa)
```

No seu caso a base foi editada manualmente para ~R$ 4.386.565, então o ATRAÇÃO virou R$ 4.562.028 — bem acima do Valor Justo. É exatamente esse tipo de desvio que o aviso vai capturar.

---

## O que vou implementar

### 1. Pré-preencher e "ancorar" a base no Valor Justo
- Em `PricingStrategyModule`, quando `valorItbiInicial` (= `result.provavel`) chega do motor, ele já é a base padrão (já é hoje).
- Guardar o valor justo de referência num estado interno `valorJustoReferencia` para comparar contra qualquer edição.

### 2. Aviso visual quando o usuário desviar do Valor Justo
No `Card` "Valor da Avaliação" (logo abaixo do `CurrencyInput`), mostrar um alerta que aparece somente se `Math.abs(desvio%) > 5%`:

| Desvio | Cor | Ícone | Mensagem |
|--------|-----|-------|----------|
| ±5% a ±10% | âmbar | `AlertCircle` | "Base **X% acima/abaixo** do Valor Justo (R$ 3.735.095). Confirme se há justificativa." |
| > ±10% | vermelho | `AlertTriangle` | "Base **X% acima/abaixo** do Valor Justo. Pode comprometer a credibilidade da estratégia." |

Botão secundário **"Restaurar Valor Justo"** que reseta `valor_itbi` para `valorJustoReferencia` e dispara `calculateAllStrategies` novamente.

### 3. Esclarecer o significado de ATRAÇÃO no card
No `PostSelectionDetails` / `StrategyCards`, ajustar o subtítulo do ATRAÇÃO de "Markup +4%" para algo mais claro:
> "Venda rápida — Valor Justo + 4%"

E adicionar uma linha curta abaixo do preço:
> "Valor Justo: R$ 3.735.095 · Margem aplicada: +4%"

Assim o corretor entende que ATRAÇÃO é "o mais próximo do justo" (não "abaixo do justo").

---

## Arquivos afetados

- `src/components/pricing/PricingStrategyModule.tsx` — adicionar `valorJustoReferencia`, alerta e botão "Restaurar".
- `src/components/pricing/PostSelectionDetails.tsx` — subtítulo + linha de referência ao Valor Justo.
- `src/components/pricing/StrategyCards.tsx` — subtítulo do card ATRAÇÃO (e opcionalmente dos outros).

Sem alterações em backend, banco ou tipos. Sem mudança nas fórmulas (apenas UI/UX).

---

## Confirmação

Quer que eu use os limiares **±5% (atenção) e ±10% (crítico)**, ou prefere outros valores (ex.: ±3% / ±7%)?
