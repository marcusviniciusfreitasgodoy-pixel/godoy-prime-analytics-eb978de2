# ITBI por escritura (SMF): carga e consolidação

Desde 2026-10-21 a fonte de ITBI do app é a planilha da Secretaria Municipal de Fazenda, uma linha por escritura, no lugar da camada 8 do ArcGIS (agregado por rua e mês que omite ruas com uma só transação no ano e entrega entre 55% e 65% das escrituras da cidade).

| Peça | Onde |
|---|---|
| Tabela crua `itbi_escrituras`, coluna `itbi_transactions.fonte`, view `itbi_transactions_smf` e função `itbi_consolidar_smf()` | `supabase/migrations/20261021120000_itbi_escrituras_smf.sql` |
| Carregador mensal | `scripts/itbi-smf/carregar_itbi_smf.py` |
| Nomes de rua na grafia da camada 8, por código `cl` | `scripts/itbi-smf/data/cl_nomes_arcgis.json` |
| Agendamento | `.github/workflows/itbi-smf-mensal.yml` |
| Guarda que impede a camada 8 de sobrescrever meses da SMF | `supabase/functions/_shared/itbiFonte.ts`, usada por `sync-itbi-prefeitura` e `sync-itbi-daily` |

## Como funciona

1. O carregador raspa a página da SMF, baixa os xlsx `ITBI_TRANSACOES_*`, lê as escrituras, classifica tipologia e uso com as regras do app, aplica `LIMITES_INGESTAO` e geocodifica pelo Número de porta da Prefeitura (gratuito, com cache).
2. Grava em `itbi_escrituras` por upsert (chave = hash da linha; rodar de novo não duplica).
3. Chama `itbi_consolidar_smf(inicio, fim[, bairro])`, que apaga as linhas de `itbi_transactions` do período e insere o agregado das escrituras na mesma chave natural (rua, bairro, mês, uso, tipologia), com `total_transacoes` = contagem, `fonte = 'smf'`, preservando `microbairro`, `lat`, `lng` e `geom` das linhas antigas por rua e usando o centroide das escrituras onde não havia coordenada. No fim atualiza `itbi_price_index`.
4. Registra em `etl_log` com `fonte = 'smf'`.

O motor, as RPCs de raio, os hooks e a view materializada continuam lendo `itbi_transactions` sem nenhuma mudança: só passam a ver o mercado inteiro. A regra de ponderar por `total_transacoes` continua valendo.

## Primeira carga (roteiro)

1. Aplicar a migration pelo chat da Lovable (ela só cria coisas novas e uma coluna com default).
2. Rodar o workflow `ITBI SMF mensal` à mão com `bairro = BARRA DA TIJUCA` e `dry_run = true`; baixar o CSV do artifact e olhar.
3. Rodar de novo sem dry-run, ainda só a Barra. Conferir no chat da Lovable:

```sql
select extract(year from data_transacao) ano, fonte, sum(total_transacoes) escrituras
from public.itbi_transactions where bairro = 'BARRA DA TIJUCA' and uso = 'Residencial'
group by 1, 2 order by 1, 2;
-- Lúcio Costa residencial 2025: ~448 esperadas (a camada 8 tinha ~302)
```

4. Abrir o painel da Barra no app e conferir ranking de microbairros, evolução e uma avaliação.
5. Rodar o workflow sem bairro (cidade inteira, cerca de 330 mil escrituras, uns 10 minutos). Depois disso `sync-itbi-daily` passa a encerrar sozinho com `skipped: true`, e o botão de sincronização da camada 8 devolve 409 para períodos já consolidados.
6. Rodar `classify-microbairros` para as ruas novas (as antigas mantêm o microbairro) e, se quiser, `geocodificar-itbi-transactions` para as linhas sem `geom`.

## Rodar local

```sh
cd scripts/itbi-smf
pip install openpyxl
python3 -I carregar_itbi_smf.py --bairro "BARRA DA TIJUCA" --desde 2019 --dry-run
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python3 -I carregar_itbi_smf.py --bairro "BARRA DA TIJUCA" --desde 2019
```

## Decisões embutidas

- **Só transferências de 100%**: as planilhas da SMF não têm outra coisa (conferido em 327.528 linhas). `percentual_transferido` entra como 100; os filtros `>= 90` do app seguem valendo.
- **Chave por `cl`** para agrupar escrituras da mesma rua; o nome gravado em `itbi_transactions.logradouro` segue a grafia da camada 8 (`data/cl_nomes_arcgis.json`, 5.149 ruas), para não quebrar `condominios_mapeamento`, `logradouroSearch` e as linhas que já existem. Ruas fora desse mapa usam o nome da SMF 2025+ ou o nome antigo normalizado (maiúsculas, sem acento, tipo de via abreviado).
- **Tipologia** segue `classificarTipologia` mais a classe `Outro` (vaga, galpão, clube, hotel, colégio, hospital, unidade hoteleira, "especial"), que fica fora de `itbi_transactions`. APART-HOTEL vira Apartamento, como antes.
- **Uso**: Residencial, Comercial, Territorial e Outro em `itbi_escrituras`; só Residencial e Comercial entram em `itbi_transactions` (o enum `uso_imovel` não tem outros valores).
- **Data** `ano-mes-15`, como sempre.
- **Linhas idênticas** na SMF (cerca de 1.200 na cidade) entram como escrituras distintas, com sufixo de ocorrência no hash.
- **Rejeitadas** pelos limites ficam em `itbi_escrituras` com `aceita = false` e `motivo_rejeicao`, fora da consolidação.

## LGPD

`itbi_escrituras` identifica imóvel e valor pago. Fica atrás de RLS (só admin lê). Nenhuma tela do app deve exibir escritura individual; toda saída pública é agregada, com piso de 5 escrituras por grupo.
