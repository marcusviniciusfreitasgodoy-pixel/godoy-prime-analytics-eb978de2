
-- =============================================
-- SEED: form_config_sections + form_config_fields
-- =============================================

-- =========================
-- FICHA DE VISITA
-- =========================
INSERT INTO public.form_config_sections (section_id, tipo_formulario, title, description, display_order, is_active)
VALUES
  ('identificacao_cliente', 'ficha_visita', 'Identificação do Cliente', 'Dados pessoais do visitante', 1, true),
  ('identificacao_imovel', 'ficha_visita', 'Identificação do Imóvel', 'Dados do imóvel visitado', 2, true),
  ('intermediacao', 'ficha_visita', 'Intermediação', 'Dados da visita e corretor', 3, true);

INSERT INTO public.form_config_fields (field_id, tipo_formulario, section_id, label, field_type, placeholder, is_required, is_locked, display_order, is_active, options)
VALUES
  ('nome_visitante', 'ficha_visita', 'identificacao_cliente', 'Nome do Visitante', 'text', 'Nome completo', true, true, 1, true, null),
  ('cpf_visitante', 'ficha_visita', 'identificacao_cliente', 'CPF', 'text', '000.000.000-00', true, true, 2, true, null),
  ('rg_visitante', 'ficha_visita', 'identificacao_cliente', 'RG', 'text', 'Número do RG', false, true, 3, true, null),
  ('telefone_visitante', 'ficha_visita', 'identificacao_cliente', 'Telefone', 'text', '(00) 00000-0000', true, true, 4, true, null),
  ('email_visitante', 'ficha_visita', 'identificacao_cliente', 'E-mail', 'text', 'email@exemplo.com', false, true, 5, true, null),
  ('endereco_visitante', 'ficha_visita', 'identificacao_cliente', 'Endereço', 'text', 'Endereço completo', false, true, 6, true, null),
  ('endereco_imovel', 'ficha_visita', 'identificacao_imovel', 'Endereço do Imóvel', 'text', 'Endereço completo do imóvel', true, true, 1, true, null),
  ('condominio_edificio', 'ficha_visita', 'identificacao_imovel', 'Condomínio / Edifício', 'text', 'Nome do condomínio ou edifício', false, true, 2, true, null),
  ('unidade_imovel', 'ficha_visita', 'identificacao_imovel', 'Unidade', 'text', 'Apto, bloco, sala...', false, true, 3, true, null),
  ('codigo_imovel', 'ficha_visita', 'identificacao_imovel', 'Código do Imóvel', 'text', 'Código interno', false, true, 4, true, null),
  ('nome_proprietario', 'ficha_visita', 'identificacao_imovel', 'Nome do Proprietário', 'text', 'Nome do proprietário', true, true, 5, true, null),
  ('valor_imovel', 'ficha_visita', 'identificacao_imovel', 'Valor do Imóvel', 'number', 'R$ 0,00', false, true, 6, true, null),
  ('corretor_id', 'ficha_visita', 'intermediacao', 'Corretor Responsável', 'select', 'Selecione o corretor', true, true, 1, true, null),
  ('data_visita', 'ficha_visita', 'intermediacao', 'Data da Visita', 'date', null, true, true, 2, true, null),
  ('notas', 'ficha_visita', 'intermediacao', 'Observações', 'textarea', 'Anotações sobre a visita...', false, true, 3, true, null);

-- =========================
-- FEEDBACK CLIENTE
-- =========================
INSERT INTO public.form_config_sections (section_id, tipo_formulario, title, description, display_order, is_active)
VALUES
  ('avaliacao_geral', 'feedback_cliente', 'Avaliação Geral', 'Impressão geral sobre o imóvel', 1, true),
  ('efeito_uau', 'feedback_cliente', 'Efeito UAU', 'O que mais chamou a atenção', 2, true),
  ('pontos_atencao', 'feedback_cliente', 'Pontos de Atenção', 'Aspectos positivos e negativos', 3, true),
  ('interesse_proposta', 'feedback_cliente', 'Interesse e Proposta', 'Nível de interesse e intenção de proposta', 4, true);

INSERT INTO public.form_config_fields (field_id, tipo_formulario, section_id, label, field_type, placeholder, is_required, is_locked, display_order, is_active, options)
VALUES
  ('avaliacao_geral', 'feedback_cliente', 'avaliacao_geral', 'Avaliação Geral (1-5)', 'rating', null, true, true, 1, true, null),
  ('conexao_imovel', 'feedback_cliente', 'avaliacao_geral', 'Conexão Emocional (1-5)', 'rating', null, true, true, 2, true, null),
  ('atende_necessidades', 'feedback_cliente', 'avaliacao_geral', 'Atende às suas necessidades?', 'checkbox', null, false, true, 3, true, null),
  ('efeito_uau', 'feedback_cliente', 'efeito_uau', 'O que mais chamou atenção?', 'checkbox', null, false, true, 1, true, '["Vista","Acabamento","Espaço","Iluminação","Varanda/Área externa","Cozinha","Banheiros","Localização","Condomínio","Segurança"]'::jsonb),
  ('efeito_uau_detalhe', 'feedback_cliente', 'efeito_uau', 'Descreva o que mais te impressionou', 'textarea', 'Conte-nos o que mais chamou sua atenção...', false, true, 2, true, null),
  ('o_que_mais_gostou', 'feedback_cliente', 'pontos_atencao', 'O que você mais gostou?', 'textarea', null, false, true, 1, true, null),
  ('o_que_menos_gostou', 'feedback_cliente', 'pontos_atencao', 'O que você menos gostou?', 'textarea', null, false, true, 2, true, null),
  ('ponto_resistencia', 'feedback_cliente', 'pontos_atencao', 'Principal ponto de resistência', 'textarea', 'O que poderia impedi-lo de fechar negócio?', false, true, 3, true, null),
  ('sugestoes_melhoria', 'feedback_cliente', 'pontos_atencao', 'Sugestões de melhoria', 'textarea', 'O que você mudaria no imóvel?', false, true, 4, true, null),
  ('nivel_interesse', 'feedback_cliente', 'interesse_proposta', 'Nível de Interesse', 'radio', null, true, true, 1, true, '[{"value":"baixo","label":"Baixo"},{"value":"medio","label":"Médio"},{"value":"alto","label":"Alto"},{"value":"muito_alto","label":"Muito Alto"}]'::jsonb),
  ('percepcao_valor', 'feedback_cliente', 'interesse_proposta', 'Percepção de Valor', 'radio', null, true, true, 2, true, '[{"value":"abaixo","label":"Abaixo do mercado"},{"value":"justo","label":"Preço justo"},{"value":"acima","label":"Acima do mercado"}]'::jsonb),
  ('gostaria_fazer_proposta', 'feedback_cliente', 'interesse_proposta', 'Gostaria de fazer uma proposta?', 'checkbox', null, false, true, 3, true, null);

-- =========================
-- FEEDBACK CORRETOR
-- =========================
INSERT INTO public.form_config_sections (section_id, tipo_formulario, title, description, display_order, is_active)
VALUES
  ('qualificacao_lead', 'feedback_corretor', 'Qualificação do Lead', 'Avaliação do perfil do cliente', 1, true),
  ('percepcao_interesse', 'feedback_corretor', 'Percepção de Interesse', 'Interesse e capacidade financeira', 2, true),
  ('observacoes_corretor', 'feedback_corretor', 'Observações', 'Notas e próximos passos', 3, true);

INSERT INTO public.form_config_fields (field_id, tipo_formulario, section_id, label, field_type, placeholder, is_required, is_locked, display_order, is_active, options)
VALUES
  ('qualificacao_lead', 'feedback_corretor', 'qualificacao_lead', 'Qualificação do Lead', 'select', 'Selecione...', true, true, 1, true, '[{"value":"frio","label":"Frio"},{"value":"morno","label":"Morno"},{"value":"quente","label":"Quente"},{"value":"muito_quente","label":"Muito Quente"}]'::jsonb),
  ('poder_decisao', 'feedback_corretor', 'qualificacao_lead', 'Poder de Decisão', 'select', 'Selecione...', false, true, 2, true, '[{"value":"decisor","label":"Decisor"},{"value":"influenciador","label":"Influenciador"},{"value":"consultor","label":"Consultor"}]'::jsonb),
  ('prazo_compra', 'feedback_corretor', 'qualificacao_lead', 'Prazo para Compra', 'select', 'Selecione...', false, true, 3, true, '[{"value":"imediato","label":"Imediato"},{"value":"30_dias","label":"30 dias"},{"value":"60_dias","label":"60 dias"},{"value":"90_dias","label":"90+ dias"}]'::jsonb),
  ('interesse_real', 'feedback_corretor', 'percepcao_interesse', 'Interesse Real (1-5)', 'rating', null, true, true, 1, true, null),
  ('orcamento_adequado', 'feedback_corretor', 'percepcao_interesse', 'Orçamento Adequado?', 'select', 'Selecione...', false, true, 2, true, '[{"value":"sim","label":"Sim"},{"value":"parcial","label":"Parcial"},{"value":"nao","label":"Não"}]'::jsonb),
  ('forma_pagamento', 'feedback_corretor', 'percepcao_interesse', 'Forma de Pagamento', 'select', 'Selecione...', false, true, 3, true, '[{"value":"a_vista","label":"À Vista"},{"value":"financiamento","label":"Financiamento"},{"value":"permuta","label":"Permuta"},{"value":"misto","label":"Misto"}]'::jsonb),
  ('observacoes', 'feedback_corretor', 'observacoes_corretor', 'Observações Gerais', 'textarea', 'Anotações sobre o cliente e a visita...', false, true, 1, true, null),
  ('proximos_passos', 'feedback_corretor', 'observacoes_corretor', 'Próximos Passos', 'textarea', 'O que fazer a seguir?', false, true, 2, true, null);
