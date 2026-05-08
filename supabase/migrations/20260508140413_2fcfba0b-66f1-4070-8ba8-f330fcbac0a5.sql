
-- =========================================================
-- 1. Adicionar campos do proprietário e custos à tabela valuations
-- =========================================================
ALTER TABLE public.valuations
  ADD COLUMN IF NOT EXISTS proprietario_nome text,
  ADD COLUMN IF NOT EXISTS proprietario_cpf text,
  ADD COLUMN IF NOT EXISTS proprietario_rg text,
  ADD COLUMN IF NOT EXISTS proprietario_rg_orgao text,
  ADD COLUMN IF NOT EXISTS proprietario_email text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS cidade text DEFAULT 'Rio de Janeiro',
  ADD COLUMN IF NOT EXISTS valor_condominio numeric,
  ADD COLUMN IF NOT EXISTS valor_iptu numeric;

-- =========================================================
-- 2. Tabela principal: autorizacoes_captacao
-- =========================================================
CREATE TABLE IF NOT EXISTS public.autorizacoes_captacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  valuation_id uuid NOT NULL REFERENCES public.valuations(id) ON DELETE CASCADE,
  created_by uuid,

  codigo text UNIQUE NOT NULL,

  -- Proprietário
  proprietario_nome text NOT NULL,
  proprietario_cpf text NOT NULL,
  proprietario_rg text,
  proprietario_rg_orgao text,
  proprietario_telefone text,
  proprietario_email text NOT NULL,

  -- Imóvel
  endereco text NOT NULL,
  numero text,
  complemento text,
  bairro text NOT NULL,
  cidade text NOT NULL DEFAULT 'Rio de Janeiro',
  cep text,
  valor_condominio numeric,
  valor_iptu numeric,
  vagas integer,
  quartos integer,

  -- Valores contratuais
  valor_avaliacao numeric NOT NULL CHECK (valor_avaliacao > 0),
  valor_venda numeric NOT NULL CHECK (valor_venda > 0),

  -- Configurações
  tipo_gestao text NOT NULL DEFAULT 'com_exclusiva' CHECK (tipo_gestao IN ('com_exclusiva','sem_exclusiva')),
  prazo_dias integer NOT NULL DEFAULT 90 CHECK (prazo_dias > 0),
  percentual_honorarios numeric NOT NULL DEFAULT 5 CHECK (percentual_honorarios >= 0),

  -- Corretor responsável
  corretor_nome text,
  corretor_creci text,

  -- Fluxo
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','enviada','visualizada','assinada','recusada')),
  token_acesso text UNIQUE,

  assinatura_proprietario text,
  assinatura_corretor text,
  ip_assinatura_proprietario text,
  data_assinatura_proprietario timestamptz,
  data_envio timestamptz,
  data_visualizacao timestamptz,
  data_vencimento timestamptz,
  data_recusa timestamptz,
  motivo_recusa text,

  pdf_url text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autorizacoes_org ON public.autorizacoes_captacao(organization_id);
CREATE INDEX IF NOT EXISTS idx_autorizacoes_valuation ON public.autorizacoes_captacao(valuation_id);
CREATE INDEX IF NOT EXISTS idx_autorizacoes_status ON public.autorizacoes_captacao(status);
CREATE INDEX IF NOT EXISTS idx_autorizacoes_token ON public.autorizacoes_captacao(token_acesso) WHERE token_acesso IS NOT NULL;

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.update_autorizacoes_captacao_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autorizacoes_captacao_updated_at ON public.autorizacoes_captacao;
CREATE TRIGGER trg_autorizacoes_captacao_updated_at
BEFORE UPDATE ON public.autorizacoes_captacao
FOR EACH ROW EXECUTE FUNCTION public.update_autorizacoes_captacao_updated_at();

-- Trigger: gerar código AUT-XXXXXX automaticamente
CREATE OR REPLACE FUNCTION public.gerar_codigo_autorizacao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  novo_codigo text;
  tentativas int := 0;
BEGIN
  IF NEW.codigo IS NOT NULL AND NEW.codigo <> '' THEN
    RETURN NEW;
  END IF;

  LOOP
    novo_codigo := 'AUT-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.autorizacoes_captacao WHERE codigo = novo_codigo);
    tentativas := tentativas + 1;
    IF tentativas > 10 THEN
      RAISE EXCEPTION 'Não foi possível gerar código único para autorização';
    END IF;
  END LOOP;

  NEW.codigo := novo_codigo;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gerar_codigo_autorizacao ON public.autorizacoes_captacao;
CREATE TRIGGER trg_gerar_codigo_autorizacao
BEFORE INSERT ON public.autorizacoes_captacao
FOR EACH ROW EXECUTE FUNCTION public.gerar_codigo_autorizacao();

-- Trigger: bloqueia edição de campos contratuais após assinatura/recusa
CREATE OR REPLACE FUNCTION public.bloquear_edicao_autorizacao_finalizada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('assinada','recusada') THEN
    -- Permite apenas atualização de campos de auditoria/visualização
    IF NEW.proprietario_nome IS DISTINCT FROM OLD.proprietario_nome
       OR NEW.proprietario_cpf IS DISTINCT FROM OLD.proprietario_cpf
       OR NEW.endereco IS DISTINCT FROM OLD.endereco
       OR NEW.valor_avaliacao IS DISTINCT FROM OLD.valor_avaliacao
       OR NEW.valor_venda IS DISTINCT FROM OLD.valor_venda
       OR NEW.tipo_gestao IS DISTINCT FROM OLD.tipo_gestao
       OR NEW.prazo_dias IS DISTINCT FROM OLD.prazo_dias
       OR NEW.percentual_honorarios IS DISTINCT FROM OLD.percentual_honorarios THEN
      RAISE EXCEPTION 'Autorização % não pode ser editada após status %', OLD.codigo, OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_edicao_autorizacao_finalizada ON public.autorizacoes_captacao;
CREATE TRIGGER trg_bloquear_edicao_autorizacao_finalizada
BEFORE UPDATE ON public.autorizacoes_captacao
FOR EACH ROW EXECUTE FUNCTION public.bloquear_edicao_autorizacao_finalizada();

-- RLS
ALTER TABLE public.autorizacoes_captacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view autorizacoes"
ON public.autorizacoes_captacao FOR SELECT TO authenticated
USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can create autorizacoes"
ON public.autorizacoes_captacao FOR INSERT TO authenticated
WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can update autorizacoes"
ON public.autorizacoes_captacao FOR UPDATE TO authenticated
USING (organization_id = get_user_org_id(auth.uid()))
WITH CHECK (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can delete autorizacoes"
ON public.autorizacoes_captacao FOR DELETE TO authenticated
USING (organization_id = get_user_org_id(auth.uid()));

-- =========================================================
-- 3. Tabela de eventos / auditoria
-- =========================================================
CREATE TABLE IF NOT EXISTS public.autorizacoes_captacao_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autorizacao_id uuid NOT NULL REFERENCES public.autorizacoes_captacao(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('criada','enviada','reenviada','visualizada','assinada','recusada','pdf_gerado')),
  ip text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autorizacoes_eventos_autorizacao ON public.autorizacoes_captacao_eventos(autorizacao_id);
CREATE INDEX IF NOT EXISTS idx_autorizacoes_eventos_tipo ON public.autorizacoes_captacao_eventos(tipo);

ALTER TABLE public.autorizacoes_captacao_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view eventos"
ON public.autorizacoes_captacao_eventos FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.autorizacoes_captacao a
  WHERE a.id = autorizacoes_captacao_eventos.autorizacao_id
    AND a.organization_id = get_user_org_id(auth.uid())
));

CREATE POLICY "Org members can insert eventos"
ON public.autorizacoes_captacao_eventos FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.autorizacoes_captacao a
  WHERE a.id = autorizacoes_captacao_eventos.autorizacao_id
    AND a.organization_id = get_user_org_id(auth.uid())
));

-- =========================================================
-- 4. Storage bucket privado para PDFs
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('autorizacoes-captacao', 'autorizacoes-captacao', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org members can read autorizacao PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'autorizacoes-captacao'
  AND EXISTS (
    SELECT 1 FROM public.autorizacoes_captacao a
    WHERE a.organization_id = get_user_org_id(auth.uid())
      AND (storage.foldername(name))[1] = a.organization_id::text
  )
);

CREATE POLICY "Org members can upload autorizacao PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'autorizacoes-captacao'
  AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
);

CREATE POLICY "Org members can update autorizacao PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'autorizacoes-captacao'
  AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text
);
