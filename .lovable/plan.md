

# Melhorar Textos Interpretativos do Gráfico Evolução por Microbairro

## Problema
Os textos atuais são densos e pouco intuitivos para corretores. Exemplo atual:
*"Orla (R$ 18.200/m²) lidera com 42% acima de ABM (R$ 12.800/m²). Maior valorização no período: Jardim Oceânico (+35%)."*

## Proposta de Melhoria

### Métrica Valorização (R$/m²)
**Antes:** `"${highest.name} (${val}/m²) lidera com ${spread}% acima de ${lowest.name} (${val}/m²). Maior valorização no período: ${name} (+X%)."`

**Depois — 3 informações separadas e diretas:**
- **Linha 1:** `"Mais caro hoje: Orla a R$ 18.200/m². Mais acessível: ABM a R$ 12.800/m² (diferença de 42%)."`
- **Linha 2:** `"Quem mais valorizou desde 2020: Jardim Oceânico (+35%)."`

### Métrica Liquidez (Transações)
**Antes:** `"${leader} lidera com X transações acumuladas. ${name} teve o maior crescimento recente (+X%)."`

**Depois:**
- **Linha 1:** `"Maior volume de vendas: Orla com 892 transações desde 2020."`
- **Linha 2:** `"Crescimento mais rápido no último período: Eixo Américas (+18%)."`

## Mudança no Código

### `src/components/MicrobairroEvolutionChart.tsx`
- Reescrever `text1` e `text2` no `useMemo` (linhas 109-113 e 135-138) com linguagem mais direta e separação clara das informações
- Usar rótulos descritivos ("Mais caro hoje", "Quem mais valorizou", "Maior volume de vendas") em vez de linguagem genérica ("lidera com")

