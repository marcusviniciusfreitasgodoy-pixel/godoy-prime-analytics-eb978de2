# ITBI por escritura (SMF): carga e consolidação

Desde 2026-10-21 a fonte de ITBI do app é a planilha da Secretaria Municipal de Fazenda, uma linha por escritura, no lugar da camada 8 do ArcGIS (agregado por rua e mês que omite ruas com uma só transação no ano e entrega entre 55% e 65% das escrituras da cidade).

Página da SMF: https://fazenda.prefeitura.rio/itbi-valores-medios-por-m2-de-transacoes-imobiliarias-por-trecho-de-logradouro (os nomes dos arquivos mudam a cada republicação; em 2026-10-21 o recente passou de `ITBI_TRANSACOES_2025_diante-6.xlsx` para `-7-1.xlsx`).

| Peça | Onde |
|---|---|
| Tabela `itbi_escrituras`, coluna `itbi_transactions.fonte`, view `itbi_transactions_smf`, função `itbi_consolidar_smf()` | `supabase/migrations/20261021120000_itbi_escrituras_smf.sql` (+ `20261021130000_itbi_smf_sem_terreno.sql`) |
| Leitura da planilha, normalização, validação e geocodificação (TS, roda em Deno e no navegador) | `supabase/functions/_shared/itbiSmf.ts`, nomes em `_shared/itbiSmfNomes.ts` |
| Edge function de carga | `supabase/functions/ingest-itbi-smf/index.ts` |
| **Painel de carga (caminho oficial)** | `/admin`, cartão "ITBI por escritura (SMF)": `src/components/admin/CargaItbiSmf.tsx` |
| Guarda que impede a camada 8 de sobrescrever meses da SMF | `supabase/functions/_shared/itbiFonte.ts` |
| Carregador Python (dry-run e conferência local) | `scripts/itbi-smf/carregar_itbi_smf.py` |
| Nomes de rua e bairro na grafia da camada 8 | `data/cl_nomes_arcgis.json` → `python3 -I scripts/itbi-smf/gerar_nomes_ts.py` gera `itbiSmfNomes.ts` |

## Por que o painel roda no navegador

Edge functions têm ~2 s de CPU e 256 MB de memória por chamada. Medido em 2026-10-21 (Mac M-series, Deno):

| Trabalho | CPU |
|---|---|
| Só descompactar a planilha 2019-2024 (180 MB de XML) | 0,6 s |
| Ler e filtrar a Barra na planilha 2019-2024 | 1,6 s |
| Ler, filtrar, normalizar e geocodificar a Barra na planilha recente, lendo da SMF | 0,9 s |

Servidores de função costumam ser 2 a 3 vezes mais lentos. Então:

- **Painel do admin (oficial)**: o navegador descompacta e lê as planilhas (sem teto); a função só entrega os bytes da SMF (`acao: faixa`, o site da SMF não libera CORS) e grava (`acao: gravar`, com o login do admin). Geocodificação direto no ArcGIS da Prefeitura, que libera CORS.
- **`acao: processar` na função**: faz tudo no servidor, para até 10 bairros por chamada no arquivo recente. Serve para bairros pequenos e testes; a Barra fica perto do teto de CPU.

Nada é aberto para a chave pública: a função exige admin logado ou o cabeçalho `x-cron-secret` (mesmo `CRON_SECRET` de `sync-itbi-daily`).

## Como funciona a consolidação

`itbi_consolidar_smf(inicio, fim[, bairro])` apaga as linhas de `itbi_transactions` do período (e do bairro) e insere o agregado das escrituras na mesma chave natural (rua, bairro, mês, uso, tipologia), com `total_transacoes` = contagem e `fonte = 'smf'`. Preserva `microbairro`, `lat`, `lng` e `geom` das linhas antigas por rua, usa o centroide das escrituras onde não havia coordenada e atualiza `itbi_price_index`. Só entram Apartamento, Casa e Comercial com uso Residencial ou Comercial (terrenos e "Outro" ficam só em `itbi_escrituras`).

O motor, as RPCs de raio, os hooks e a view materializada continuam lendo `itbi_transactions`: só passam a ver o mercado inteiro. A regra de ponderar por `total_transacoes` continua valendo.

## Roteiro da primeira carga

1. Migrations aplicadas (feito em 2026-10-21, com backup em `itbi_transactions_backup_pre_smf`).
2. Em `/admin`, cartão "ITBI por escritura (SMF)": abrangência **Barra da Tijuca**, a partir de **2019**, **Só simular** marcado. Conferir o resumo no registro.
3. Desmarcar "Só simular" e rodar. Conferir:

```sql
select extract(year from data_transacao) ano, fonte, sum(total_transacoes) escrituras
from public.itbi_transactions where bairro = 'BARRA DA TIJUCA' and uso = 'Residencial'
group by 1, 2 order by 1, 2;
-- Lúcio Costa residencial 2025: 448 esperadas (a camada 8 tinha 302)
```

4. Abrir o painel da Barra no app e conferir ranking de microbairros, evolução e uma avaliação.
5. Abrangência **Cidade inteira**, sem simular. Leva de 15 a 30 minutos no navegador (cerca de 330 mil escrituras, geocodificação de ~9.500 ruas).
6. Depois: `classify-microbairros` para ruas novas (as antigas mantêm o microbairro) e, se quiser, `geocodificar-itbi-transactions` para linhas sem `geom`.

## Atualização mensal

A SMF republica sem data fixa. Uma vez por mês, no painel: **Cidade inteira**, a partir do **ano corrente**. Só o arquivo recente é lido e os meses do ano são substituídos. `sync-itbi-daily`, que puxa a camada 8, encerra sozinho com `skipped: true` nos meses já cobertos pela SMF e só preenche meses que a SMF ainda não publicou.

## Rodar o carregador Python (local, só conferência)

```sh
cd scripts/itbi-smf
pip install openpyxl
python3 -I carregar_itbi_smf.py --bairro "BARRA DA TIJUCA" --desde 2019 --dry-run
```

Os ids gerados pelo Python seguem outro formato: não gravar com ele em produção, para não duplicar escrituras.

## Decisões embutidas

- **Só transferências de 100%**: as planilhas não têm outra coisa (conferido em 327.528 linhas).
- **Nomes**: `logradouro` segue a grafia da camada 8 por código `cl`; `bairro` segue o nome da camada 8 por `CD_BAIRRO` (mesmo código; 150 de 158 iguais, 5 só com grafia diferente, 3 sem par: Rocinha, Ilha de Guaratiba e o código 0, que ficam com o nome da SMF).
- **Tipologia**: `classificarTipologia` do app mais a classe `Outro`. APART-HOTEL vira Apartamento.
- **Id**: SHA-1 de ano, mês, cl, trecho, número, complemento, tipologia, valor e área (com 2 casas), mais a ocorrência. Linhas idênticas recebem ids diferentes; recarregar não duplica.
- **Geocodificação**: `exata` (número existe no Número de porta), `aproximada (nº X)` (porta mais próxima na mesma rua, até 300 números), `aproximada (centro da rua)` e `sem`.

## LGPD

`itbi_escrituras` identifica imóvel e valor pago. Fica atrás de RLS (só admin lê). Nenhuma tela do app deve exibir escritura individual; toda saída pública é agregada, com piso de 5 escrituras por grupo.
