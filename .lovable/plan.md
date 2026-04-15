
## Diagnóstico

O erro acontece por dois motivos combinados:

1. **O nome vindo do ITBI está abreviado**
   - No mapa aparece `RUA DESEN LUIZ GUIMARAES`
   - Na base de condomínios / ruas internas a rua está como `Rua Desenhista Luiz Guimaraes`
   - A Edge Function `geo-logradouro` hoje faz o cruzamento com `condominios_mapeamento` por **match exato** (`toUpperCase()`), então esse caso **não casa**.

2. **O cache atual favorece coordenadas Google já salvas**
   - No `batch-geocode`, se existir um registro em `logradouros_geo` com `hierarquia = 'GOOGLE'`, ele é retornado antes de tentar corrigir pelo condomínio.
   - A migration anterior também **não sobrescreveu** linhas já marcadas como `GOOGLE`.
   - Resultado: mesmo depois da melhoria por condomínio, o ponto antigo e errado continua sendo usado.

## Evidência no código

- `supabase/functions/geo-logradouro/index.ts`
  - usa cache primeiro (`hierarquia = GOOGLE/CONDOMINIO` é considerado válido)
  - monta `condominioMap` com chaves literais de `logradouro_padrao` e `ruas_internas`
- `supabase/functions/enrich-condominios/index.ts`
  - já traz `Rua Desenhista Luiz Guimaraes` como rua interna manual de **Santa Monica Residências**
- O popup do print mostra `RUA DESEN LUIZ GUIMARAES`, confirmando o problema de abreviação.

## Correção proposta

### 1) Fazer normalização antes do match com condomínio
Atualizar `supabase/functions/geo-logradouro/index.ts` para:
- consultar também `logradouro_itbi_normalizado`
- aplicar normalização/aliases de logradouro antes do lookup
- considerar equivalência entre variantes abreviadas e nome completo

Exemplo do que precisa casar:
- `RUA DESEN LUIZ GUIMARAES`
- `RUA DESENHISTA LUIZ GUIMARAES`

A forma mais segura é usar a tabela `logradouros_normalizacao` como camada de alias antes do match com condomínio.

### 2) Dar prioridade ao condomínio sobre cache Google
No `batch-geocode`, a ordem deve virar:
1. normalizar nome do logradouro
2. tentar match com condomínio
3. se achar condomínio, **sobrescrever** qualquer cache anterior e retornar `source: 'condominio'`
4. só usar cache Google / Google novo quando não houver match com condomínio

Isso é essencial para ruas internas, porque a coordenada do condomínio é mais confiável que o geocode genérico.

### 3) Corrigir os registros já salvos no cache
Criar uma migration SQL para atualizar `logradouros_geo` quando houver correspondência com condomínio, **inclusive se hoje estiver como `GOOGLE`** para ruas internas/aliases conhecidos.

Isso deve corrigir imediatamente casos como:
- `RUA DESEN LUIZ GUIMARAES`

## Arquivos a ajustar

1. `supabase/functions/geo-logradouro/index.ts`
   - adicionar normalização/alias
   - inverter prioridade para condomínio antes do cache Google
   - atualizar cache com `hierarquia = 'CONDOMINIO'` quando houver match

2. `supabase/migrations/...sql`
   - inserir alias/manual mapping para casos abreviados necessários
   - atualizar `logradouros_geo` já existente para substituir coordenadas erradas

## Resultado esperado

Depois dessa correção:
- `Rua Desenhista Luiz Guimaraes` passará a cair no **Santa Monica Residências**, perto da Av. das Américas
- o mapa deixará de usar o ponto genérico perto da Av. Lúcio Costa / Barramares
- futuras ruas internas com abreviações do ITBI também terão muito menos erro

## Implementação objetiva

1. Revisar `geo-logradouro` para lookup normalizado + alias
2. Mudar precedência: condomínio > cache Google > Google novo > fallback
3. Criar migration para corrigir cache já salvo
4. Validar no mapa os casos:
   - Rua Desenhista Luiz Guimaraes
   - Rua Paulo Areal
   - outras ruas internas do Santa Monica Residências

## Detalhe técnico

A causa não é o mapa em si. O problema está na **resolução espacial do logradouro** antes do marcador ser desenhado:
- o hook `useTransactionMapData` apenas consome a resposta do `geo-logradouro/batch-geocode`
- portanto a correção correta é no backend de geocodificação + cache, não no componente visual do mapa
