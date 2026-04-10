
CREATE OR REPLACE FUNCTION public.get_ficha_publica(p_codigo text)
RETURNS TABLE (
  codigo text, endereco_imovel text, data_visita timestamptz,
  nome_corretor text, condominio_edificio text, unidade_imovel text,
  codigo_imovel text, valor_imovel numeric, nome_visitante text,
  nome_proprietario text, observacoes text, status status_visita,
  tem_assinatura_visitante boolean, tem_assinatura_corretor boolean
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT f.codigo, f.endereco_imovel, f.data_visita, f.nome_corretor,
    f.condominio_edificio, f.unidade_imovel, f.codigo_imovel, f.valor_imovel,
    f.nome_visitante, f.nome_proprietario, f.notas, f.status,
    (f.assinatura_visitante IS NOT NULL) as tem_assinatura_visitante,
    (f.assinatura_corretor IS NOT NULL) as tem_assinatura_corretor
  FROM fichas_visita f WHERE f.codigo = p_codigo;
$$;
