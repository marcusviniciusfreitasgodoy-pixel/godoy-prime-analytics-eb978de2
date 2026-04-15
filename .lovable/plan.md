

## Plano: Relatório PDF Executivo — Casas na Barra da Tijuca

### Dados coletados

**Resumo geral (últimos 12 meses):**
- 60 registros agregados representando ~138 transações reais
- Preço médio ponderado: ~R$ 8.206/m²
- Área média: ~468 m²
- Evolução 2020→2026: R$ 6.524 → R$ 8.456/m² (CAGR ~4,4%)

**Ranking por logradouro** (top 10 por volume): Av. das Américas (15 trans), Av. Lúcio Costa (14), Rua Ivaldo de Azambuja (7), etc.

**Faixas de preço**: 5 faixas de < R$ 6k a > R$ 12k/m² com distribuição de transações.

### O que será gerado

Um PDF executivo de ~4 páginas com branding Godoy Prime (Navy/Gold), contendo:

1. **Capa** — Título, data, logo
2. **Resumo Executivo** — KPIs (preço médio, liquidez, área média, valorização anual)
3. **Ranking por Logradouro** — Tabela com top 15 ruas: preço/m², transações, área média, faixa min-max
4. **Distribuição por Faixa de Preço** — Tabela com 5 faixas, volume e área média
5. **Evolução Histórica** — Tabela 2020-2026 com preço médio, transações e variação anual
6. **Metodologia e Disclaimers** — Fontes, filtros aplicados

### Implementação

- Script Python com `reportlab` salvo em `/tmp/`, output em `/mnt/documents/relatorio_casas_barra.pdf`
- Cores da marca: Navy `#0C2340`, Gold `#D4AF37`
- Dados hardcoded no script a partir das consultas já realizadas
- QA visual obrigatório após geração

