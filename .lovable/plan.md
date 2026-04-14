

## Plano: Adicionar badges explicativos a cada botão do painel Admin

### O que cada botão faz (referência)

| Botão | Fonte de dados | O que faz | Resultado visível |
|-------|---------------|-----------|-------------------|
| **Ingestão IPTU** | ArcGIS Prefeitura RJ | Puxa resumos de logradouros (tipologia, total imóveis, área) da camada IPTU | Preenche card "IPTU Logradouros" |
| **Ingestão Lotes** | ArcGIS GeoPAL | Baixa polígonos de lotes (terrenos) da Barra da Tijuca | Preenche card "Lotes PAL", habilita camada de lotes no mapa |
| **Ingestão Edificações** | ArcGIS Edificações 2019 | Importa contornos de edificações com altura, andares e tipo | Preenche card "Edificações" |
| **Rodar Algoritmo** | Dados já ingeridos (ITBI + IPTU + edificações) | Cruza fontes para identificar condomínios, calcular preço médio/m², torres e unidades | Atualiza cards "Condomínios", "Com ITBI", "Com Logradouro" |
| **Geocodificar ITBI** | Google Geocoding API | Adiciona lat/lng às transações ITBI sem coordenadas | Transações passam a aparecer no mapa |
| **Enriquecer Logradouros** | Google Geocoding API | Geocodifica nomes de ruas que não têm coordenadas em `logradouros_geo` | Ruas ganham posição no mapa |
| **Enriquecer Condomínios** | Google Places API (New) | Busca place_id, coordenadas e endereço formatado para condomínios | Condomínios ganham marcador preciso no mapa |
| **Enriquecer Detalhes** | Google Places API (New) | Busca tipos, rating, fotos e resumo editorial para condomínios com place_id | Ficha do condomínio exibe dados do Google |
| **Exportar CSV** | Base local | Exporta todos os condomínios ativos para arquivo CSV | Download do arquivo |
| **Upload Residencial / Não Residencial** | CSV do usuário | Importa dados IPTU 2025 para tabela de staging | Atualiza contagem de registros |
| **Processar IPTU 2025** | Tabela de staging | Cruza IPTU 2025 com condomínios (área média, divergências) | Exibe cards de resultado |
| **Limpar** | — | Apaga registros da tabela de staging | Zera contagem |

### Implementação

**Arquivo:** `src/components/territorial/TerritorialAdmin.tsx`

1. Adicionar campo `badge` ao array `ACTIONS` com texto curto da categoria (ex: "ArcGIS", "Google API", "Local").
2. Renderizar um `<Badge>` pequeno abaixo ou ao lado de cada botão com o texto da categoria.
3. Expandir os tooltips existentes para incluir a descrição do resultado esperado (já parcialmente presentes).

**Arquivo:** `src/components/territorial/IPTU2025Upload.tsx`

4. Adicionar badges similares aos botões de Upload ("CSV → Staging"), Processar ("RPC") e Limpar ("Reset").

### Categorias dos badges

- `ArcGIS` — Ingestão IPTU, Lotes, Edificações
- `Algoritmo` — Rodar Algoritmo
- `Google API` — Geocodificar ITBI, Enriquecer Logradouros, Enriquecer Condomínios, Enriquecer Detalhes
- `Export` — Exportar CSV
- `CSV → Staging` — Upload Residencial / Não Residencial
- `RPC` — Processar IPTU 2025
- `Reset` — Limpar

Cada badge usará cor distinta (verde para ArcGIS, azul para Google API, roxo para Algoritmo, cinza para Export/Reset, amarelo para Staging, etc.) e os tooltips serão expandidos com a descrição do resultado.

