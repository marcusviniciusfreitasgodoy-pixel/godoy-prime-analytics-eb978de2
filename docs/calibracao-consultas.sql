-- =============================================================================
-- Consultas de calibração do motor de avaliação (seção 7 da auditoria)
-- Rode no SQL do Lovable Cloud (ou peça ao Lovable: "execute este SQL e me
-- devolva os resultados"). Todas são somente leitura. Copie cada resultado
-- como CSV e devolva para fechar os parâmetros do motor.
-- =============================================================================

-- 7.1 Magnitude do agregado: quantas escrituras cada linha representa.
-- Decide se a expansão por peso é relevante (mediana >= 3 → sim).
select
  round(avg(total_transacoes), 2)                                       as media_por_linha,
  percentile_cont(0.5) within group (order by total_transacoes)         as mediana_por_linha,
  percentile_cont(0.9) within group (order by total_transacoes)         as p90_por_linha,
  count(*)                                                              as linhas,
  sum(total_transacoes)                                                 as escrituras,
  min(data_transacao)                                                   as primeira_data,
  max(data_transacao)                                                   as ultima_data
from itbi_transactions
where uso = 'Residencial' and percentual_transferido >= 90;

-- 7.2 Quanto o antigo teto fixo de 40.000 cortava por bairro (mede o impacto
-- retroativo do item 1 nos pareceres já emitidos).
select bairro,
  sum(total_transacoes) filter (where valor_m2 > 40000)                 as escrituras_acima_40k,
  sum(total_transacoes)                                                 as escrituras_total,
  round(100.0 * sum(total_transacoes) filter (where valor_m2 > 40000)
        / nullif(sum(total_transacoes), 0), 1)                          as pct_acima_40k
from itbi_transactions
where uso = 'Residencial' and percentual_transferido >= 90
  and data_transacao >= current_date - interval '5 years'
group by bairro
order by pct_acima_40k desc nulls last;

-- 7.3 Calibração do método MAD em escala log: fração de escrituras que cada
-- combinação de k descarta, por bairro × tipologia. Alvo: 2% a 5% no total,
-- nenhum bairro acima de 10%. (Percentis não ponderados; suficiente para
-- escolher k.)
with base as (
  select bairro, tipologia, total_transacoes as w, ln(valor_m2) as x
  from itbi_transactions
  where uso = 'Residencial' and percentual_transferido >= 90 and valor_m2 > 0
    and data_transacao >= current_date - interval '5 years'
),
centro as (
  select bairro, tipologia, percentile_cont(0.5) within group (order by x) as med
  from base group by bairro, tipologia
),
mad as (
  select b.bairro, b.tipologia,
    1.4826 * percentile_cont(0.5) within group (order by abs(b.x - c.med)) as escala,
    max(c.med) as med
  from base b join centro c using (bairro, tipologia)
  group by b.bairro, b.tipologia
),
ks as (
  select * from (values (2.0, 2.5), (2.5, 3.0), (3.0, 3.5)) as t(k_inf, k_sup)
)
select b.bairro, b.tipologia, k.k_inf, k.k_sup,
  sum(w)                                                                as escrituras,
  round(100.0 * sum(w) filter (where x < med - k.k_inf * escala) / sum(w), 2) as pct_corte_baixo,
  round(100.0 * sum(w) filter (where x > med + k.k_sup * escala) / sum(w), 2) as pct_corte_alto,
  round(exp(med)::numeric, 0)                                           as mediana_m2,
  round(exp(med - k.k_inf * escala)::numeric, 0)                        as cerca_inferior_m2,
  round(exp(med + k.k_sup * escala)::numeric, 0)                        as cerca_superior_m2
from base b
join mad using (bairro, tipologia)
cross join ks k
group by b.bairro, b.tipologia, k.k_inf, k.k_sup, med, escala
having sum(w) >= 50
order by escrituras desc, b.bairro, b.tipologia, k.k_inf;

-- 7.4 Piso e teto por bairro × tipologia (P1 e P99 de 5 anos): substitui as
-- tabelas hardcoded em supabase/functions/_shared/outlierLimits.ts.
select bairro, tipologia,
  round(percentile_cont(0.01) within group (order by valor_m2)::numeric, 0) as piso_p1,
  round(percentile_cont(0.05) within group (order by valor_m2)::numeric, 0) as p5,
  round(percentile_cont(0.50) within group (order by valor_m2)::numeric, 0) as mediana,
  round(percentile_cont(0.95) within group (order by valor_m2)::numeric, 0) as p95,
  round(percentile_cont(0.99) within group (order by valor_m2)::numeric, 0) as teto_p99,
  sum(total_transacoes)                                                     as escrituras
from itbi_transactions
where uso = 'Residencial' and percentual_transferido >= 90 and valor_m2 > 0
  and data_transacao >= current_date - interval '5 years'
group by bairro, tipologia
having sum(total_transacoes) >= 100
order by bairro, tipologia;

-- 7.5 Spread real P10–P90 por rua (calibra SPREAD_NORMAL/WIDE/VERY_WIDE em
-- valuationCalculations.ts): distribuição do spread entre ruas com amostra.
with por_rua as (
  select bairro, logradouro, tipologia,
    percentile_cont(0.1) within group (order by valor_m2) as p10,
    percentile_cont(0.5) within group (order by valor_m2) as p50,
    percentile_cont(0.9) within group (order by valor_m2) as p90,
    sum(total_transacoes) as escrituras
  from itbi_transactions
  where uso = 'Residencial' and percentual_transferido >= 90 and valor_m2 > 0
    and data_transacao >= current_date - interval '5 years'
  group by bairro, logradouro, tipologia
  having sum(total_transacoes) >= 10
)
select
  count(*)                                                                    as ruas,
  round(percentile_cont(0.25) within group (order by (p90 - p10) / p50 * 100)::numeric, 1) as spread_p25,
  round(percentile_cont(0.50) within group (order by (p90 - p10) / p50 * 100)::numeric, 1) as spread_mediano,
  round(percentile_cont(0.75) within group (order by (p90 - p10) / p50 * 100)::numeric, 1) as spread_p75,
  round(percentile_cont(0.90) within group (order by (p90 - p10) / p50 * 100)::numeric, 1) as spread_p90
from por_rua;

-- 7.6 Gap anúncios × ITBI nas avaliações já salvas (calibra ANUNCIO_GAP_ALERT_PCT).
select
  count(*)                                                                    as avaliacoes_com_gap,
  round(percentile_cont(0.25) within group (order by trend_percentage)::numeric, 1) as gap_p25,
  round(percentile_cont(0.50) within group (order by trend_percentage)::numeric, 1) as gap_mediano,
  round(percentile_cont(0.75) within group (order by trend_percentage)::numeric, 1) as gap_p75
from valuations
where trend_percentage is not null;

-- 7.7 Índice de preços: confere a view materializada depois da migration.
select trimestre, round(exp(ln_mediana)::numeric, 0) as mediana_m2, escrituras
from itbi_price_index order by trimestre;

-- 7.8 Seeds e RPCs que faltam nas migrations (item 17): copie os resultados
-- para uma migration de seed no repositório.
select * from valuation_characteristics order by display_order;
select * from valuation_documentation_factors order by display_order;
select pg_get_functiondef('public.itbi_transacoes_raio'::regproc);
select pg_get_functiondef('public.get_user_activity_summary'::regproc);

-- 7.9 Cobertura de geocodificação (seção 11): pré-condição para ligar o
-- fallback por raio. Critério: pct_escrituras_com_geom >= 0.80.
select count(*) as linhas,
       count(*) filter (where geom is not null) as linhas_com_geom,
       round(sum(total_transacoes) filter (where geom is not null)::numeric
             / nullif(sum(total_transacoes), 0), 3) as pct_escrituras_com_geom
from itbi_transactions
where uso = 'Residencial';

-- 7.9b Cobertura por bairro (os 20 piores): onde o raio seria viesado.
select bairro,
       sum(total_transacoes) as escrituras,
       round(sum(total_transacoes) filter (where geom is not null)::numeric
             / nullif(sum(total_transacoes), 0), 3) as pct_com_geom
from itbi_transactions
where uso = 'Residencial'
group by bairro
having sum(total_transacoes) >= 200
order by pct_com_geom asc
limit 20;

-- 7.10 Spread P10-P90 por escopo (rua x raio 100 x raio 300 x bairro) para
-- 30 ruas com poucas linhas (as que de fato caem no fallback). Exige a
-- migration 20260902180000 aplicada. Se o spread do raio 300 for parecido
-- com o do bairro, o degrau de 300 m nao acrescenta nada.
with ruas as (
  select logradouro, bairro,
         avg(lat) as lat, avg(lng) as lng,
         count(*) as linhas, sum(total_transacoes) as escrituras
  from itbi_transactions
  where uso = 'Residencial' and lat is not null and tipologia = 'Apartamento'
    and data_transacao >= '2021-01-01' and data_transacao <= '2025-12-31'
  group by logradouro, bairro
  having count(*) between 3 and 7
  order by random()
  limit 30
),
escopos as (
  select r.logradouro, r.bairro, 'raio100' as escopo, a.valor_m2, a.total_transacoes
  from ruas r cross join lateral itbi_amostra_raio(r.lat, r.lng, 100, '2021-01-01', '2025-12-31', 'Apartamento') a
  union all
  select r.logradouro, r.bairro, 'raio300', a.valor_m2, a.total_transacoes
  from ruas r cross join lateral itbi_amostra_raio(r.lat, r.lng, 300, '2021-01-01', '2025-12-31', 'Apartamento') a
  union all
  select r.logradouro, r.bairro, 'bairro', t.valor_m2, t.total_transacoes
  from ruas r join itbi_transactions t on t.bairro = r.bairro
  where t.uso = 'Residencial' and t.tipologia = 'Apartamento' and t.valor_m2 is not null
    and t.data_transacao >= '2021-01-01' and t.data_transacao <= '2025-12-31'
),
expandido as (
  select logradouro, bairro, escopo, valor_m2
  from escopos, generate_series(1, greatest(total_transacoes, 1))
),
q as (
  select logradouro, bairro, escopo, count(*) as escrituras,
         percentile_cont(0.1) within group (order by valor_m2) as p10,
         percentile_cont(0.5) within group (order by valor_m2) as med,
         percentile_cont(0.9) within group (order by valor_m2) as p90
  from expandido group by logradouro, bairro, escopo
)
select escopo,
       count(*) as ruas,
       round(percentile_cont(0.5) within group (order by escrituras)) as escrituras_mediana,
       round(percentile_cont(0.5) within group (order by (p90 - p10) / med) * 100, 1) as spread_mediano_pct,
       round(percentile_cont(0.75) within group (order by (p90 - p10) / med) * 100, 1) as spread_p75_pct
from q group by escopo order by escopo;
