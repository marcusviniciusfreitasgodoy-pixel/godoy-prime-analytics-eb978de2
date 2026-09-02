-- Seed das tabelas de configuração do motor de avaliação (auditoria, achado A17).
-- Conteúdo exportado da base de produção em 2026-09-02
-- (docs/calibracao/valuation_characteristics-2026-09-02.csv e
--  docs/calibracao/valuation_documentation_factors-2026-09-02.csv).
--
-- Idempotente: upsert pela chave primária. Em produção não muda nada que já
-- exista com o mesmo conteúdo; em um banco novo, recria os pesos do
-- questionário e os fatores de documentação exatamente como estão em produção.
--
-- Observações registradas na auditoria (seção 10.8):
-- * category_cap_max/min variam entre linhas da mesma categoria; o motor usa
--   CATEGORY_CAPS no código e ignora estes valores (achado A8).
-- * display_order tem valores repetidos (19, 23, 24, 25, 26); a UI ordena
--   por nome dentro da categoria, então não afeta a tela.


INSERT INTO public.valuation_characteristics
  (id, category, category_name, char_code, char_name, char_description, char_type, weight_value, category_cap_max, category_cap_min, display_order, is_active, created_at, updated_at, applies_to, organization_id)
VALUES
  ('110469b9-b13a-4e37-bb77-dece85768961', 'A', 'Posição, Vista & Luz', 'vista_frontal_mar', 'Vista Frontal Mar Deslumbrante', 'Diferencial máximo em Barra (inelástico)', 'positive', 0.0500, 0.1200, -0.0800, 1, true, '2025-12-04 16:20:53.753478+00', '2026-05-20 19:00:34.059002+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('045b5f89-f742-48cf-b77d-d1c758c3528c', 'A', 'Posição, Vista & Luz', 'vista_mar', 'Vista Mar', NULL, 'positive', 0.0300, 0.1500, -0.1500, 2, true, '2026-01-09 16:26:01.749643+00', '2026-05-20 19:00:34.304776+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('bcf92f28-d9b7-45c8-86f6-79617b176a4b', 'A', 'Posição, Vista & Luz', 'vista_mar_lateral', 'Vista Mar Lateral', NULL, 'positive', 0.0200, 0.1500, -0.1500, 3, true, '2026-01-09 16:26:01.749643+00', '2026-05-20 19:00:34.554357+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('e482431a-1927-4437-8a8f-e1988950e887', 'A', 'Posição, Vista & Luz', 'vista_parcial_mar', 'Vista Parcial Mar', NULL, 'positive', 0.0100, 0.1500, -0.1500, 4, true, '2026-01-09 16:27:59.391559+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('a6025332-153d-4bad-bb9b-a8155809ee39', 'A', 'Posição, Vista & Luz', 'vista_lagoa', 'Vista livre Lagoa/Parque/Verde', 'Natureza agregada, segunda prioridade', 'positive', 0.0300, 0.1200, -0.0800, 5, true, '2025-12-04 16:20:53.753478+00', '2026-05-20 19:00:34.80718+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('8d5ec868-b462-4ed0-a01b-6f4ac22e2731', 'A', 'Posição, Vista & Luz', 'interior_sem_vista', 'Interior/Sem Vista', 'Unidade interna sem vista externa', 'negative', -0.0400, 0.1200, -0.1200, 6, true, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'apartamento', 'a0000000-0000-0000-0000-000000000001'),
  ('60877293-32c3-4448-93c9-1c2b8d17fd83', 'A', 'Posição, Vista & Luz', 'frente_propria', 'Imóvel de Frente/Fachada Própria', 'Acesso direto, prestígio', 'positive', 0.0200, 0.1200, -0.0800, 7, true, '2025-12-04 16:20:53.753478+00', '2026-05-20 18:59:12.415344+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('95a93f72-86a2-442b-b20b-7c6795073cda', 'A', 'Posição, Vista & Luz', 'fundo_lote_lateral', 'Fundo de Lote / Rua Lateral', 'Imóvel com posição privilegiada no lote', 'positive', 0.0300, 0.1500, -0.1200, 8, true, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'casa', 'a0000000-0000-0000-0000-000000000001'),
  ('29ed2100-6af0-4bba-92d8-f4c3d6210301', 'A', 'Posição, Vista & Luz', 'sol_manha', 'Sol Manhã Favorável', 'Conforto climático leve', 'positive', 0.0200, 0.1200, -0.0800, 9, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('20af8a52-1ed7-4ce4-95dc-e4775d7e8d46', 'A', 'Posição, Vista & Luz', 'andar_alto', 'Andar Alto (>6º)', 'Imóvel localizado acima do 6º andar', 'positive', 0.0300, 0.1200, -0.0800, 10, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'apartamento', 'a0000000-0000-0000-0000-000000000001'),
  ('ca44d445-93ea-486f-b189-04252a6bbc9e', 'A', 'Posição, Vista & Luz', 'andar_baixo', 'Andar Baixo (<6º)', 'Imóvel localizado abaixo do 6º andar', 'negative', -0.0300, 0.1200, -0.0800, 11, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'apartamento', 'a0000000-0000-0000-0000-000000000001'),
  ('5a4a3760-907c-4348-be62-9bc8e4848d59', 'A', 'Posição, Vista & Luz', 'ruido_excessivo', 'Ruído Excessivo', 'Desconforto permanente', 'negative', -0.0500, 0.1200, -0.0800, 12, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('5810872e-d88a-42e7-990b-ac744c872a8c', 'B', 'Conservação & Modernização', 'totalmente_reformado', 'Totalmente Reformado', 'Imóvel completamente renovado nos últimos 5 anos. NÃO marcar junto com Estado Ótimo.', 'positive', 0.0600, 0.0800, -0.0700, 13, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('b6ecec6f-f641-429c-8511-e1402623ff53', 'B', 'Conservação & Modernização', 'estado_otimo', 'Estado Geral Ótimo', 'Imóvel em excelente estado original, sem reformas necessárias. NÃO marcar junto com Totalmente Reformado.', 'positive', 0.0400, 0.0800, -0.0700, 14, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('38705ac5-09f1-47ed-99bb-95433fdeec39', 'B', 'Conservação & Modernização', 'acabamento_fachada', 'Acabamento Visual Fachada', 'Fachada bem conservada com acabamento de qualidade', 'positive', 0.0400, 0.1000, -0.0800, 15, true, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'casa', 'a0000000-0000-0000-0000-000000000001'),
  ('a2a543d0-375d-49b6-a97d-c9455f0fd733', 'B', 'Conservação & Modernização', 'eletrica_nova', 'Elétrica Nova/Recente', 'Segurança, sem risco de curto', 'positive', 0.0050, 0.0800, -0.0700, 16, true, '2025-12-04 16:20:53.753478+00', '2026-05-20 19:01:59.477228+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('a68e933b-ee78-47aa-8480-28d573c3fcba', 'B', 'Conservação & Modernização', 'hidraulica_nova', 'Hidráulica Nova/Recente', 'Segurança, sem vazamentos', 'positive', 0.0150, 0.0800, -0.0700, 17, true, '2025-12-04 16:20:53.753478+00', '2026-05-20 19:01:59.77236+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('52880902-0709-4981-875f-4ab7f0d5b8b9', 'B', 'Conservação & Modernização', 'esquadrias_novas', 'Esquadrias Novas', 'Janelas e portas em alumínio/PVC novos ou funcionando sem dificuldades', 'positive', 0.0100, 0.0800, -0.0800, 18, true, '2025-12-11 19:39:22.670078+00', '2026-05-20 19:08:06.750221+00', 'apartamento', 'a0000000-0000-0000-0000-000000000001'),
  ('451c2fd2-1540-4ebb-95a5-17be19d7cfd7', 'B', 'Conservação & Modernização', 'telhado_bom_estado', 'Telhado/Cobertura Bom Estado', 'Telhado sem infiltrações e bem conservado', 'positive', 0.0200, 0.1000, -0.0800, 19, true, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'casa', 'a0000000-0000-0000-0000-000000000001'),
  ('c01fcf94-9470-4a43-a65a-fddfbf64895d', 'C', 'Conforto / Amenidades', 'varanda_sacada_ampla', 'Varanda/Sacada Ampla', 'Varanda espaçosa com boa metragem', 'positive', 0.0300, 0.0600, -0.0600, 19, false, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'apartamento', 'a0000000-0000-0000-0000-000000000001'),
  ('1bfb2b1e-6e31-4b2a-ab7e-2261c50970fa', 'B', 'Conservação & Modernização', 'energia_solar', 'Sistema Energia Solar', 'Painéis solares instalados e funcionando', 'positive', 0.0200, 0.1000, -0.0800, 20, true, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'casa', 'a0000000-0000-0000-0000-000000000001'),
  ('1a0ca39e-6b6b-40a7-8fa6-5aa14baeaae9', 'B', 'Conservação & Modernização', 'antigo_sem_modernizacao', 'Antigo Sem Modernização', 'Exige investimento, afasta compradores', 'negative', -0.0700, 0.0800, -0.0700, 21, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('23645934-f168-426b-b7c2-98afa3045496', 'B', 'Conservação & Modernização', 'reforma_urgente', 'Necessidade Reforma Geral', 'Grande custo para o comprador', 'negative', -0.1000, 0.0800, -0.0700, 22, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('3a7db818-1215-4216-82af-1701a9ed3298', 'C', 'Conforto & Amenidades', 'lazer_completo', 'Condomínio Lazer Completo', 'Piscina + academia + sauna + gourmet', 'positive', 0.0500, 0.0600, -0.0300, 23, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('ce1b3845-377d-4e01-925d-8ef0e5d5bc79', 'E', 'Funcionalidade & Layout', 'vaga_extra', 'Vaga de Garagem Extra', 'Grande demanda em Barra (carros múltiplos)', 'positive', 0.0100, 0.0400, -0.0200, 23, true, '2025-12-04 16:20:53.753478+00', '2026-05-20 19:05:34.976772+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('b3d6edd3-a5e5-4b34-ba4a-4a04f9a9d147', 'E', 'Funcionalidade & Layout', 'layout_moderno', 'Layout Moderno/Otimizado', 'Fluxo bem distribuído', 'positive', 0.0100, 0.0400, -0.0200, 24, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('c4a45b96-a8ec-42f8-b88a-69383f9fe1b0', 'C', 'Conforto & Amenidades', 'lazer_basico', 'Condomínio Lazer Básico', 'Falta amenidades, competitividade baixa', 'negative', 0.0000, 0.0600, -0.0300, 24, true, '2025-12-04 16:20:53.753478+00', '2026-05-20 19:02:26.398695+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('f30d7e1d-1405-4142-968d-cc8d149a3eed', 'C', 'Conforto & Amenidades', 'piscina_privada', 'Piscina Privativa', 'Luxo em coberturas', 'positive', 0.0100, 0.0600, -0.0300, 25, true, '2025-12-04 16:20:53.753478+00', '2026-05-20 19:03:40.317797+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('5d348d38-d7af-49fe-9156-67f97a89e9c2', 'E', 'Funcionalidade & Layout', 'deposito', 'Depósito/Área Guarda', 'Funcionalidade adicional', 'positive', 0.0050, 0.0400, -0.0200, 25, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('830ee2f1-f6d2-4a67-9702-51b98a9fd296', 'C', 'Conforto & Amenidades', 'piscina_aquecida', 'Piscina Aquecida', 'Piscina com aquecimento solar ou elétrico', 'positive', 0.0100, 0.1000, -0.0600, 26, true, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'casa', 'a0000000-0000-0000-0000-000000000001'),
  ('436ebe30-93ec-4e1c-a1c3-80c1f489411c', 'E', 'Funcionalidade & Layout', 'layout_confuso', 'Layout Confuso/Mal Distribuído', 'Dificulta mobiliário e aproveitamento', 'negative', -0.0200, 0.0400, -0.0200, 26, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('75247da2-8128-4f57-9c29-6ad2dab09e30', 'C', 'Conforto & Amenidades', 'terraco_amplo', 'Terraço/Varanda Ampla', 'Espaço de convivência, >25m² valoriza', 'positive', 0.0200, 0.0600, -0.0300, 27, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('924f0232-209f-4c0a-8f0d-fff517dc0e64', 'C', 'Conforto & Amenidades', 'churrasqueira_gourmet', 'Churrasqueira Gourmet', 'Espaço gourmet com churrasqueira', 'positive', 0.0100, 0.1000, -0.0600, 28, true, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'casa', 'a0000000-0000-0000-0000-000000000001'),
  ('fee8d4a9-273b-4bba-ba33-255b4959a3a2', 'C', 'Conforto & Amenidades', 'quintal_amplo', 'Quintal/Área Externa Ampla', 'Área externa generosa para lazer', 'positive', 0.0200, 0.1000, -0.0600, 29, true, '2025-12-11 19:39:22.670078+00', '2026-05-20 19:03:40.570964+00', 'casa', 'a0000000-0000-0000-0000-000000000001'),
  ('d8ca535e-9846-4cbb-a2de-33044f00d012', 'C', 'Conforto & Amenidades', 'jardim_paisagismo', 'Jardim com Paisagismo', 'Jardim planejado e bem cuidado', 'positive', 0.0200, 0.1000, -0.0600, 30, true, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'casa', 'a0000000-0000-0000-0000-000000000001'),
  ('c9ab458b-f09e-4dcc-80dd-4b1de5ce2fa4', 'D', 'Segurança & Infraestrutura', 'portaria_24h', 'Portaria 24h + Vigilância', 'Esperada em Barra, mas valorizada', 'positive', 0.0200, 0.0400, -0.0600, 31, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('dd325c9a-8856-4e85-ad24-a3d88130f9bc', 'D', 'Segurança & Infraestrutura', 'muros_altos_seguranca', 'Muros Altos + Segurança Privada', 'Sistema de segurança privativo com muros altos', 'positive', 0.0200, 0.0600, -0.0600, 32, true, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'casa', 'a0000000-0000-0000-0000-000000000001'),
  ('dae4a6bc-619e-4c76-b2e2-d2f5d033fbdb', 'D', 'Segurança & Infraestrutura', 'cameras', 'Câmeras Monitoradas', 'Reforço de segurança', 'positive', 0.0050, 0.0400, -0.0600, 33, true, '2025-12-04 16:20:53.753478+00', '2026-05-20 19:04:34.957607+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('24dbb77a-0555-48d5-a397-51c4fcd0e4ed', 'D', 'Segurança & Infraestrutura', 'elevador', 'Elevador Social e Serviço', 'Prédio com elevadores separados para uso social e serviço', 'positive', 0.0100, 0.0400, -0.0600, 34, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('0c94850d-bd98-4ccd-b3d7-3fdf16c50d7d', 'D', 'Segurança & Infraestrutura', 'sem_portaria', 'Sem Portaria 24h', 'Grande desvantagem em Barra', 'negative', -0.0500, 0.0400, -0.0600, 35, true, '2025-12-04 16:20:53.753478+00', '2026-02-09 20:34:19.911329+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('3d1f9602-d6d3-40fc-b6d6-ec2e561dd040', 'D', 'Segurança & Infraestrutura', 'sem_elevador', 'Sem Elevador (Prédio >4 andares)', 'Compromete acesso e atratividade', 'negative', -0.0500, 0.0400, -0.0600, 36, true, '2025-12-04 16:20:53.753478+00', '2026-05-20 19:04:38.100215+00', 'ambos', 'a0000000-0000-0000-0000-000000000001'),
  ('1e095c3a-a42c-4c66-b962-104aefac1473', 'E', 'Funcionalidade / Layout', 'area_servico_externa', 'Área de Serviço Externa', 'Lavanderia/área de serviço separada', 'positive', 0.0100, 0.0800, -0.0400, 59, true, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'casa', 'a0000000-0000-0000-0000-000000000001'),
  ('a6cf5d07-00b8-4157-9ba0-065a578b689b', 'E', 'Funcionalidade / Layout', 'poco_artesiano', 'Poço Artesiano', 'Sistema de água próprio', 'positive', 0.0100, 0.0800, -0.0400, 60, false, '2025-12-11 19:39:22.670078+00', '2026-05-20 19:13:29.292348+00', 'casa', 'a0000000-0000-0000-0000-000000000001'),
  ('bc60578e-ba1b-434b-8b9c-252c0ca6c5f6', 'E', 'Funcionalidade / Layout', 'edicula_caseiro', 'Edícula/Casa Caseiro', 'Dependência separada para funcionários', 'positive', 0.0300, 0.0800, -0.0400, 61, true, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'casa', 'a0000000-0000-0000-0000-000000000001'),
  ('692ca3de-7018-42a0-8cf7-1cec4ecc9565', 'A', 'Posição / Vista / Luz', 'andar_alto_12', 'Andar Alto (>12º)', 'Apartamento acima do 12º andar com vista ampla', 'positive', 0.0400, 0.1200, -0.1200, 62, false, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'apartamento', 'a0000000-0000-0000-0000-000000000001'),
  ('5cbe0789-564b-4d61-bcc5-1ff1b709f1b3', 'A', 'Posição / Vista / Luz', 'ultimo_andar_sem_cob', 'Último Andar (s/ Cobertura)', 'Último andar do prédio (não cobertura)', 'positive', 0.0200, 0.1200, -0.1200, 64, false, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'apartamento', 'a0000000-0000-0000-0000-000000000001'),
  ('3172020c-967d-4325-88b9-b86a4b63d38b', 'A', 'Posição / Vista / Luz', 'andar_terreo_garden', 'Térreo Acessível/Garden', 'Garden com área externa privativa', 'positive', 0.0100, 0.1200, -0.1200, 65, false, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'apartamento', 'a0000000-0000-0000-0000-000000000001'),
  ('da7a0408-a6c3-42ac-9246-7d6a50e79495', 'E', 'Funcionalidade / Layout', 'closet_suite', 'Closet na Suíte', 'Suíte master com closet', 'positive', 0.0100, 0.0400, -0.0400, 68, true, '2025-12-11 19:39:22.670078+00', '2026-02-09 20:34:19.911329+00', 'apartamento', 'a0000000-0000-0000-0000-000000000001'),
  ('149ca951-d5f7-432f-b7e7-a16d7b49113a', 'E', 'Funcionalidade / Layout', 'dependencia_empregada', 'Dependência Completa', 'Quarto e banheiro de serviço', 'positive', 0.0100, 0.0400, -0.0400, 69, true, '2025-12-11 19:39:22.670078+00', '2026-05-20 19:05:35.641307+00', 'apartamento', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  category_name = EXCLUDED.category_name,
  char_code = EXCLUDED.char_code,
  char_name = EXCLUDED.char_name,
  char_description = EXCLUDED.char_description,
  char_type = EXCLUDED.char_type,
  weight_value = EXCLUDED.weight_value,
  category_cap_max = EXCLUDED.category_cap_max,
  category_cap_min = EXCLUDED.category_cap_min,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  applies_to = EXCLUDED.applies_to,
  organization_id = EXCLUDED.organization_id,
  updated_at = now();

INSERT INTO public.valuation_documentation_factors
  (id, status_code, status_name, factor, adjustment, severity, action_required, description, display_order, is_active, created_at, organization_id)
VALUES
  ('08db3014-5efe-4c4c-93d4-d47b68c61f30', 'pendente_avaliacao', 'Documentação Pendente de Avaliação', 1.0000, 0.0000, 'yellow', 'proceed_with_caution', 'Documentação ainda não foi analisada completamente', 0, true, '2025-12-07 16:45:01.838646+00', 'a0000000-0000-0000-0000-000000000001'),
  ('5a10c376-2598-45ec-86cc-ae6c87a3475e', 'ok', 'Documentação Regular (OK)', 1.0000, 0.0000, 'green', 'proceed', 'Todos os documentos em ordem', 1, true, '2025-12-04 16:20:53.753478+00', 'a0000000-0000-0000-0000-000000000001'),
  ('0db9470f-a98a-45d0-83e7-34d79d2e0f4a', 'pequena_pendencia_iptu', 'Pequena Pendência IPTU', 0.9900, -0.0500, 'yellow', 'alert', 'Débito de IPTU que pode ser negociado', 2, true, '2025-12-04 16:20:53.753478+00', 'a0000000-0000-0000-0000-000000000001'),
  ('014c35bc-7a7f-416d-968c-48d16f1f5f11', 'pendencia_condominio', 'Débito Condomínio', 0.9900, -0.1000, 'yellow_high', 'recommend_regularize', 'Cotas condominiais em atraso', 3, true, '2025-12-04 16:20:53.753478+00', 'a0000000-0000-0000-0000-000000000001'),
  ('0bc02184-1df5-440f-abc5-82eaa9ab3c28', 'restricao_usufruto', 'Restrição Usufruto', 0.8500, -0.1500, 'red', 'legal_analysis', 'Usufruto ou outra restrição registrada', 4, true, '2025-12-04 16:20:53.753478+00', 'a0000000-0000-0000-0000-000000000001'),
  ('bd05b794-6c3c-4829-89db-e562587e9964', 'grave_penhora', 'Grave (Penhora/Inventário)', 0.7500, -0.2500, 'red_critical', 'block_with_warning', 'Penhora judicial ou inventário pendente', 5, true, '2025-12-04 16:20:53.753478+00', 'a0000000-0000-0000-0000-000000000001'),
  ('2743d7f7-5cb8-4a76-a1f5-c438e12fd005', 'incompleta', 'Documentação Incompleta', NULL, NULL, 'blocked', 'block_evaluation', 'Faltam documentos essenciais para avaliação', 6, true, '2025-12-04 16:20:53.753478+00', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET
  status_code = EXCLUDED.status_code,
  status_name = EXCLUDED.status_name,
  factor = EXCLUDED.factor,
  adjustment = EXCLUDED.adjustment,
  severity = EXCLUDED.severity,
  action_required = EXCLUDED.action_required,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  organization_id = EXCLUDED.organization_id;
