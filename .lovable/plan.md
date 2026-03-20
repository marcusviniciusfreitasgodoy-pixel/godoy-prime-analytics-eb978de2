
Objetivo: corrigir o cadastro do condomínio Santa Mônica Residências para que ele use somente o conjunto de ruas informado por você e impedir que o enriquecimento automático volte a inflar esse array no futuro.

1. Corrigir o dado na base
- Atualizar o registro de `Santa Mônica Residências` em `condominios_mapeamento`.
- Substituir completamente `ruas_internas` pelo conjunto abaixo, desconsiderando todas as demais entradas atuais:
  - Rua João Geraldo Kuhlman
  - Rua Pedro Ludovico
  - Rua Nelson Rodrigues
  - Rua Josué de Castro
  - Rua Sebastião Afonso Ferreira
  - Avenida Jean Paul Sartre
  - Avenida Hildebrando de Araujo Goes
  - Rua Desenhista Luiz Guimaraes

2. Preservar o cadastro correto
- Ajustar a rotina de enriquecimento em `supabase/functions/enrich-condominios/index.ts` para não sobrescrever manualmente esse condomínio com ruas “próximas” capturadas por raio geográfico.
- Implementar uma proteção específica para condomínios com lista validada manualmente, priorizando o valor já salvo na base em vez de recalcular `ruas_internas`.

3. Blindar contra ruído estrutural
- Incluir saneamento na geração de `ruas_internas` para evitar novos casos semelhantes:
  - remover duplicatas e variantes só por caixa/acentuação
  - ignorar entradas técnicas (`PAA`, `PAL`, etc.)
  - excluir vias públicas amplas e ruas externas indevidas
- Isso reduz o risco de outros condomínios herdarem logradouros errados.

4. Impacto esperado
- O seletor de condomínio, a Pesquisa de Mercado e a expansão de busca por logradouros passarão a considerar apenas essas 8 ruas.
- A contagem exibida deixará de mostrar 18 ruas internas.
- Os filtros e resultados derivados do condomínio ficarão alinhados com a configuração correta.

5. Arquivos/áreas envolvidos
- Base de dados: atualização do registro em `condominios_mapeamento`
- Backend de enriquecimento: `supabase/functions/enrich-condominios/index.ts`
- Frontend não deve precisar de ajuste, porque já consome `ruas_internas` diretamente da base

6. Validação
- Consultar novamente o registro após a correção
- Conferir que o seletor mostra 8 ruas internas
- Validar a Pesquisa de Mercado usando esse condomínio
- Confirmar que uma nova execução do enriquecimento não reintroduz as 18 ruas antigas
