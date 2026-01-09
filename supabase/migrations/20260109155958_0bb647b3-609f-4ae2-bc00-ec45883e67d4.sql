-- Ajuste de legenda da característica (Posição: 2)
UPDATE public.valuation_characteristics
SET char_name = 'Vista livre Lagoa/Parque/Verde',
    updated_at = now()
WHERE id = 'a6025332-153d-4bad-bb9b-a8155809ee39'
   OR char_code = 'vista_lagoa';
