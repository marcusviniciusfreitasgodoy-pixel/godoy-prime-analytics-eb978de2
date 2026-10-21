# Nota de passagem 2026-10-21: ITBI por escritura (SMF)

## O que mudou

A fonte de ITBI deixa de ser a camada 8 do ArcGIS da Fazenda (agregado por rua, mês e tipologia) e passa a ser a planilha de escrituras da Secretaria Municipal de Fazenda, publicada em
`https://fazenda.prefeitura.rio/itbi-valores-medios-por-m2-de-transacoes-imobiliarias-por-trecho-de-logradouro`.

Motivo, medido em 2026-10-20 na cidade inteira:

| Ano | Camada 8 | Planilha SMF |
|---|---|---|
| 2019 | 19.802 | 30.718 |
| 2021 | 31.267 | 45.599 |
| 2024 | 27.922 | 49.914 |
| 2025 | 29.228 | 48.819 |
| 2026 até setembro | 20.653 | 35.045 |

A própria descrição da camada 8 diz que ela "não se presta para gerar o total de transações para o logradouro". Na Av. Lúcio Costa, residencial, 2025, são 302 escrituras na camada 8 contra 448 na SMF, e as médias mensais não batem.

A planilha traz 20 colunas por escritura, entre elas número, complemento (apartamento, bloco, sala), área, valor declarado e R$/m². Cobertura conferida: 327.528 escrituras de 2019 a set/2026, 163 bairros, 93 meses sem buraco. Só transferências de 100%.

## O que entrou no repositório

- `supabase/migrations/20261021120000_itbi_escrituras_smf.sql`: tabela `itbi_escrituras` (RLS só admin), coluna `itbi_transactions.fonte`, view de conferência `itbi_transactions_smf` e a função `itbi_consolidar_smf(inicio, fim, bairro)`, que reconstrói `itbi_transactions` no período a partir das escrituras, preservando `microbairro` e geocodificação por rua e atualizando `itbi_price_index`.
- `scripts/itbi-smf/carregar_itbi_smf.py` + `data/cl_nomes_arcgis.json` + `README.md`: carga mensal (raspa, baixa, classifica, valida, geocodifica, grava, consolida, loga em `etl_log`).
- `.github/workflows/itbi-smf-mensal.yml`: cron dia 5 e disparo manual com dry-run.
- `supabase/functions/_shared/itbiFonte.ts` + teste: `sync-itbi-prefeitura` devolve 409 e `sync-itbi-daily` encerra com `skipped: true` quando o período já tem linhas `smf`, salvo `force: true`.
- `SyncITBIButton`: mostra o motivo quando a carga da camada 8 é recusada.
- `CLAUDE.md` e `CONTEXT.md` 5.1 atualizados.

Nada do motor estatístico mudou. O motor, as RPCs de raio, `itbi_price_index` e os hooks continuam lendo `itbi_transactions`, agora com o mercado inteiro.

## O que ainda não foi feito

1. **Aplicar a migration** pelo chat da Lovable. Só cria objetos novos e uma coluna com default; não altera dados.
2. **Cadastrar os secrets** `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no GitHub para o workflow.
3. **Primeira carga** seguindo o roteiro de `scripts/itbi-smf/README.md` (Barra em dry-run, Barra de verdade, conferência, cidade inteira).
4. **Conferência lado a lado** com as consultas comentadas no fim da migration e uma avaliação na Barra antes e depois.
5. **Calibração**: o cinto de outliers (`_shared/outlierLimits.ts`) foi gerado sobre a base da camada 8. Com a base completa, rodar a consulta 7.4 de `docs/calibracao-consultas.sql` e regenerar (`bun run cinto`), registrando na especificação (seção 15).
6. **Regra 5.1 do CONTEXT.md** ("janela histórica excluindo ano corrente"): com dados até setembro, 2026 deveria aparecer como linha parcial sinalizada em vez de ser omitido. Decisão de produto pendente.
7. **Produto**: usar `numero` e `complemento` de `itbi_escrituras` para o de-para por condomínio (`condominios_mapeamento`) e para comparáveis por unidade, sempre agregando com piso de 5.
8. **Desligar** `sync-itbi-daily` no agendador (pg_cron) quando a carga mensal estiver estável; até lá ele encerra sozinho sem gravar.

## Verificação feita aqui

`bun run typecheck`, `bun run lint`, `bun run test` e dry-run do carregador para a Barra com os arquivos da SMF de out/2026 (31.443 escrituras; 1.843 rejeitadas pelos limites; 448 residenciais aceitas na Lúcio Costa em 2025). Sem acesso ao banco: a migration e a função não foram executadas contra produção.

## Atualização 2026-10-21 (tarde): migrations aplicadas e carregador no backend

- Backup `itbi_transactions_backup_pre_smf` (38.197 linhas, 163.015 escrituras, jan/2020 a jul/2026) e as migrations `20261021120000` e `20261021130000` aplicadas em produção e registradas em `supabase_migrations.schema_migrations`.
- A segunda migration deixa terrenos fora de `itbi_transactions`: a base de produção só tinha Apartamento, Casa e Comercial.
- O workflow do GitHub virou só manual: a Lovable Cloud não expõe a chave de serviço. A carga oficial passa a ser o painel em `/admin` com a edge function `ingest-itbi-smf` (ver `scripts/itbi-smf/README.md`, inclusive as medições de CPU que levaram o processamento pesado para o navegador).
- Bairros: `itbi_transactions` grava bairro em maiúsculas com acento; a carga traduz o `CD_BAIRRO` da SMF para esse nome.
- A SMF republicou o arquivo recente em 2026-10-21 (`-7-1.xlsx`): a Barra passou de 7.605 para 8.002 escrituras de 2025 em diante.
