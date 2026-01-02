-- Adicionar coluna para segunda opção de data/horário
ALTER TABLE agendamentos_visita 
ADD COLUMN data_hora_opcao2 TIMESTAMPTZ;

-- Criar função RPC para buscar ficha por código (bypass RLS para página pública de feedback)
CREATE OR REPLACE FUNCTION public.get_ficha_by_codigo(p_codigo TEXT)
RETURNS TABLE (
  id UUID,
  codigo TEXT,
  endereco_imovel TEXT,
  data_visita TIMESTAMPTZ,
  nome_corretor TEXT,
  nome_visitante TEXT,
  telefone_visitante TEXT,
  email_visitante TEXT,
  cpf_visitante TEXT,
  nome_proprietario TEXT,
  valor_imovel NUMERIC,
  codigo_imovel TEXT,
  status status_visita,
  notas TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fv.id,
    fv.codigo,
    fv.endereco_imovel,
    fv.data_visita,
    fv.nome_corretor,
    fv.nome_visitante,
    fv.telefone_visitante,
    fv.email_visitante,
    fv.cpf_visitante,
    fv.nome_proprietario,
    fv.valor_imovel,
    fv.codigo_imovel,
    fv.status,
    fv.notas
  FROM fichas_visita fv
  WHERE fv.codigo = p_codigo;
END;
$$;