
## Objetivo

Adicionar à seção "Amostra e Comparativos" do Parecer Técnico um bloco de **Amostra de Anúncios Analisados**, com o mesmo formato usado no módulo de Avaliação (Step 1 Location): pares Valor + Área + Fonte/Link por anúncio, cálculo automático de mín/méd/máx por m² e alertas de qualidade da amostra. Os dados vêm da avaliação importada (`valuations.anuncio_fontes`) quando disponíveis, e podem ser editados/adicionados manualmente pelo perito. Aparecem também no preview/PDF.

Escopo restrito ao módulo Parecer Técnico. Sem alterar o módulo de Avaliação.

## Persistência

Migration em `pareceres_tecnicos` adicionando:

- `anuncios jsonb NOT NULL DEFAULT '[]'::jsonb` — array de `{ valor: number, area: number, fonte: string }`.

Sem GRANT novos (a tabela já tem RLS e grants).

## Tipos

Em `src/lib/parecer/types.ts`:

- Novo `AnuncioParecer = { valor: number; area: number; fonte: string }`.
- Novo campo `anuncios: AnuncioParecer[]` em `ParecerTecnico`, default `[]` em `defaultParecer()`.

## Prefill

Em `src/lib/parecer/prefillFromAvaliacao.ts`:

- Mapear `v.anuncio_fontes` (formato `{ valor, area, fonte? }`) para `anuncios` do parecer, coagindo tipos numéricos.
- Manter a lógica atual dos `comparativos` intacta (comparativos e anúncios são coisas distintas: comparativos são transações reais / ofertas saneadas, anúncios são a amostra bruta de ofertas ativas).

## Formulário

Em `src/components/parecer/ParecerForm.tsx`, dentro do `AccordionItem value="amostra"`, adicionar bloco **"Amostra de anúncios analisados"** abaixo dos comparativos, com o mesmo layout do `Step1Location`:

- Lista de anúncios com, por linha:
  - Título "Anúncio N" + valor calculado em `R$ /m²` (badge) + botão remover.
  - Grid 2 colunas: `Valor` (CurrencyInput) e `Área (m²)` (Input numérico).
  - `Fonte/Link` (Input url) com ícone `ExternalLink`.
- Botão "Adicionar anúncio".
- Painel resumo (aparece quando há pelo menos 1 anúncio válido): Mín, Méd, Máx por m² calculados a partir dos itens preenchidos.
- Alertas de amostra: menos de 3 anúncios (info), variação grande vs. valor de mercado do parecer (opcional, versão simplificada, sem depender de dados de ITBI).

Usar `CurrencyInput` já existente no projeto (usado no `Step1Location`), sem `<input type="number">` para valores em Real. Área continua como Input numérico simples, como no formulário original.

## Preview

Em `src/components/parecer/ParecerPreview.tsx`, na seção 5 (Amostra), acrescentar após a tabela de comparativos uma tabela **"Amostra de anúncios analisados"** com colunas Anúncio, Valor, Área, Valor/m², Fonte. Renderiza apenas se `anuncios.length > 0`. Mesmos estilos das tabelas existentes para manter o padrão do PDF impresso.

## Editor

Nenhuma mudança em `ParecerTecnicoEditor` além da que o auto-save já cobre. A lista de anúncios já é persistida pelo save existente porque será apenas mais um campo do objeto `parecer`.

## Detalhes técnicos

- `useParecerTecnico.save()`: adicionar `anuncios` ao payload (jsonb) para inserção/update. Nenhuma coerção adicional além de manter o array.
- Sem alteração no `ParecerPreview` para PDF externo (jsPDF) — o preview é a fonte da impressão via CSS `parecer-print.css`, então adicionar a tabela lá basta.
- Sem chamadas de IA.
- Sem alterações em: sidebar, roteamento, RLS, edge functions, avaliação.

## Arquivos afetados

- migration nova em `supabase/migrations/*` (add coluna `anuncios` em `pareceres_tecnicos`).
- `src/lib/parecer/types.ts`
- `src/lib/parecer/prefillFromAvaliacao.ts`
- `src/hooks/useParecerTecnico.ts` (garantir `anuncios` no payload)
- `src/components/parecer/ParecerForm.tsx`
- `src/components/parecer/ParecerPreview.tsx`
