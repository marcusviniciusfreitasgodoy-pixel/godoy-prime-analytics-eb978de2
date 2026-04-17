

## Plano: Pesquisa v3 — Detalhamento Completo + Uso Atual + Identificação Mínima

### Mudanças vs v2

| Item | v2 (atual) | v3 (novo) |
|---|---|---|
| Profundidade | Resumido (1 linha) | **Completo** (descrição + exemplo prático + benefício) |
| Escala | Alta / Média / Baixa | **Uso atual (Sim/Não)** + **Relevância (Alta/Média/Baixa)** |
| Identificação | Anônima | **Mínima** (nome da imobiliária + cargo) |
| "Dor que resolve" | Mantida | Mantida (já cumpre parte do detalhamento) |

### Estrutura nova de cada item

Cada **funcionalidade** vira um bloco com 3 linhas curtas + 1 tabela de marcação:

> **Nome da funcionalidade**
> *Dor que resolve:* [texto curto]
> *Como funciona:* [1-2 linhas explicando o fluxo prático na plataforma]
> *Benefício esperado:* [1 linha de ganho concreto — tempo, conversão, segurança jurídica, etc.]
>
> | Já uso hoje? | Relevância para meu dia a dia |
> |---|---|
> | ☐ Sim · ☐ Não | ☐ Alta · ☐ Média · ☐ Baixa |

Mesmo padrão (mais enxuto) para **informações geradas** — descrição de 1 linha + tabela de marcação.

### Nova seção de Identificação (no início)

Bloco "Identificação da Imobiliária" antes do conteúdo:
- Nome da imobiliária: ____________________
- Cargo do respondente: ____________________
- (Opcional) Nº de corretores: ___ · Bairros de atuação: ___________

### Módulos cobertos (mesmos 21 da v2)

Painel Analítico · Microrregiões · Inteligência Territorial · Pesquisas de Mercado · Motor de Avaliação · Histórico de Avaliações · Vistoria Digital · Histórico de Vistorias · Estratégia de Precificação · Análise de Documentação IA · Documentação Comprador/Vendedor · Histórico de Documentos · Gestão de Visitas · Feedback de Visitas · Propostas Digitais · Pipeline CRM · Gestão de Leads · Sofia IA · Avaliação Pública · Configurações & Branding · Manual/Onboarding/Tour

### Seção final (mantida)

Funcionalidades ausentes (10 linhas) · 3 módulos essenciais · 3 módulos menos usados · comentários gerais (10 linhas).

### Visual

- A4, margens 2 cm, fonte Helvetica/Arial
- Navy `#0C2340` em títulos · Gold `#D4AF37` em separadores de módulo
- Cada item em "card" com leve borda inferior cinza para separar visualmente
- Tabelas de marcação compactas (2 colunas, ~3 cm cada)
- **Estimativa: ~30–35 páginas** (significativamente maior que a v2 por causa do detalhamento completo)

### Execução

1. Script Python `/tmp/gerar_pesquisa_v3.py` usando `python-docx`:
   - Estrutura de dados com tuplas `(nome, dor, como_funciona, beneficio)` por funcionalidade
   - Geração DOCX com blocos formatados + tabelas 2x2 de marcação
   - Conversão DOCX → PDF via LibreOffice headless
2. Saída em `/mnt/documents/`:
   - `Pesquisa_Imobiliarias_Godoy_Prime_v3.docx`
   - `Pesquisa_Imobiliarias_Godoy_Prime_v3.pdf`
3. **QA obrigatório:** `pdftoppm` em todas as páginas — verificar quebras de página no meio de cards, alinhamento das tabelas Sim/Não · A/M/B, espaçamento entre módulos.
4. Entrega via `<lov-artifact>` (DOCX + PDF).

