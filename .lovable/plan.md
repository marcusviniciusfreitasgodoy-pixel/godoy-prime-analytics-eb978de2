

## Corrigir Logo e Remover Texto Indesejado do Cabecalho do PDF

### O que muda

- A linha "BARRA DA TIJUCA / RJ | No TESTE-001 | ..." sera **removida** do cabecalho
- O cabecalho ficara apenas com: logo a esquerda + titulo "FICHA DE VISITA / TERMO DE APRESENTACAO DE IMOVEL" centralizado
- A data da visita e numero do registro serao movidos para a caixa de intermediacao (ja existente logo abaixo)
- O logo branco (`godoy-logo-white.png`) sera reposicionado com dimensoes corretas para nao ficar cortado

### Secao Tecnica

**Arquivo:** `src/utils/fichaVisitaPdfExport.ts`

**Mudanca 1 — Remover linha 108** (texto "BARRA DA TIJUCA / RJ | No ...")

Remover completamente estas 4 linhas:
```
doc.setTextColor(...COLORS.white);
doc.setFontSize(7);
doc.setFont("helvetica", "normal");
doc.text(`BARRA DA TIJUCA / RJ  |  Nº ${ficha.codigo}  |  ${dataVisita}  |  Rio de Janeiro/RJ`, ...);
```

**Mudanca 2 — Reduzir cabecalho e centralizar titulo verticalmente**

Com a remoção da segunda linha de texto, o cabecalho pode ser mais compacto (22mm em vez de 26mm). O titulo sera centralizado verticalmente na barra navy.

**Mudanca 3 — Ajustar logo**

Reposicionar o logo para ficar centrado verticalmente dentro do cabecalho:
- Posicao: `x = M`, `y = 3`, largura `16`, altura `16` (proporção 1:1, centrado em 22mm de altura)

**Mudanca 4 — Mover No e Data para a caixa de Intermediacao**

Adicionar o numero do registro e data/hora na caixa cinza de intermediacao que ja existe logo abaixo do cabecalho, junto com os dados da imobiliaria e corretor. Ficara:
```
Imobiliaria: GODOY PRIME | CNPJ: ... | Registro: TESTE-001 | Data: 10/02/2026 as 14:00
Corretor(a): ... | CRECI: ... | Contato: ...
```

