-- 1. Desativar os itens antigos de andar duplicados (manter apenas um representativo)
UPDATE valuation_characteristics 
SET is_active = false 
WHERE char_code IN ('andar_alto', 'andar_alto_12', 'ultimo_andar_sem_cob', 'andar_terreo_garden');

-- 2. Renomear o item restante para representar o grupo consolidado
UPDATE valuation_characteristics 
SET char_name = 'Andar Alto (>10º)', 
    char_description = 'Apartamento em andar alto com vista privilegiada. Selecione apenas esta opção OU Andar Baixo.'
WHERE char_code = 'andar_baixo';

-- 3. Atualizar elevador para Social e Serviço
UPDATE valuation_characteristics 
SET char_name = 'Elevador Social e Serviço', 
    char_description = 'Prédio com elevadores separados para uso social e serviço'
WHERE char_code = 'elevador';

-- 4. Atualizar descrições para deixar claro que são mutuamente exclusivos
UPDATE valuation_characteristics 
SET char_description = 'Imóvel completamente renovado nos últimos 5 anos. NÃO marcar junto com Estado Ótimo.'
WHERE char_code = 'totalmente_reformado';

UPDATE valuation_characteristics 
SET char_description = 'Imóvel em excelente estado original, sem reformas necessárias. NÃO marcar junto com Totalmente Reformado.'
WHERE char_code = 'estado_otimo';