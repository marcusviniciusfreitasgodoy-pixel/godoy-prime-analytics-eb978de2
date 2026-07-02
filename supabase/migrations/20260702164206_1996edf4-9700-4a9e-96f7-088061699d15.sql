
CREATE TABLE public.pareceres_tecnicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  avaliacao_id UUID REFERENCES public.valuations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'rascunho',
  referencia_documento TEXT,
  data_emissao DATE,
  data_referencia DATE,
  objetivo TEXT,
  finalidade TEXT,
  pressupostos TEXT,
  endereco_imovel TEXT,
  bairro TEXT,
  tipologia TEXT,
  area_privativa NUMERIC,
  area_total NUMERIC,
  quartos INTEGER,
  suites INTEGER,
  vagas INTEGER,
  ano_construcao INTEGER,
  condominio TEXT,
  matricula TEXT,
  diagnostico_regiao TEXT,
  tipo_tratamento TEXT,
  fundamentacao_metodologica TEXT,
  comparativos JSONB NOT NULL DEFAULT '[]'::jsonb,
  tratamento_amostra TEXT,
  estado_conservacao TEXT,
  padrao_acabamento TEXT,
  vista TEXT,
  posicao_solar TEXT,
  reformas TEXT,
  observacoes_perito TEXT,
  fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
  riscos_estruturais TEXT,
  nivel_estrutural TEXT,
  riscos_documentais TEXT,
  nivel_documental TEXT,
  riscos_condominiais TEXT,
  nivel_condominial TEXT,
  valor_mercado NUMERIC,
  valor_m2_apurado NUMERIC,
  intervalo_valor TEXT,
  grau_fundamentacao TEXT,
  grau_precisao TEXT,
  faixa_abertura TEXT,
  valor_alvo TEXT,
  piso_negociacao TEXT,
  argumentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  alavancagem TEXT,
  conclusao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pareceres_tecnicos TO authenticated;
GRANT ALL ON public.pareceres_tecnicos TO service_role;

ALTER TABLE public.pareceres_tecnicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org select pareceres" ON public.pareceres_tecnicos
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "org insert pareceres" ON public.pareceres_tecnicos
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "org update pareceres" ON public.pareceres_tecnicos
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "org delete pareceres" ON public.pareceres_tecnicos
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE TRIGGER trg_pareceres_tecnicos_updated
  BEFORE UPDATE ON public.pareceres_tecnicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pareceres_org ON public.pareceres_tecnicos(organization_id);
CREATE INDEX idx_pareceres_avaliacao ON public.pareceres_tecnicos(avaliacao_id);

-- Storage policies for bucket pareceres-fotos (bucket criado via tool separada)
CREATE POLICY "org select fotos parecer" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pareceres-fotos'
    AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
  );

CREATE POLICY "org insert fotos parecer" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pareceres-fotos'
    AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
  );

CREATE POLICY "org update fotos parecer" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pareceres-fotos'
    AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
  );

CREATE POLICY "org delete fotos parecer" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'pareceres-fotos'
    AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
  );
