

# Excluir secao de Planos do PDF One-Pager

## O que muda

Remover toda a secao "PLANOS" do arquivo `src/utils/productOnePagerPdfExport.ts` — o bloco navy com os 3 planos (Starter, Professional, Enterprise).

## Detalhe tecnico

**Arquivo: `src/utils/productOnePagerPdfExport.ts`**

Remover o trecho que desenha:
- O retangulo navy com titulo "PLANOS"
- Os 3 cards de planos (Starter R$197, Professional R$497, Enterprise R$997)
- Toda a logica de posicionamento dos planos

Isso corresponde ao bloco que comeca com `// -- PLANOS --` ate o final do array `plans.forEach(...)`.

O footer continuara sendo desenhado normalmente apos a secao de Diferenciais. Nenhuma outra secao e afetada.

