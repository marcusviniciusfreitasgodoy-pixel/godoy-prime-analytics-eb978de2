

## Diagnóstico

**Banco de dados (1.602 condomínios ativos):**
- 1.349 com coordenadas no mapa
- **1.240 sem `preco_medio_m2`** (e sem `total_transacoes_itbi`) → são esses os pontos "vazios" do print
- 1.579 sem `padrao_construtivo`
- 541 sem `unidades_estimadas`
- 422 sem nome/logradouro

A função `enriquecer_condominios_com_itbi` (RPC) já existe e é executada via aba **Admin → "Executar APENAS Enriquecimento ITBI (Spatial Join)"**. Ela cruza `condominios_mapeamento` com `itbi_transactions` por proximidade espacial (150m) e preenche `preco_medio_m2`, `total_transacoes_itbi` e `ultima_transacao_itbi`.

**Heatmap / Lotes:** o código está funcional, mas:
- Heatmap só aparece se houver `condominios` com `latitude/longitude` (existem 1.349). Mas o gradiente começa com `rgba(147,197,253,0)` — o primeiro stop totalmente transparente faz com que pontos com `weight` baixo fiquem invisíveis em zooms afastados. Vou aumentar `opacity` e `radius`, e ajustar o gradiente.
- **Sem tooltips explicativas** nos toggles "Heatmap" e "Lotes" — usuário não entende o que fazem.

## Plano

### 1. Reenriquecer pontos vazios (dados)

Executar a RPC `enriquecer_condominios_com_itbi` em lote completo via Edge Function `process-condominios-algorithm` com `enrich_only: true`. Isso preenche `preco_medio_m2`, `total_transacoes_itbi` e `ultima_transacao_itbi` para os 1.240 pontos sem ITBI usando join espacial (150m).

**Forma de execução:** acionar diretamente via tool `code--exec` chamando a Edge Function com service role após aprovação. Resultado esperado: maioria dos 1.240 pontos passa a exibir preço/transações no popover do mapa.

> **Observação importante:** muitos pontos estão em ruas sem transações ITBI próximas (ex: condomínios em ruas internas como "Avenida Paralela", "Rua Alambique" — séries B16, B19, etc.). Esses **continuarão sem preço** porque não há dado de ITBI no raio de 150m. É comportamento esperado da camada de dados real (ITBI agregado da Prefeitura). O marcador desses casos seguirá com borda tracejada cinza (já implementado em `getMarkerColor`/`hasPrice`), agora com tooltip mais clara.

### 2. Melhorar marcador "sem dados" (UX)

No `TerritorialMap.tsx`, no `mouseenter` de marcadores sem `preco_medio_m2`, mostrar mensagem explícita: *"Sem transações ITBI registradas no raio de 150m nos últimos anos."* — em vez do popover ficar quase vazio.

### 3. Tooltips e correção visual nos toggles Heatmap/Lotes

Em `TerritorialMap.tsx` (rodapé esquerdo do mapa):

| Toggle | Tooltip (HelpCircle ao lado do label) |
|---|---|
| **Heatmap** | "Mapa de calor ponderado pelo número estimado de unidades. Áreas vermelhas/roxas indicam maior densidade construtiva (mais unidades por região). Útil para identificar polos de adensamento na Barra." |
| **Lotes** | "Exibe os contornos dos lotes oficiais (PAL — Projeto de Alinhamento) sobrepostos ao mapa. Disponível apenas a partir do zoom 15. Clique em um lote para ver logradouro e área (m²)." |

**Ajustes no Heatmap para ficar visível:**
- Aumentar `radius` de 35 → 50
- Aumentar `opacity` de 0.7 → 0.85  
- Ajustar gradiente para começar visível: `["rgba(0,0,0,0)", "rgba(147,197,253,0.6)", "#3B82F6", "#1D4ED8", "#7C3AED", "#DC2626"]`
- Garantir `weight` mínimo de 0.2 (em vez de cair para quase 0 quando `unidades_estimadas` é nulo)

### 4. Padrão visual

Mesmo padrão já usado em `Documentacao.tsx`/`Microbairros.tsx`: ícone `HelpCircle` (h-3 w-3, `text-muted-foreground`) ao lado do `Label`, dentro de `Tooltip` do shadcn, envolto em `TooltipProvider`.

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/territorial/TerritorialMap.tsx` | Tooltips nos toggles Heatmap/Lotes + ajuste gradiente/opacity/radius do heatmap + popover melhorado para pontos sem preço |
| (execução) Edge Function `process-condominios-algorithm` com `enrich_only: true` | Enriquecer ITBI em lote para todos os 1.240 pontos pendentes |

