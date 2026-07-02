
## Objetivo

1. Preencher o campo **3 - Diagnóstico da Região** com um texto gerado por um agente LLM, considerando um raio de aproximadamente 1 km do endereço do imóvel (localização, transporte, comércio, gastronomia, arte e cultura, educação, saúde, lazer e perfil do entorno).
2. Fazer o prefill dos campos **Estado de Conservação, Padrão de Acabamento, Vista, Posição Solar, Reformas e Benfeitorias, Estratégia de Negociação (faixa/alvo/piso, argumentos e alavancagem) e Conclusão** a partir da avaliação importada, mantendo os campos editáveis pelo perito.

Escopo restrito ao módulo Parecer Técnico. Sem mudanças de schema, RLS, sidebar, PDF ou lista de termos proibidos.

Regra de estilo obrigatória em todos os textos gerados (IA e prefill): **não usar travessão** (nem `—` nem `–` nem duplo hífen). Substituir por ponto, vírgula, dois-pontos ou parênteses conforme o contexto. Também vale para a concatenação de endereço, que hoje usa `—` no `prefillFromAvaliacao.ts` e passa a usar vírgula.

## Parte 1, Diagnóstico da Região por IA

### Backend

Nova Edge Function `supabase/functions/parecer-diagnostico-regiao/index.ts`:

- Recebe `{ endereco, bairro, cidade?, avaliacao_id? }`.
- Usa Lovable AI Gateway com `google/gemini-3-flash-preview` e system prompt em pt-BR de perito imobiliário, instruindo:
  - raio aproximado de 1 km do endereço informado;
  - cobrir localização e acessos, transporte público e vias arteriais, comércio e serviços, gastronomia, arte e cultura, educação, saúde, lazer e áreas verdes, perfil do entorno;
  - tom técnico e descritivo, sem promessas de valorização, sem termos da lista `FORBIDDEN_PHRASES` (laudo, valorização garantida, ITBI, cartório etc.);
  - **proibido o uso de travessão em qualquer forma**;
  - 4 a 6 parágrafos, cerca de 1500 a 2200 caracteres;
  - fechar com ressalva de que a descrição do entorno é qualitativa e não substitui vistoria de campo.
- Retorna `{ texto }` puro. Antes de responder, faz uma limpeza de segurança substituindo qualquer `—`, `–` ou ` -- ` remanescente por `, `.
- CORS padrão, `verify_jwt = true`.

### Frontend

- Em `ParecerForm.tsx`, seção "3. Diagnóstico da Região", adicionar botão **"Gerar com IA"** ao lado do textarea:
  - Habilitado apenas quando `endereco_imovel` e `bairro` estão preenchidos.
  - Chama a edge function via `supabase.functions.invoke`, mostra spinner e preenche `diagnostico_regiao`. Se o campo já tiver conteúdo, pedir confirmação antes de sobrescrever.
  - Erros exibidos via `toast` (rate limit 429, créditos 402, falha genérica).
- Textarea segue editável, com a validação `findForbidden` já existente.

### Exemplo de saída para Avenida Lúcio Costa, 3650, Barra da Tijuca, Rio de Janeiro

> A Avenida Lúcio Costa, 3650, situa-se no trecho central da orla da Barra da Tijuca, na Zona Oeste do Rio de Janeiro, em frente à Praia da Barra. O endereço integra o corredor beira-mar que concentra parte relevante do estoque residencial de alto padrão do bairro, com predominância de edificações verticais frente-mar e uso residencial multifamiliar.
>
> Quanto à acessibilidade, o entorno é servido pela própria Avenida Lúcio Costa (Avenida Sernambetiba) e, a menos de 1 km, pela Avenida das Américas, principal eixo estruturante da Barra, e pela Avenida Armando Lombardi. O transporte público inclui linhas de ônibus municipais e intermunicipais, além do BRT TransOeste, com estações no entorno próximo, permitindo conexão à malha metroviária pela estação Jardim Oceânico (linha 4 do metrô).
>
> No raio aproximado de 1 km, o comércio e os serviços incluem shoppings de médio porte e polos comerciais lineares ao longo da Avenida das Américas, com supermercados, farmácias, agências bancárias, academias e clínicas. A oferta gastronômica é diversificada, combinando quiosques da orla, restaurantes de praia e casas reconhecidas da cena carioca. O uso balneário é intensivo, com ciclovia contínua, calçadão e pontos de esportes ao ar livre.
>
> Em educação, o raio contempla escolas de ensino básico e médio de rede particular reconhecida na Zona Oeste, além de unidades de idiomas e cursos livres. Em saúde, há clínicas de especialidades e prontos-atendimentos privados próximos, com hospitais gerais de referência acessíveis pela Avenida das Américas. Para arte e cultura, o eixo Barra concentra centros culturais, cinemas em shoppings e espaços de eventos, sendo que equipamentos culturais mais robustos da cidade ficam fora do raio de 1 km e exigem deslocamento por vias arteriais.
>
> O perfil socioeconômico do entorno imediato é de renda média-alta a alta, com forte presença de moradia de veraneio e de segunda residência, o que se reflete na qualidade dos condomínios, na oferta de serviços de conveniência e na dinâmica de ocupação sazonal ao longo do ano.
>
> A presente descrição do entorno tem caráter qualitativo e informativo, destinando-se a contextualizar o imóvel de referência. Não substitui vistoria de campo nem análise específica de segurança pública, mobilidade em horários de pico ou impactos de intervenções urbanas em curso.

## Parte 2, Prefill dos demais campos

Todas as alterações em `src/lib/parecer/prefillFromAvaliacao.ts`. Sem novas queries, reaproveita o registro `valuations` já carregado (`recommendation_details`, `pricing_strategy`, características e valores). Todos os campos permanecem editáveis. Textos gerados no prefill não usam travessão.

Mapeamento proposto (fallback para string vazia quando não houver dado):

| Campo do parecer | Origem em `valuations` |
|---|---|
| `estado_conservacao` | `estado_conservacao` ou `recommendation_details.estado_conservacao` / `vistoria.estado_conservacao` |
| `padrao_acabamento` | `padrao_acabamento` ou `recommendation_details.padrao_acabamento`, com fallback textual a partir de `padrao_construtivo` |
| `vista` | `vista` ou `recommendation_details.vista` (ex.: "Mar", "Lagoa", "Interna") |
| `posicao_solar` | `posicao_solar` ou `recommendation_details.posicao_solar` |
| `reformas` | `reformas` ou `recommendation_details.reformas_benfeitorias`, concatenado em texto corrido quando vier em lista, separado por ponto e vírgula |
| `faixa_abertura` | `pricing_strategy.faixa_abertura` ou `final_value_max` formatado em BRL |
| `valor_alvo` | `pricing_strategy.valor_alvo` ou `final_value_med` formatado em BRL |
| `piso_negociacao` | `pricing_strategy.piso` ou `final_value_min` formatado em BRL |
| `argumentos` | `pricing_strategy.argumentos` (array), ou lista curta derivada de dados disponíveis (valor por m² vs. média do logradouro, presença de vaga/suíte, vista, estado de conservação) |
| `alavancagem` | `pricing_strategy.alavancagem_comprador` |
| `conclusao` | Texto modelo montado a partir de tipologia, endereço, área, `final_value_med` (BRL), `combined_med_m2` (BRL/m²), intervalo mínimo e máximo e `confidence_level`. Exemplo: "Com base na metodologia comparativa aplicada e na amostra de transações reais e ofertas ativas saneadas, estima-se o valor de mercado do imóvel em R$ X, correspondente a R$ Y por metro quadrado, em intervalo de R$ A a R$ B, com grau de confiança alta." Sem termos da lista proibida e sem travessão. |

Ajustes complementares no mesmo arquivo:

- Substituir o `—` usado hoje na composição do `endereco_imovel` por vírgula, para respeitar a regra de não usar travessão.
- Regras de merge no `handleImport` (`ParecerTecnicoEditor`) permanecem: prefill só preenche campos vazios, preservando o que o perito já digitou.

## Detalhes técnicos

- Modelo: `google/gemini-3-flash-preview` (default da plataforma), texto simples, sem `Output.object`.
- Secret: `LOVABLE_API_KEY` já provisionado, nenhum secret novo.
- Sem alterações em `src/integrations/supabase/*`, `types.ts`, PDF, RLS, sidebar ou banco.
- Sem chamadas de geocoding, o LLM recebe apenas endereço e bairro; o raio de 1 km é instrução textual.
- Sem persistência automática do texto gerado, o salvamento segue o fluxo existente.

## Arquivos afetados

- `supabase/functions/parecer-diagnostico-regiao/index.ts` (novo)
- `src/components/parecer/ParecerForm.tsx` (botão "Gerar com IA" na seção 3)
- `src/lib/parecer/prefillFromAvaliacao.ts` (novos campos de vistoria, negociação e conclusão, remoção de travessão no endereço)
