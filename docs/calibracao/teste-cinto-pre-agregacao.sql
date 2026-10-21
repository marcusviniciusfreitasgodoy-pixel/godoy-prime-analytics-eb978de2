-- Teste transacional: nenhum registro de teste permanece no banco.
BEGIN;
INSERT INTO public.itbi_cinto (bairro,tipologia,piso,teto,janela,escrituras) VALUES
 ('CIDADE','*',1000,60000,'3 anos',200), ('TESTE CINTO','Casa',2000,15000,'3 anos',200)
ON CONFLICT (bairro,tipologia) DO UPDATE SET piso=excluded.piso,teto=excluded.teto;
INSERT INTO public.itbi_escrituras (id,ano,mes,data_transacao,bairro,cl,logradouro,logradouro_smf,tipologia,uso,valor_transacao,area_m2)
SELECT 'TESTE-CINTO-'||n,2026,7,'2026-07-01','TÉSTE CINTO','TESTE','TESTE','TESTE','Casa','Residencial',v*100,100
FROM (VALUES (1,12000),(2,300000)) a(n,v);
SELECT public.itbi_aplicar_cinto('2026-07-01','2026-07-01','teste cinto',true);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.itbi_escrituras WHERE id='TESTE-CINTO-1' AND aceita) THEN RAISE EXCEPTION 'Venda boa foi rejeitada'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.itbi_escrituras WHERE id='TESTE-CINTO-2' AND NOT aceita AND motivo_rejeicao='fora_do_cinto') THEN RAISE EXCEPTION 'Erro de 300000/m² não foi rejeitado'; END IF;
END $$;
SELECT public.itbi_consolidar_smf('2026-07-01','2026-07-01','teste cinto');
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.itbi_transactions WHERE bairro='TÉSTE CINTO' AND total_transacoes=1 AND valor_m2=12000) THEN RAISE EXCEPTION 'Agregação contaminada pelo erro'; END IF;
END $$;
ROLLBACK;