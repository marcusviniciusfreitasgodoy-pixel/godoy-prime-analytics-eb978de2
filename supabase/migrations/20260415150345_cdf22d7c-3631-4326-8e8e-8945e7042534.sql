UPDATE condominios_mapeamento
SET nome_condominio = logradouro_padrao,
    updated_at = NOW()
WHERE fonte_identificacao = 'algoritmo_pal'
  AND nome_condominio ILIKE 'Condomínio %'
  AND ativo = true;