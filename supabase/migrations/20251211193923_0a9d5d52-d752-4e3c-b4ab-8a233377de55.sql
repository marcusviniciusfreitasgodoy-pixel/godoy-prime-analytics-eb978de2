-- Fase 1: Adicionar campos de terreno na tabela valuations
ALTER TABLE valuations 
ADD COLUMN IF NOT EXISTS area_terreno_m2 NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS proporcao_terreno NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bonus_terreno NUMERIC DEFAULT 0;

-- Fase 2: Adicionar coluna applies_to na tabela valuation_characteristics
ALTER TABLE valuation_characteristics 
ADD COLUMN IF NOT EXISTS applies_to VARCHAR(20) DEFAULT 'ambos' 
CHECK (applies_to IN ('casa', 'apartamento', 'ambos'));

-- Atualizar características existentes para 'ambos'
UPDATE valuation_characteristics SET applies_to = 'ambos' WHERE applies_to IS NULL;

-- Atualizar características específicas de apartamento (andar alto/baixo)
UPDATE valuation_characteristics SET applies_to = 'apartamento' 
WHERE char_code IN ('andar_alto', 'andar_baixo');

-- Inserir 12 novas características para CASA
INSERT INTO valuation_characteristics (category, category_name, char_code, char_name, char_description, char_type, weight_value, category_cap_max, category_cap_min, display_order, is_active, applies_to) VALUES
-- Categoria A - Posição/Vista (casa)
('A', 'Posição / Vista / Luz', 'fundo_lote_lateral', 'Fundo de Lote / Rua Lateral', 'Imóvel com posição privilegiada no lote', 'positive', 0.03, 0.15, -0.12, 50, true, 'casa'),
-- Categoria B - Conservação (casa)
('B', 'Conservação / Modernização', 'acabamento_fachada', 'Acabamento Visual Fachada', 'Fachada bem conservada com acabamento de qualidade', 'positive', 0.04, 0.10, -0.08, 51, true, 'casa'),
('B', 'Conservação / Modernização', 'telhado_bom_estado', 'Telhado/Cobertura Bom Estado', 'Telhado sem infiltrações e bem conservado', 'positive', 0.02, 0.10, -0.08, 52, true, 'casa'),
('B', 'Conservação / Modernização', 'energia_solar', 'Sistema Energia Solar', 'Painéis solares instalados e funcionando', 'positive', 0.03, 0.10, -0.08, 53, true, 'casa'),
-- Categoria C - Conforto (casa)
('C', 'Conforto / Amenidades', 'quintal_amplo', 'Quintal/Área Externa Ampla', 'Área externa generosa para lazer', 'positive', 0.03, 0.10, -0.06, 54, true, 'casa'),
('C', 'Conforto / Amenidades', 'piscina_aquecida', 'Piscina Aquecida', 'Piscina com aquecimento solar ou elétrico', 'positive', 0.02, 0.10, -0.06, 55, true, 'casa'),
('C', 'Conforto / Amenidades', 'churrasqueira_gourmet', 'Churrasqueira Gourmet', 'Espaço gourmet com churrasqueira', 'positive', 0.02, 0.10, -0.06, 56, true, 'casa'),
('C', 'Conforto / Amenidades', 'jardim_paisagismo', 'Jardim com Paisagismo', 'Jardim planejado e bem cuidado', 'positive', 0.02, 0.10, -0.06, 57, true, 'casa'),
-- Categoria D - Segurança (casa)
('D', 'Segurança / Acesso', 'muros_altos_seguranca', 'Muros Altos + Segurança Privada', 'Sistema de segurança privativo com muros altos', 'positive', 0.02, 0.06, -0.06, 58, true, 'casa'),
-- Categoria E - Funcionalidade (casa)
('E', 'Funcionalidade / Layout', 'area_servico_externa', 'Área de Serviço Externa', 'Lavanderia/área de serviço separada', 'positive', 0.01, 0.08, -0.04, 59, true, 'casa'),
('E', 'Funcionalidade / Layout', 'poco_artesiano', 'Poço Artesiano', 'Sistema de água próprio', 'positive', 0.02, 0.08, -0.04, 60, true, 'casa'),
('E', 'Funcionalidade / Layout', 'edicula_caseiro', 'Edícula/Casa Caseiro', 'Dependência separada para funcionários', 'positive', 0.03, 0.08, -0.04, 61, true, 'casa');

-- Inserir 8 novas características para APARTAMENTO
INSERT INTO valuation_characteristics (category, category_name, char_code, char_name, char_description, char_type, weight_value, category_cap_max, category_cap_min, display_order, is_active, applies_to) VALUES
-- Categoria A - Posição/Vista (apartamento)
('A', 'Posição / Vista / Luz', 'andar_alto_12', 'Andar Alto (>12º)', 'Apartamento acima do 12º andar com vista ampla', 'positive', 0.04, 0.12, -0.12, 62, true, 'apartamento'),
('A', 'Posição / Vista / Luz', 'interior_sem_vista', 'Interior/Sem Vista', 'Unidade interna sem vista externa', 'negative', -0.04, 0.12, -0.12, 63, true, 'apartamento'),
('A', 'Posição / Vista / Luz', 'ultimo_andar_sem_cob', 'Último Andar (s/ Cobertura)', 'Último andar do prédio (não cobertura)', 'positive', 0.02, 0.12, -0.12, 64, true, 'apartamento'),
('A', 'Posição / Vista / Luz', 'andar_terreo_garden', 'Térreo Acessível/Garden', 'Garden com área externa privativa', 'positive', 0.01, 0.12, -0.12, 65, true, 'apartamento'),
-- Categoria B - Conservação (apartamento)
('B', 'Conservação / Modernização', 'esquadrias_novas', 'Esquadrias Novas', 'Janelas e portas em alumínio/PVC novos', 'positive', 0.02, 0.08, -0.08, 66, true, 'apartamento'),
-- Categoria C - Conforto (apartamento)
('C', 'Conforto / Amenidades', 'varanda_sacada_ampla', 'Varanda/Sacada Ampla', 'Varanda espaçosa com boa metragem', 'positive', 0.03, 0.06, -0.06, 67, true, 'apartamento'),
-- Categoria E - Funcionalidade (apartamento)
('E', 'Funcionalidade / Layout', 'closet_suite', 'Closet na Suíte', 'Suíte master com closet', 'positive', 0.01, 0.04, -0.04, 68, true, 'apartamento'),
('E', 'Funcionalidade / Layout', 'dependencia_empregada', 'Dependência Completa', 'Quarto e banheiro de serviço', 'positive', 0.02, 0.04, -0.04, 69, true, 'apartamento');