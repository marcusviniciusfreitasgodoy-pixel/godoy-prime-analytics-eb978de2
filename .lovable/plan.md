## Minha análise do parecer

**O parecer está tecnicamente correto** ao apontar a inconsistência (gap de 19,5% sem anúncios recebidos). Essa contradição do motor foi corrigida em turnos anteriores — se ainda aparece no seu laudo, é porque o resultado exibido veio do cache antes da correção. Ao gerar um novo laudo, o gap sai como `N/A` e o score cai 10 pontos, como deveria.

**Por que os campos "—" aparecem em Valor Venal, Tipologia, Microbairro e Condomínio?**
Não é bug do painel — é limitação real do backend `/parecer-nucleo`:

1. **IPTU (`valor_venal` / `tipologia`)** — a query `iptu_logradouro_resumo` filtra por `logradouro_norm` **exato** e por `tipologia` (`Apartamento`), mas a tabela usa domínio próprio (`Residencial`, `Comercial`) e a normalização entre `itbi_transactions` e `iptu_logradouro_resumo` nem sempre bate. Resultado: zero linhas → o LLM devolve `null`.
2. **Territorial · condomínio** — só é buscado se `input.nome_condominio` for enviado. Quando o corretor faz a avaliação por endereço puro, o painel não passa condomínio e a função nem tenta inferir.
3. **Territorial · microbairro** — a heurística atual cruza `microbairros_geo.keywords` com o texto do logradouro; falha na maioria dos casos, apesar de o próprio ITBI já trazer `microbairro` nas linhas lidas.

## Correções propostas

### 1. `supabase/functions/parecer-nucleo/index.ts`
- **IPTU (fallback em cascata)**: tentar `logradouro_norm` + `tipologia`; se vazio, refazer sem `tipologia`; se ainda vazio, `ilike` sobre `logradouro`. Consolidar `valor_venal` (média ponderada de `valor_venal_medio` por `total_imoveis`) e `tipologia` predominante em campos rasos, além de manter `linhas`.
- **Territorial · condomínio**: quando `nome_condominio` não vier no input, buscar em `condominios_mapeamento` pelo `logradouro_norm` — casando com `logradouro_itbi_normalizado` **ou** com qualquer item do array `ruas_internas` — filtrando `ativo = true`. Expor `territorial.condominio.nome_condominio` na raiz.
- **Territorial · microbairro**: usar o microbairro mais frequente entre as linhas ITBI já carregadas (fonte confiável) como resposta primária; a busca por `microbairros_geo` fica só como enriquecimento. Expor `territorial.microbairro.nome` na raiz.

### 2. `supabase/functions/analista-imobiliario/index.ts` (system prompt)
Ajustar a instrução de preenchimento do `nucleo` para o LLM ler os campos corretos:
- `iptu.valor_venal` ← `iptu.valor_venal_agregado` (novo campo raso do parecer-nucleo).
- `iptu.tipologia` ← `iptu.tipologia_predominante`.
- `territorial.microbairro` ← `territorial.microbairro.nome`.
- `territorial.condominio` ← `territorial.condominio.nome_condominio`.
Manter a regra: se ausente, devolver `null` e listar em `lacunas`, nunca inferir.

### 3. `src/components/valuation/AnalistaImobiliarioPanel.tsx`
Nenhuma alteração de layout. Apenas manter o comportamento atual de exibir "—" quando o valor for `null` (já funciona). Nenhuma mudança de UI.

## Fora de escopo
- Não recalcular o motor.
- Não mudar a experiência visual do painel (mesmo cartão, mesmas cores, mesmos rótulos).
- Não tocar em RLS/permissões — as tabelas `iptu_logradouro_resumo`, `condominios_mapeamento`, `microbairros_geo` já são lidas hoje.

## Como validar
1. Gerar novo laudo em Rua Iposeira / Barra da Tijuca (endereço com condomínio conhecido e IPTU rico).
2. Rodar QA e verificar:
   - Bloco NÚCLEO mostra `Valor venal`, `Tipologia`, `Microbairro` e `Condomínio` preenchidos.
   - `lacunas` deixa de listar IPTU/Territorial quando o dado existe.
3. Testar caso sem condomínio (rua comercial) — campos continuam "—" e aparecem em `lacunas`, como esperado.
