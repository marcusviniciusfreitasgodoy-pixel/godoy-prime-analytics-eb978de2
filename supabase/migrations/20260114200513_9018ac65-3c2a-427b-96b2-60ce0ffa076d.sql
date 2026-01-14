-- ========================================
-- TABELAS PARA CALIBRAÇÃO DE VISTORIAS
-- ========================================

-- Tabela de categorias do checklist de vistoria
CREATE TABLE public.vistoria_checklist_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  weight DECIMAL(5,2) NOT NULL DEFAULT 5,
  applies_to VARCHAR(20) NOT NULL DEFAULT 'ambos',
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_category_per_type UNIQUE(category_id, applies_to)
);

-- Tabela de itens do checklist de vistoria
CREATE TABLE public.vistoria_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.vistoria_checklist_categories(id) ON DELETE CASCADE,
  item_id VARCHAR(100) NOT NULL,
  label TEXT NOT NULL,
  tooltip TEXT,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_item_per_category UNIQUE(category_id, item_id)
);

-- Trigger para updated_at
CREATE TRIGGER update_vistoria_categories_updated_at
  BEFORE UPDATE ON public.vistoria_checklist_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vistoria_items_updated_at
  BEFORE UPDATE ON public.vistoria_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para categorias
ALTER TABLE public.vistoria_checklist_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar categorias"
  ON public.vistoria_checklist_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Apenas admins podem gerenciar categorias"
  ON public.vistoria_checklist_categories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS para itens
ALTER TABLE public.vistoria_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem visualizar itens"
  ON public.vistoria_checklist_items
  FOR SELECT
  USING (true);

CREATE POLICY "Apenas admins podem gerenciar itens"
  ON public.vistoria_checklist_items
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ========================================
-- POPULAR DADOS INICIAIS - CASA
-- ========================================

-- 1. Fundações e Estrutura (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('fundacoes', '1. Fundações e Estrutura', 12, 'casa', 1);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'trincas', 'Trincas ou fissuras grandes (>3mm) em paredes, pisos e tetos', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'fundacoes' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'desaprumo', 'Desaprumo ou inclinações visíveis nas paredes', 'Observe se as paredes parecem tortas ou inclinadas', 2
FROM public.vistoria_checklist_categories WHERE category_id = 'fundacoes' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'umidade-base', 'Sinais de umidade ascendente nas bases das paredes', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'fundacoes' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'portas-janelas', 'Portas e janelas fecham corretamente', NULL, 4
FROM public.vistoria_checklist_categories WHERE category_id = 'fundacoes' AND applies_to = 'casa';

-- 2. Cobertura e Telhado (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('cobertura', '2. Cobertura e Telhado', 10, 'casa', 2);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'manchas-teto', 'Manchas de umidade ou mofo no teto', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'cobertura' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'calhas', 'Calhas e rufos: danos ou entupimento', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'cobertura' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'telhas', 'Estado geral das telhas (quebradas, deslocadas)', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'cobertura' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'estrutura-telhado', 'Estrutura do telhado visível em bom estado', NULL, 4
FROM public.vistoria_checklist_categories WHERE category_id = 'cobertura' AND applies_to = 'casa';

-- 3. Instalações Elétricas (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('eletrica', '3. Instalações Elétricas', 8, 'casa', 3);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'quadro', 'Quadro de disjuntores: identificado, organizado e moderno', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'eletrica' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'tomadas', 'Teste de tomadas e interruptores (funcionamento e fixação)', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'eletrica' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'fios-expostos', 'Fios expostos ou emendas visíveis', 'Risco de segurança se houver fios aparentes', 3
FROM public.vistoria_checklist_categories WHERE category_id = 'eletrica' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'carga', 'Carga suporta equipamentos modernos (Ar condicionado, etc.)', NULL, 4
FROM public.vistoria_checklist_categories WHERE category_id = 'eletrica' AND applies_to = 'casa';

-- 4. Instalações Hidráulicas (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('hidraulica', '4. Instalações Hidráulicas', 8, 'casa', 4);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'pressao', 'Pressão da água em torneiras e chuveiros', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'hidraulica' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'vazamentos-vaso', 'Vazamentos na base dos vasos sanitários', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'hidraulica' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'manchas-vazamento', 'Manchas de vazamento sob pias e em paredes de áreas molhadas', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'hidraulica' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'tubulacoes', 'Tubulações com corrosão visível', 'Indica idade avançada do sistema', 4
FROM public.vistoria_checklist_categories WHERE category_id = 'hidraulica' AND applies_to = 'casa';

-- 5. Acabamentos Internos (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('acabamentos', '5. Acabamentos Internos', 7, 'casa', 5);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'piso', 'Qualidade do piso (riscos, peças soltas, manchas)', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'acabamentos' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'pintura', 'Pintura de paredes e tetos (bolhas, descascados)', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'acabamentos' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'mofo', 'Mofo ou manchas de umidade em ambientes', 'Impacta saúde e negociação', 3
FROM public.vistoria_checklist_categories WHERE category_id = 'acabamentos' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'rodapes', 'Estado de rodapés, guarnições e forros de gesso', NULL, 4
FROM public.vistoria_checklist_categories WHERE category_id = 'acabamentos' AND applies_to = 'casa';

-- 6. Esquadrias (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('esquadrias', '6. Esquadrias (Portas e Janelas)', 6, 'casa', 6);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'vedacao', 'Vedação e funcionamento das ferragens', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'esquadrias' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'infiltracao', 'Sinais de infiltração ao redor dos caixilhos', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'esquadrias' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'vidros', 'Estado dos vidros (riscos, trincas)', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'esquadrias' AND applies_to = 'casa';

-- 7. Ventilação e Iluminação (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('ventilacao', '7. Ventilação e Iluminação', 5, 'casa', 7);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'luz-natural', 'Iluminação natural suficiente nos ambientes', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'ventilacao' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'ventilacao-cruzada', 'Ventilação cruzada adequada', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'ventilacao' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'exaustao', 'Sistemas de exaustão (coifas, depuradores) funcionando', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'ventilacao' AND applies_to = 'casa';

-- 8. Área Externa e Fachada (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('area-externa', '8. Área Externa e Fachada', 7, 'casa', 8);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'fachada', 'Revestimento da fachada (trincas, descolamento)', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'area-externa' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'muros', 'Estado de muros, portões e grades (ferrugem)', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'area-externa' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'drenagem', 'Drenagem do terreno (poças após chuva)', 'Problema de terreno pode ser caro para resolver', 3
FROM public.vistoria_checklist_categories WHERE category_id = 'area-externa' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'iluminacao-noturna', 'Iluminação noturna externa', 'Impacta segurança', 4
FROM public.vistoria_checklist_categories WHERE category_id = 'area-externa' AND applies_to = 'casa';

-- 9. Climatização (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('climatizacao', '9. Climatização', 4, 'casa', 9);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'possui-climatizacao', 'Imóvel possui sistema de climatização', 'Se não possuir, marque N/A nos demais', 1
FROM public.vistoria_checklist_categories WHERE category_id = 'climatizacao' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'ar-funcionamento', 'Funcionamento dos equipamentos de ar condicionado', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'climatizacao' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'filtros', 'Manutenção e limpeza dos filtros', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'climatizacao' AND applies_to = 'casa';

-- 10. Segurança (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('seguranca', '10. Segurança', 5, 'casa', 10);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'alarmes', 'Alarmes, câmeras e cercas elétricas (estado visual)', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'seguranca' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'portas-seguras', 'Robustez de portas, fechaduras e portões', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'seguranca' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'incendio', 'Equipamentos de combate a incêndio (validade extintores)', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'seguranca' AND applies_to = 'casa';

-- 11. Garagem (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('garagem', '11. Garagem', 4, 'casa', 11);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'piso-garagem', 'Estado do piso e infiltrações no teto', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'garagem' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'portao', 'Portão automático (funcionamento)', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'garagem' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'manobra', 'Espaço de manobra e tamanho das vagas', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'garagem' AND applies_to = 'casa';

-- 12. Lazer Privativo (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('lazer', '12. Lazer Privativo', 5, 'casa', 12);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'piscina', 'Revestimento da piscina e casa de máquinas', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'lazer' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'churrasqueira', 'Estrutura da churrasqueira, coifas e bancadas', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'lazer' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'gourmet', 'Iluminação e pontos de água/esgoto na área gourmet', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'lazer' AND applies_to = 'casa';

-- 13. Paisagismo e Jardins (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('paisagismo', '13. Paisagismo e Jardins', 4, 'casa', 13);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'plantas', 'Saúde geral das plantas e do gramado', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'paisagismo' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'irrigacao', 'Sistema de irrigação (automático?)', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'paisagismo' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'iluminacao-jardim', 'Iluminação externa e caminhos de jardim', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'paisagismo' AND applies_to = 'casa';

-- 14. Marcenaria e Planejados (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('marcenaria', '14. Marcenaria e Planejados', 5, 'casa', 14);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'ferragens', 'Ferragens e corrediças de portas e gavetas', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'marcenaria' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'cupim', 'Estufamento, descolamento ou sinais de cupim', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'marcenaria' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'conservacao-armarios', 'Qualidade geral e estado de conservação', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'marcenaria' AND applies_to = 'casa';

-- 15. Louças e Metais (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('loucas', '15. Louças e Metais', 4, 'casa', 15);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'loucas', 'Trincas ou manchas em pias, cubas e vasos', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'loucas' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'torneiras', 'Funcionamento de torneiras e registros', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'loucas' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'metais', 'Ferrugem ou descascados nos metais', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'loucas' AND applies_to = 'casa';

-- 16. Tecnologia e Automação (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('tecnologia', '16. Tecnologia e Automação', 3, 'casa', 16);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'possui-automacao', 'Imóvel possui sistema de automação', 'Se não possuir, marque N/A nos demais', 1
FROM public.vistoria_checklist_categories WHERE category_id = 'tecnologia' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'automacao', 'Sistemas de automação (luz, som, persianas)', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'tecnologia' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'wifi', 'Sinal de Wi-Fi e pontos de rede', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'tecnologia' AND applies_to = 'casa';

-- 17. Acessibilidade (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('acessibilidade', '17. Acessibilidade', 2, 'casa', 17);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'rampas', 'Rampas e portas largas', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'acessibilidade' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'circulacao', 'Circulação adequada nos corredores e banheiros', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'acessibilidade' AND applies_to = 'casa';

-- 18. Vizinhança e Entorno (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('vizinhanca', '18. Vizinhança e Entorno', 5, 'casa', 18);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'vizinhos', 'Perfil das construções vizinhas e ruído', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'vizinhanca' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'comercio', 'Proximidade de comércios e serviços', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'vizinhanca' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'transporte', 'Transporte público próximo', 'Valoriza o imóvel', 3
FROM public.vistoria_checklist_categories WHERE category_id = 'vizinhanca' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'seguranca-rua', 'Sensação de segurança na rua', 'Impacta decisão de compra', 4
FROM public.vistoria_checklist_categories WHERE category_id = 'vizinhanca' AND applies_to = 'casa';

-- 19. Documentação (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('documentacao', '19. Documentação', 4, 'casa', 19);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'matricula', 'Matrícula do Imóvel atualizada', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'documentacao' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'area-prefeitura', 'Área construída corresponde à realidade', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'documentacao' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'certidoes', 'Certidões Negativas (IPTU, Condomínio em dia)', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'documentacao' AND applies_to = 'casa';

-- 20. Sensação Geral (Casa)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('sensacao', '20. Sensação Geral', 3, 'casa', 20);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'layout', 'Layout atende às necessidades', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'sensacao' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'bem-estar', 'Sensação de bem-estar e segurança no espaço', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'sensacao' AND applies_to = 'casa';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'rotina', 'Imagina a rotina diária acontecendo ali', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'sensacao' AND applies_to = 'casa';

-- ========================================
-- POPULAR DADOS INICIAIS - APARTAMENTO
-- ========================================

-- 1. Estrutura e Conservação (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('fundacoes', '1. Estrutura e Conservação', 10, 'apartamento', 1);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'trincas', 'Trincas ou fissuras grandes (>3mm) em paredes, pisos e tetos', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'fundacoes' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'desaprumo', 'Desaprumo ou inclinações visíveis nas paredes', 'Observe se as paredes parecem tortas ou inclinadas', 2
FROM public.vistoria_checklist_categories WHERE category_id = 'fundacoes' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'umidade-base', 'Sinais de umidade em paredes e teto', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'fundacoes' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'portas-janelas', 'Portas e janelas fecham corretamente', NULL, 4
FROM public.vistoria_checklist_categories WHERE category_id = 'fundacoes' AND applies_to = 'apartamento';

-- 2. Instalações Elétricas (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('eletrica', '2. Instalações Elétricas', 8, 'apartamento', 2);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'quadro', 'Quadro de disjuntores: identificado, organizado e moderno', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'eletrica' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'tomadas', 'Teste de tomadas e interruptores', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'eletrica' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'fios-expostos', 'Fios expostos ou emendas visíveis', 'Risco de segurança', 3
FROM public.vistoria_checklist_categories WHERE category_id = 'eletrica' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'carga', 'Carga suporta equipamentos modernos (Ar condicionado, etc.)', NULL, 4
FROM public.vistoria_checklist_categories WHERE category_id = 'eletrica' AND applies_to = 'apartamento';

-- 3. Instalações Hidráulicas (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('hidraulica', '3. Instalações Hidráulicas', 8, 'apartamento', 3);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'pressao', 'Pressão da água em torneiras e chuveiros', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'hidraulica' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'vazamentos-vaso', 'Vazamentos na base dos vasos sanitários', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'hidraulica' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'manchas-vazamento', 'Manchas de vazamento sob pias e em paredes', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'hidraulica' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'tubulacoes', 'Tubulações com corrosão visível', 'Indica idade avançada do sistema', 4
FROM public.vistoria_checklist_categories WHERE category_id = 'hidraulica' AND applies_to = 'apartamento';

-- 4. Acabamentos Internos (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('acabamentos', '4. Acabamentos Internos', 10, 'apartamento', 4);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'piso', 'Qualidade do piso (riscos, peças soltas, manchas)', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'acabamentos' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'pintura', 'Pintura de paredes e tetos (bolhas, descascados)', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'acabamentos' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'mofo', 'Mofo ou manchas de umidade em ambientes', 'Impacta saúde e negociação', 3
FROM public.vistoria_checklist_categories WHERE category_id = 'acabamentos' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'rodapes', 'Estado de rodapés, guarnições e forros de gesso', NULL, 4
FROM public.vistoria_checklist_categories WHERE category_id = 'acabamentos' AND applies_to = 'apartamento';

-- 5. Esquadrias (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('esquadrias', '5. Esquadrias (Portas e Janelas)', 7, 'apartamento', 5);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'vedacao', 'Vedação e funcionamento das ferragens', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'esquadrias' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'infiltracao', 'Sinais de infiltração ao redor dos caixilhos', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'esquadrias' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'vidros', 'Estado dos vidros (riscos, trincas)', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'esquadrias' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'esquadrias-novas', 'Esquadrias de alumínio/PVC modernas', 'Valoriza o imóvel', 4
FROM public.vistoria_checklist_categories WHERE category_id = 'esquadrias' AND applies_to = 'apartamento';

-- 6. Varanda/Sacada (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('varanda', '6. Varanda/Sacada', 7, 'apartamento', 6);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'estado-varanda', 'Estado da varanda/sacada (piso, paredes, teto)', 'Diferencial de venda importante', 1
FROM public.vistoria_checklist_categories WHERE category_id = 'varanda' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'vistas', 'Vistas e privacidade', 'Valoriza ou desvaloriza o imóvel', 2
FROM public.vistoria_checklist_categories WHERE category_id = 'varanda' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'fechamento', 'Fechamento de vidro (se houver)', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'varanda' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'varanda-ampla', 'Varanda ampla e utilizável', 'Varanda grande é diferencial', 4
FROM public.vistoria_checklist_categories WHERE category_id = 'varanda' AND applies_to = 'apartamento';

-- 7. Posição e Orientação (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('posicao', '7. Posição e Orientação', 6, 'apartamento', 7);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'andar-alto', 'Andar alto (acima do 6º)', 'Andares altos geralmente são mais valorizados', 1
FROM public.vistoria_checklist_categories WHERE category_id = 'posicao' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'sol-manha', 'Sol da manhã (face leste)', 'Mais valorizado que sol da tarde', 2
FROM public.vistoria_checklist_categories WHERE category_id = 'posicao' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'frente-fundos', 'Posição frente vs fundos', 'Frente geralmente mais valorizado', 3
FROM public.vistoria_checklist_categories WHERE category_id = 'posicao' AND applies_to = 'apartamento';

-- 8. Ventilação e Iluminação (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('ventilacao', '8. Ventilação e Iluminação', 5, 'apartamento', 8);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'luz-natural', 'Iluminação natural suficiente nos ambientes', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'ventilacao' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'ventilacao-cruzada', 'Ventilação cruzada adequada', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'ventilacao' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'exaustao', 'Sistemas de exaustão (coifas, depuradores)', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'ventilacao' AND applies_to = 'apartamento';

-- 9. Climatização (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('climatizacao', '9. Climatização', 4, 'apartamento', 9);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'possui-climatizacao', 'Imóvel possui sistema de climatização', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'climatizacao' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'ar-funcionamento', 'Funcionamento dos equipamentos de ar condicionado', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'climatizacao' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'infraestrutura', 'Infraestrutura para instalação de splits', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'climatizacao' AND applies_to = 'apartamento';

-- 10. Segurança do Apartamento
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('seguranca', '10. Segurança do Apartamento', 4, 'apartamento', 10);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'porta-blindada', 'Porta blindada ou reforçada', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'seguranca' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'fechaduras', 'Qualidade das fechaduras', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'seguranca' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'olho-magico', 'Olho mágico ou câmera na porta', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'seguranca' AND applies_to = 'apartamento';

-- 11. Garagem (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('garagem', '11. Garagem', 5, 'apartamento', 11);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'localizacao-vaga', 'Localização das vagas (cobertas, perto do elevador)', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'garagem' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'tamanho-vaga', 'Tamanho das vagas (comporta SUV/utilitário)', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'garagem' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'acesso', 'Facilidade de acesso e manobra', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'garagem' AND applies_to = 'apartamento';

-- 12. Marcenaria e Planejados (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('marcenaria', '12. Marcenaria e Planejados', 5, 'apartamento', 12);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'ferragens', 'Ferragens e corrediças de portas e gavetas', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'marcenaria' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'cupim', 'Estufamento, descolamento ou sinais de cupim', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'marcenaria' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'conservacao-armarios', 'Qualidade geral e estado de conservação', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'marcenaria' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'closet', 'Closet na suíte master', 'Diferencial valorizado', 4
FROM public.vistoria_checklist_categories WHERE category_id = 'marcenaria' AND applies_to = 'apartamento';

-- 13. Louças e Metais (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('loucas', '13. Louças e Metais', 4, 'apartamento', 13);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'loucas', 'Trincas ou manchas em pias, cubas e vasos', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'loucas' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'torneiras', 'Funcionamento de torneiras e registros', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'loucas' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'metais', 'Ferrugem ou descascados nos metais', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'loucas' AND applies_to = 'apartamento';

-- 14. Tecnologia (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('tecnologia', '14. Tecnologia', 3, 'apartamento', 14);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'interfone', 'Interfone/videofone funcional', 'Importante para segurança', 1
FROM public.vistoria_checklist_categories WHERE category_id = 'tecnologia' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'automacao', 'Sistemas de automação (se houver)', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'tecnologia' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'wifi', 'Sinal de Wi-Fi e pontos de rede', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'tecnologia' AND applies_to = 'apartamento';

-- 15. Acessibilidade e Elevadores (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('acessibilidade', '15. Acessibilidade e Elevadores', 5, 'apartamento', 15);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'quantidade-elevadores', 'Quantidade de elevadores adequada ao prédio', 'Prédio alto com poucos elevadores = problema de espera', 1
FROM public.vistoria_checklist_categories WHERE category_id = 'acessibilidade' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'separacao-elevadores', 'Separação entre elevador social e de serviço/carga', 'Condomínios premium geralmente têm separação', 2
FROM public.vistoria_checklist_categories WHERE category_id = 'acessibilidade' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'circulacao', 'Circulação adequada nos corredores', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'acessibilidade' AND applies_to = 'apartamento';

-- 16. Áreas Comuns do Condomínio (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('areas-comuns', '16. Áreas Comuns do Condomínio', 5, 'apartamento', 16);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'portaria', 'Portaria e recepção (organização, segurança)', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'areas-comuns' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'piscina-cond', 'Piscina do condomínio (estado e manutenção)', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'areas-comuns' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'academia-salao', 'Academia/Salão de festas em bom estado', 'Diferencial do condomínio', 3
FROM public.vistoria_checklist_categories WHERE category_id = 'areas-comuns' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'manutencao-geral', 'Manutenção geral das áreas comuns', NULL, 4
FROM public.vistoria_checklist_categories WHERE category_id = 'areas-comuns' AND applies_to = 'apartamento';

-- 17. Vizinhança e Entorno (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('vizinhanca', '17. Vizinhança e Entorno', 4, 'apartamento', 17);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'vizinhos', 'Perfil do prédio e vizinhança', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'vizinhanca' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'comercio', 'Proximidade de comércios e serviços', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'vizinhanca' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'transporte', 'Transporte público próximo', 'Valoriza o imóvel', 3
FROM public.vistoria_checklist_categories WHERE category_id = 'vizinhanca' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'seguranca-rua', 'Sensação de segurança na região', 'Impacta decisão de compra', 4
FROM public.vistoria_checklist_categories WHERE category_id = 'vizinhanca' AND applies_to = 'apartamento';

-- 18. Documentação (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('documentacao', '18. Documentação', 4, 'apartamento', 18);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'matricula', 'Matrícula do Imóvel atualizada', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'documentacao' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'area-prefeitura', 'Área construída corresponde à realidade', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'documentacao' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'certidoes', 'Certidões Negativas (IPTU, Condomínio em dia)', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'documentacao' AND applies_to = 'apartamento';

-- 19. Sensação Geral (Apartamento)
INSERT INTO public.vistoria_checklist_categories (category_id, title, weight, applies_to, display_order)
VALUES ('sensacao', '19. Sensação Geral', 3, 'apartamento', 19);

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'layout', 'Layout atende às necessidades', NULL, 1
FROM public.vistoria_checklist_categories WHERE category_id = 'sensacao' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'bem-estar', 'Sensação de bem-estar no espaço', NULL, 2
FROM public.vistoria_checklist_categories WHERE category_id = 'sensacao' AND applies_to = 'apartamento';

INSERT INTO public.vistoria_checklist_items (category_id, item_id, label, tooltip, display_order)
SELECT id, 'rotina', 'Imagina a rotina diária acontecendo ali', NULL, 3
FROM public.vistoria_checklist_categories WHERE category_id = 'sensacao' AND applies_to = 'apartamento';