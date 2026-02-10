

## Compactar a Ficha de Visita em 1 Pagina com Melhor Formatacao

### Objetivo
Reescrever o PDF (`fichaVisitaPdfExport.ts`) para que todo o conteudo caiba em uma unica pagina A4, com logo ajustada no cabecalho e melhor organizacao visual.

---

### O que muda para voce

- O PDF gerado tera **exatamente 1 pagina**, terminando nas assinaturas digitais
- Logo posicionada corretamente no cabecalho (sem corte ou desalinhamento)
- Textos juridicos mais compactos visualmente, sem perder conteudo
- Espacamentos reduzidos entre secoes para aproveitamento maximo da pagina
- Assinaturas sempre na parte inferior da mesma pagina

---

### Secao Tecnica

**Arquivo modificado:** `src/utils/fichaVisitaPdfExport.ts`

**Ajustes para caber em 1 pagina:**

| Elemento | Atual | Novo |
|---|---|---|
| Margem lateral | 15mm | 12mm (mais area util) |
| Cabecalho (header height) | 30mm | 24mm |
| Logo | 22x22px, posicao fixa | 18x18px, alinhada a esquerda com padding |
| Titulo do cabecalho | 13pt | 11pt |
| Subtitulo "BARRA DA TIJUCA" | 9pt, linha separada | 7.5pt, mesma linha do registro |
| Section headers (barras douradas) | 7mm altura + 10mm gap | 5.5mm altura + 7mm gap |
| Campos de dados (font) | 8.5pt | 7.5pt |
| Espacamento entre campos | 6mm | 4.5mm |
| Textos juridicos (secoes 3-6) | 7.5pt com 4mm line-height | 6.5pt com 3mm line-height |
| Gap apos texto juridico | 4mm | 2mm |
| Assinaturas (caixas) | 75x22mm | 70x18mm |
| Remover page breaks condicionais | 3 `if (y > pageHeight)` checks | Nenhum (tudo em 1 pagina) |

**Reorganizacao do cabecalho:**
- Barra navy mais fina (24mm)
- Logo a esquerda (12mm x margin, 3mm y, 18x18)
- Titulo centralizado 11pt
- Subtitulo + Nro registro + Data numa unica linha compacta 7pt

**Intermediacao:**
- Reduzir altura da caixa de 14mm para 10mm
- Font 6.5pt em vez de 7pt

**Secoes juridicas (3, 4, 5, 6):**
- Reduzir font para 6.5pt
- Usar line multiplier de 3mm em vez de 4mm
- Gaps entre secoes de 2mm em vez de 4mm

**Assinaturas:**
- Caixas menores (70x18mm)
- Texto 7pt
- Sem `drawSectionHeader` para a secao 7 (apenas uma linha fina separadora para economizar espaco)

**Sequencia:**
1. Ajustar constantes de margem e espacamento
2. Compactar cabecalho com logo menor
3. Reduzir fontes e gaps em todas as secoes
4. Remover todos os page-break checks
5. Compactar assinaturas no rodape da pagina

