-- 1. Adiciona coluna modelos (text[]) em form_config_fields
ALTER TABLE public.form_config_fields
  ADD COLUMN IF NOT EXISTS modelos text[] DEFAULT NULL;

COMMENT ON COLUMN public.form_config_fields.modelos IS
  'Para formulários multi-modelo (ex.: proposta_compra). NULL = aparece em todos os modelos. Valores possíveis para proposta_compra: simplificado, completo.';

-- 2. Inserir seções padrão da Proposta de Compra (template global, organization_id = NULL)
INSERT INTO public.form_config_sections (tipo_formulario, section_id, title, description, display_order, is_active, organization_id)
VALUES
  ('proposta_compra', 'proponente',  'Identificação do Proponente', 'Dados pessoais de quem está fazendo a proposta', 0, true, NULL),
  ('proposta_compra', 'imovel',      'Imóvel',                       'Dados do imóvel objeto da proposta',           1, true, NULL),
  ('proposta_compra', 'condicoes',   'Condições Comerciais',         'Valor, sinal, parcelas e condições de pagamento', 2, true, NULL),
  ('proposta_compra', 'validade',    'Validade e Aceite',            'Prazo de validade da proposta e forma de aceite', 3, true, NULL)
ON CONFLICT DO NOTHING;

-- 3. Inserir campos padrão da Proposta de Compra
INSERT INTO public.form_config_fields
  (tipo_formulario, section_id, field_id, label, field_type, placeholder, help_text, options, is_required, is_locked, display_order, is_active, organization_id, modelos)
VALUES
  -- Proponente
  ('proposta_compra', 'proponente', 'nome_completo', 'Nome completo',  'text',     'Nome do proponente',       NULL, NULL, true, true,  0, true, NULL, ARRAY['simplificado','completo']),
  ('proposta_compra', 'proponente', 'cpf_cnpj',      'CPF/CNPJ',       'text',     '000.000.000-00',           NULL, NULL, true, true,  1, true, NULL, ARRAY['simplificado','completo']),
  ('proposta_compra', 'proponente', 'telefone',      'Telefone',       'telefone', '(00) 00000-0000',          NULL, NULL, true, true,  2, true, NULL, ARRAY['simplificado','completo']),
  ('proposta_compra', 'proponente', 'email',         'E-mail',         'email',    'email@exemplo.com',        NULL, NULL, false, false, 3, true, NULL, ARRAY['simplificado','completo']),

  -- Imóvel
  ('proposta_compra', 'imovel', 'endereco_resumido', 'Endereço do imóvel', 'text', 'Rua, número, bairro',     NULL, NULL, true, true,  0, true, NULL, ARRAY['simplificado','completo']),
  ('proposta_compra', 'imovel', 'unidade',           'Unidade/Apto',       'text', 'Ex.: Bloco A, Apt 301',    NULL, NULL, false, false, 1, true, NULL, ARRAY['simplificado','completo']),
  ('proposta_compra', 'imovel', 'matricula',         'Matrícula',          'text', 'Número da matrícula no RGI', NULL, NULL, false, false, 2, true, NULL, ARRAY['completo']),

  -- Condições Comerciais
  ('proposta_compra', 'condicoes', 'valor_ofertado',     'Valor ofertado (R$)', 'number',   '0,00', NULL, NULL, true, true,  0, true, NULL, ARRAY['simplificado','completo']),
  ('proposta_compra', 'condicoes', 'sinal_entrada',      'Sinal / Entrada',     'text',     'Ex.: R$ 100.000 na assinatura', NULL, NULL, false, false, 1, true, NULL, ARRAY['simplificado','completo']),
  ('proposta_compra', 'condicoes', 'parcelas',           'Parcelas',            'textarea', 'Ex.: 10x R$ 50.000 mensais',    NULL, NULL, false, false, 2, true, NULL, ARRAY['completo']),
  ('proposta_compra', 'condicoes', 'financiamento',      'Financiamento',       'textarea', 'Banco, valor financiado, prazo', NULL, NULL, false, false, 3, true, NULL, ARRAY['completo']),
  ('proposta_compra', 'condicoes', 'outras_condicoes',   'Outras condições',    'textarea', 'Permuta, cláusulas adicionais, documentação posterior', NULL, NULL, false, false, 4, true, NULL, ARRAY['completo']),

  -- Validade
  ('proposta_compra', 'validade', 'validade_proposta', 'Validade da proposta', 'date',   NULL, 'Data limite para aceite pelo vendedor', NULL, true, true,  0, true, NULL, ARRAY['simplificado','completo']),
  ('proposta_compra', 'validade', 'forma_aceite',      'Forma de aceite',      'select', NULL, NULL,
     '[{"value":"assinatura_fisica","label":"Assinatura física"},{"value":"assinatura_digital","label":"Assinatura digital"},{"value":"email","label":"Confirmação por e-mail"}]'::jsonb,
     false, false, 1, true, NULL, ARRAY['simplificado','completo'])
ON CONFLICT DO NOTHING;