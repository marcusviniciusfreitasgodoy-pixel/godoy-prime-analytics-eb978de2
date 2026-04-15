

# Análise dos Botões de Enriquecimento e Proposta de Consolidação

## Inventário Atual — Onde cada botão está e o que faz

```text
┌──────────────────────────────────────────────────────────────────────┐
│ LOCALIZAÇÃO 1: Aba "Admin" (TerritorialAdmin.tsx)                   │
│ 8 botões de ação + 1 export + 1 seção especial                     │
├──────────────────────────────────────────────────────────────────────┤
│ ArcGIS (3):                                                         │
│  • Ingestão IPTU          → ingest-iptu-prefeitura                  │
│  • Ingestão Lotes         → ingest-lotes-pal                        │
│  • Ingestão Edificações   → ingest-edificacoes-geo                  │
│                                                                      │
│ Algoritmo (1):                                                       │
│  • Rodar Algoritmo        → process-condominios-algorithm           │
│                                                                      │
│ Google API (4):                                                      │
│  • Geocodificar ITBI      → geocodificar-itbi-transactions          │
│  • Enriquecer Logradouros → enrich-logradouros-geo                  │
│  • Enriquecer Condos (Places) → enrich-condominios                  │
│  • Enriquecer Detalhes    → enrich-places-details                   │
│                                                                      │
│ Outros:                                                              │
│  • Exportar CSV                                                      │
│  • Upload IPTU 2025 (seção)                                          │
│  • Resolver Endereços Pendentes (geocodificação reversa)             │
├──────────────────────────────────────────────────────────────────────┤
│ LOCALIZAÇÃO 2: Aba "Enriquecimento IA" (InteligenciaTerritorial)    │
│  • Classificação IA       → enrich-condominios-ai (Gemini)          │
│  • Atualizar Logradouros  → fuzzy match + SQL manual                │
│  • Importar              → CSV / texto paste                         │
├──────────────────────────────────────────────────────────────────────┤
│ LOCALIZAÇÃO 3: Página "Configurações" (Configuracoes.tsx)           │
│  • Merge CSV Condomínios  → merge-condominios                       │
│  • Enriquecer Dados       → enrich-condominios (DUPLICADO do Admin) │
└──────────────────────────────────────────────────────────────────────┘
```

## Problemas Identificados

1. **Duplicação**: "Enriquecer Condomínios (Google Places)" aparece na aba Admin **e** na página Configurações — mesma Edge Function
2. **Fragmentação**: 13 botões espalhados em 3 lugares, sem ordem lógica de execução
3. **Sem sequência clara**: Um admin novo não sabe em que ordem rodar os processos
4. **Merge CSV** na página Configurações está deslocado — é tarefa de dados, não de configuração
5. **Aba "Enriquecimento IA"** mistura tarefas de importação (CSV) com IA e logradouros — o nome não reflete o conteúdo

## Proposta: Reorganização em 3 Grupos Lógicos com Sequência

Consolidar tudo na aba **Admin** do módulo Territorial, organizado em 3 seções com numeração de etapas:

```text
┌──────────────────────────────────────────────────────────────────┐
│ ABA ADMIN TERRITORIAL (reorganizada)                             │
│                                                                  │
│ ▼ SEÇÃO 1 — INGESTÃO (fontes externas → banco)                   │
│   ① Upload IPTU 2025                                             │
│   ② Ingestão IPTU (ArcGIS)                                      │
│   ③ Ingestão Lotes (ArcGIS)                                     │
│   ④ Ingestão Edificações (ArcGIS)                                │
│   ⑤ Importar Condomínios (CSV/texto) ← vem da aba Enriq. IA     │
│   ⑥ Merge CSV Condomínios ← vem de Configurações                │
│                                                                  │
│ ▼ SEÇÃO 2 — PROCESSAMENTO (cruzamentos + geocodificação)         │
│   ⑦ Rodar Algoritmo (PAL)                                       │
│   ⑧ Geocodificar ITBI (Google)                                  │
│   ⑨ Enriquecer Condomínios (Google Places)                       │
│   ⑩ Resolver Endereços Pendentes (reverse geocode)               │
│   ⑪ Enriquecer Logradouros (Google Geocoding)                    │
│                                                                  │
│ ▼ SEÇÃO 3 — QUALIDADE (refinamento + IA)                         │
│   ⑫ Classificação IA (Gemini) ← vem da aba Enriq. IA            │
│   ⑬ Enriquecer Detalhes (Places Details)                         │
│   ⑭ Atualizar Logradouros (fuzzy match) ← vem da aba Enriq. IA  │
│   ⑮ Pipeline Correção Geo (NOVO — plano aprovado anteriormente)  │
│                                                                  │
│ ─── Cards de cobertura (já existentes) ───                       │
│ ─── Tabela ETL Logs (já existente) ───                           │
│ ─── Exportar CSV (já existente) ───                              │
└──────────────────────────────────────────────────────────────────┘
```

## Mudanças Concretas

| Ação | Detalhe |
|------|---------|
| **Mover** Importar, Classificação IA e Atualizar Logradouros | Da aba "Enriquecimento IA" → para dentro da aba Admin (seções 1 e 3) |
| **Remover** aba "Enriquecimento IA" | Fica vazia após a migração — eliminar a tab |
| **Mover** Merge CSV e Enriquecer Dados | De Configurações → seções 1 e 2 do Admin |
| **Remover** `EnrichCondominiosButton` de Configurações | Já existe em Admin; elimina duplicação |
| **Agrupar** botões em 3 Collapsible/Accordion | Ingestão, Processamento, Qualidade |
| **Adicionar** botão "Pipeline Correção Geo" | Executa as 3 migrations SQL do plano anterior em sequência |
| **Numerar** visualmente cada etapa | Para guiar a ordem de execução |

## Resultado Esperado

- **1 lugar centralizado** para todas as operações de dados (aba Admin)
- **Sequência numerada** que guia o admin na ordem correta
- **Zero duplicação** de botões
- Página Configurações volta a ter apenas configurações da empresa/usuário
- Aba "Enriquecimento IA" eliminada (conteúdo absorvido)

## Arquivos a Alterar

| Arquivo | O que muda |
|---------|-----------|
| `src/components/territorial/TerritorialAdmin.tsx` | Reorganizar em 3 seções accordion; absorver ImportarCondominios, EnriquecerCondominios (IA), AtualizarLogradouros; adicionar Pipeline Correção Geo |
| `src/pages/InteligenciaTerritorial.tsx` | Remover aba "Enriquecimento IA" e suas sub-tabs |
| `src/pages/Configuracoes.tsx` | Remover MergeCondominiosButton e EnrichCondominiosButton |
| `supabase/functions/geo-logradouro/index.ts` | Aplicar correção de centroide e fallback (plano anterior) |
| Migration SQL | 3 migrations do plano anterior (GOOGLE→CONDOMINIO, aliases ITBI, limpeza) |

