-- 7.4d Simulação das regras por prédio do cinto (fora de mercado e exceção),
-- só leitura. Reproduz a lógica de itbi_aplicar_cinto da migration
-- 20261021230000_itbi_cinto_regras_predio.sql para um período, sem gravar nada,
-- e compara com a situação atual de cada escritura. Também conta quantas
-- seriam fora de mercado com o fator 0,4, para comparar com o 0,5 adotado.
-- Trocar as duas datas abaixo; um ano por vez cabe no tempo do conector.
with par as (select date '2025-01-01' as inicio, date '2025-12-31' as fim),
ref as (select ln_mediana from public.itbi_price_index order by trimestre desc limit 1),
idx as materialized (select trimestre, exp((select ln_mediana from ref)-ln_mediana) f from public.itbi_price_index),
cid as (select piso, teto from public.itbi_cinto where bairro='CIDADE' and tipologia='*'),
alvo as materialized (
  select e.id, e.bairro, e.tipologia, e.cl, e.numero, e.area_m2,
    (e.valor_m2*x.f)::numeric vc, coalesce(c.piso,(select piso from cid)) piso, coalesce(c.teto,(select teto from cid)) teto,
    case when e.aceita then 'aceita' else e.motivo_rejeicao end antes,
    (e.cl is not null and e.cl<>'000000' and ltrim(upper(btrim(coalesce(e.numero,''))),'0') ~ '^[1-9][0-9]*[A-Z]?$') chave_ok
  from public.itbi_escrituras e join idx x on x.trimestre=date_trunc('quarter',e.data_transacao)::date
  left join public.itbi_cinto c on c.bairro=public.itbi_normalizar_bairro_cinto(e.bairro) and c.tipologia=e.tipologia
  where (e.aceita or e.motivo_rejeicao in ('fora_do_cinto','fora_de_mercado'))
    and e.tipologia in ('Apartamento','Casa','Comercial') and e.uso in ('Residencial','Comercial')
    and e.data_transacao between (select inicio from par) and (select fim from par)),
predios as (select distinct cl, numero, tipologia, bairro, piso, teto from alvo where chave_ok),
refs as materialized (
  select r.id, r.cl, r.numero, r.tipologia, r.bairro, r.area_m2, (r.valor_m2*x.f)::numeric vc
  from predios p join public.itbi_escrituras r on r.cl=p.cl and r.numero=p.numero and r.tipologia=p.tipologia and r.bairro=p.bairro
  join idx x on x.trimestre=date_trunc('quarter',r.data_transacao)::date
  where (r.aceita or r.motivo_rejeicao in ('fora_do_cinto','fora_de_mercado')) and r.uso in ('Residencial','Comercial')
    and r.valor_m2*x.f between p.piso and p.teto),
ra as (select a.id, count(r.id) n, percentile_cont(0.5) within group (order by r.vc)::numeric med
  from alvo a join refs r on r.cl=a.cl and r.numero=a.numero and r.tipologia=a.tipologia and r.bairro=a.bairro and r.id<>a.id
    and r.area_m2 between a.area_m2/1.25 and a.area_m2*1.25 where a.chave_ok group by a.id),
rt as (select a.id, count(r.id) n, percentile_cont(0.5) within group (order by r.vc)::numeric med
  from alvo a join refs r on r.cl=a.cl and r.numero=a.numero and r.tipologia=a.tipologia and r.bairro=a.bairro and r.id<>a.id
  where a.chave_ok and a.vc>a.teto group by a.id),
d as (select a.*, (ra.n>=2 and a.vc<=0.5*ra.med) fm, (ra.n>=2 and a.vc<=0.4*ra.med) fm40,
    (a.vc>a.teto and rt.n>=2 and a.vc between 0.67*rt.med and 1.5*rt.med) exc, (a.vc between a.piso and a.teto) dentro
  from alvo a left join ra using (id) left join rt using (id)),
s as (select d.*, case when coalesce(fm,false) then 'fora_de_mercado' when not dentro and not coalesce(exc,false) then 'fora_do_cinto' else 'aceita' end depois from d)
select (select extract(year from inicio) from par) ano, count(*) avaliadas,
  count(*) filter (where antes='aceita') aceitas_antes, count(*) filter (where antes='fora_do_cinto') fora_cinto_antes,
  count(*) filter (where depois='aceita') aceitas_depois, count(*) filter (where depois='fora_do_cinto') fora_cinto_depois,
  count(*) filter (where depois='fora_de_mercado') fora_mercado_50, count(*) filter (where coalesce(fm40,false)) fora_mercado_40,
  count(*) filter (where depois='fora_de_mercado' and antes='aceita') fora_mercado_que_eram_aceitas,
  count(*) filter (where coalesce(exc,false) and not coalesce(fm,false)) excecoes_predio,
  count(*) filter (where antes='fora_do_cinto' and depois='aceita') reaceitas
from s;
