
-- Reclassificar BARRA OLÍMPICA → BARRA DA TIJUCA (oficialmente faz parte da Barra)
UPDATE itbi_transactions
SET bairro = 'BARRA DA TIJUCA', updated_at = now()
WHERE bairro = 'BARRA OLÍMPICA';

-- Registrar normalização para próximas cargas
INSERT INTO logradouros_normalizacao (logradouro_original, logradouro_normalizado, bairro)
VALUES ('__BAIRRO_BARRA_OLIMPICA__', '__BAIRRO_BARRA_DA_TIJUCA__', 'BARRA DA TIJUCA')
ON CONFLICT DO NOTHING;
