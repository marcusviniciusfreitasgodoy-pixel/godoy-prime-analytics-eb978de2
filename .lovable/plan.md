

# PDF One-Pager Profissional - Godoy Prime Analytics

## Objetivo

Criar uma funcao `exportProductOnePagerPDF()` que gera um PDF de pagina unica (A4) com layout premium, contendo as 4 secoes estrategicas do produto: Mercado, Dor, Solucao e Diferenciais. Destinado a apresentacoes para investidores e clientes potenciais.

---

## Layout do PDF (1 pagina A4 - 210x297mm)

```text
+--------------------------------------------+
|          GODOY PRIME ANALYTICS             |
|     Inteligencia Imobiliaria Premium       |
|          ---- linha dourada ----           |
+--------------------------------------------+
|                                            |
| MERCADO                     | NUMEROS     |
| Nicho, decisor, tamanho     | 80.000+     |
| do mercado                  | transacoes  |
|                             | R$ 3-30M    |
|                             | por imovel  |
+--------------------------------------------+
| A DOR                                     |
| Problema + custo + consequencia            |
| (icone de alerta + texto compacto)         |
+--------------------------------------------+
| A SOLUCAO                                  |
| 4 modulos principais em 2x2 grid          |
| Motor Avaliacao | Vistoria Digital         |
| CRM + Visitas   | Sofia IA                |
+--------------------------------------------+
| DIFERENCIAIS                               |
| 4 bullets com icones dourados              |
| Dados oficiais | Metodologia propria       |
| Resultado em 5min | Multi-tenant           |
+--------------------------------------------+
| PLANOS                                     |
| Starter R$197 | Pro R$497 | Enterprise R$997|
+--------------------------------------------+
|  Tel | CRECI | www.godoyprime.com.br       |
+--------------------------------------------+
```

---

## Arquivo Novo

### `src/utils/productOnePagerPdfExport.ts`

Funcao principal: `export async function exportProductOnePagerPDF(): Promise<void>`

Utiliza os helpers existentes do `pdfTemplate.ts`:
- `BRAND_COLORS` para cores navy/gold/white
- `fetchCompanyInfoForPDF()` para dados da empresa
- `drawGodoyFooter()` para rodape padrao

Conteudo estatico baseado nos dados reais do produto ja documentados nas memorias do projeto.

**Secoes do PDF:**

1. **Cabecalho** - Nome da empresa + tagline "Inteligencia Imobiliaria Premium" + linha dourada
2. **Mercado** - Box navy com stats: 80.000+ transacoes ITBI, mercado de R$ 3-30M por imovel, nicho de alto padrao Barra da Tijuca, decisor = corretor/imobiliaria com faturamento R$ 10-100K+/mes
3. **A Dor** - Box com fundo claro: assimetria de informacao, custo de R$ 100-300K por transacao, risco de sobrepreco baseado em anuncios inflados
4. **A Solucao** - Grid 2x2 com os 4 pilares: Motor de Avaliacao (3 cenarios, 26 fatores), Vistoria Digital (55+ itens), CRM + Gestao de Visitas, Sofia IA (assistente contextual)
5. **Diferenciais** - 4 bullets: dados oficiais ITBI (nao anuncios), metodologia propria NBR 14653-2, resultado em 5 minutos, arquitetura multi-tenant com RLS
6. **Planos** - Faixa com os 3 planos (Starter/Pro/Enterprise) e precos
7. **Rodape** - Contato + CRECI + site

### Integracao na UI

Adicionar botao de export na pagina `/apresentacao` (`src/pages/Apresentacao.tsx`) com icone `FileDown` e texto "Baixar One-Pager PDF".

---

## Detalhes Tecnicos

- Usa `jsPDF` (ja instalado) com orientacao portrait A4
- Margens laterais de 15mm para maximizar espaco
- Tipografia compacta: titulos 11pt bold, corpo 7.5-8pt
- Boxes com `roundedRect` e cores da marca
- Nenhuma dependencia nova necessaria
- Nenhuma mudanca no banco de dados
- 1 arquivo novo + 1 arquivo editado

