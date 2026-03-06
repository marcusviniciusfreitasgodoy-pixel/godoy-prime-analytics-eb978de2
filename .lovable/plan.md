

## Diagnóstico

O banco retorna 6 registros para Santa Mônica:
- 5546, 5546, 5640, 5640, 5640, **6269.80**

Com 6 valores (≥4), o filtro IQR é ativado:
- Q1 = 5546, Q3 = 5640, IQR = 94
- Limite superior = 5640 + 1.5 × 94 = **5781**
- 6269.80 > 5781 → **descartado como outlier**

O IQR é muito agressivo para datasets pequenos com baixa variância — um valor perfeitamente legítimo (apenas 11% acima da mediana) é eliminado porque os outros 5 registros são muito próximos entre si.

## Correção

### Arquivo: `src/components/valuation/Step1Location.tsx`

Na função `filterOutliersIQR` (linha 215-236), adicionar uma **banda mínima de segurança** para evitar que o IQR seja artificialmente estreito em datasets pequenos. Se o IQR calculado representar menos de 15% da mediana, expandir os limites para ±20% da mediana:

```typescript
const filterOutliersIQR = (values: number[]): number[] => {
  if (values.length < 4) return values;
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  const median = sorted[Math.floor(n / 2)];
  
  // Banda mínima: se IQR < 15% da mediana, usar ±20% da mediana como limites
  const minBand = median * 0.20;
  const effectiveIQR = Math.max(iqr, minBand);
  
  const lowerBound = q1 - 1.5 * effectiveIQR;
  const upperBound = q3 + 1.5 * effectiveIQR;
  
  return sorted.filter(v => v >= lowerBound && v <= upperBound);
};
```

Com esta correção: `effectiveIQR = max(94, 5640×0.20=1128) = 1128`, limite superior = 5640 + 1692 = **7332** → 6269.80 passa no filtro ✅

### Resultado esperado
- Preço Mínimo: R$ 5.546/m²
- Preço Médio: R$ 5.640/m²
- Preço Máximo: **R$ 6.270/m²**

