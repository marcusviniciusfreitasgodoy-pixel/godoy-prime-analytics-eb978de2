

## Sincronizar PDF com Preview HTML

O arquivo `src/utils/productOnePagerPdfExport.ts` precisa ser atualizado em 3 pontos para ficar compativel com o preview HTML.

---

### 1. Atualizar seção "O Mercado" (linhas 79-84)

Alterar os bullet points do mercado:
- "Nicho: Imoveis de alto padrao -- Barra da Tijuca, RJ" para "Mercado Imobiliario da cidade do Rio de Janeiro na primeira fase."
- "Valor medio por imovel: R$ 3M a R$ 30M" para "Valor medio por imovel: > R$ 1M"

### 2. Atualizar seção "Dores do Mercado" (linhas 119-147)

Substituir as 4 dores antigas pelas 9 dores atuais:
1. Assimetria de informacao (texto expandido)
2. Custo do erro e demora na venda
3. Operacao manual
4. Dificuldades com CRM
5. Falta de inteligencia de mercado (texto expandido)
6. Falta de criterios/padronizacao para avaliacoes e vistorias
7. Dificuldades com documentacao de captacao/venda
8. Percepcao negativa do mercado
9. Dificuldades de captacao com exclusividade

Sera necessario aumentar `dorH` de 34 para ~58mm e ajustar o espacamento entre linhas para acomodar 9 itens.

### 3. Corrigir "Vistoria Digital 3.1" para "Vistoria Digital" (linha 165)

Remover o "3.1" do titulo do modulo na secao "A Solucao".

### Arquivo alterado

- **`src/utils/productOnePagerPdfExport.ts`** -- 3 pontos de edicao

### Impacto no layout

Com 9 dores ao inves de 4, a Pagina 1 do PDF ficara mais apertada. O `dorH` sera ajustado e o espacamento entre linhas reduzido de 5.2mm para ~4.5mm, mantendo legibilidade dentro da pagina A4.

