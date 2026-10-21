-- 7.4c Aceite do cinto (seção 15.0 da especificação), lido da tabela itbi_cinto.
-- Mesma população da calibração: aceitas ou fora_do_cinto, uso Residencial
-- para Apartamento/Casa e Comercial para Comercial, preço corrigido ao último
-- trimestre do índice, últimos 12 meses. Reprova o par com mais de 2% cortado
-- E mais de 3 vendas cortadas. Rodar depois de carregar o SQL gerado por
-- bun run cinto; em 2026-10-22 a mesma conta, feita com os valores gerados,
-- deu 0 reprovados nas duas faixas.
with ref as (select ln_mediana from public.itbi_price_index order by trimestre desc limit 1),
e as (
  select public.itbi_normalizar_bairro_cinto(e.bairro) as bairro, e.tipologia,
         e.valor_m2 * exp((select ln_mediana from ref) - i.ln_mediana) as vc
  from public.itbi_escrituras e
  join public.itbi_price_index i on i.trimestre = date_trunc('quarter', e.data_transacao)::date
  where (e.aceita or e.motivo_rejeicao = 'fora_do_cinto')
    and e.data_transacao >= current_date - interval '12 months'
    and ((e.uso = 'Residencial' and e.tipologia in ('Apartamento', 'Casa'))
      or (e.uso = 'Comercial' and e.tipologia = 'Comercial'))
),
f as (
  select c.bairro, c.tipologia, c.janela, count(e.*) as n,
         count(e.*) filter (where e.vc < c.piso) as abaixo,
         count(e.*) filter (where e.vc > c.teto) as acima
  from public.itbi_cinto c
  left join e on e.bairro = c.bairro and e.tipologia = c.tipologia
  where c.bairro <> 'CIDADE'
  group by 1, 2, 3
)
select janela, count(*) as pares, sum(n) as vendas_12m, sum(abaixo) as abaixo, sum(acima) as acima,
       round(100.0 * sum(abaixo + acima) / nullif(sum(n), 0), 2) as pct_cortado,
       count(*) filter (where n > 0 and 100.0 * (abaixo + acima) / n > 2) as acima_de_2pct,
       count(*) filter (where n > 0 and 100.0 * (abaixo + acima) / n > 2 and abaixo + acima > 3) as reprovados,
       string_agg(case when n > 0 and 100.0 * (abaixo + acima) / n > 2 and abaixo + acima > 3
                       then bairro || '/' || tipologia || ' ' || (abaixo + acima) || '/' || n end, ', ') as pares_reprovados
from f group by janela order by janela;
