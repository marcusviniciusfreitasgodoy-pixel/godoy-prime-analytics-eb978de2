## Objetivo
Consolidar todo o conteúdo do handoff da **Autorização de Captação** em **um único arquivo Markdown navegável**, entregue solto em `/mnt/documents/` (sem precisar abrir o ZIP).

## Entregável
- **`Handoff-Autorizacao-Captacao-v2.md`** — arquivo único, ~40–60 KB, totalmente em pt-BR.

## Estrutura do arquivo

```text
# Handoff Técnico — Autorização de Captação (v2)
> Sumário executivo + índice clicável (anchors)

## 1. Visão de Produto
## 2. Fluxo de Negócio        (com diagramas Mermaid embutidos)
## 3. Modelo de Dados          (DDL completo em bloco ```sql)
## 4. Regras de Validação
## 5. Geração de PDF
## 6. API / Contratos          (OpenAPI 3 em bloco ```yaml + exemplos JSON)
## 7. Página Pública de Assinatura
## 8. Integrações (E-mail / WhatsApp)
## 9. Auditoria e Eventos
## 10. Casos de Teste
## Anexo A — Fluxo Visual (10 screenshots referenciados)
## Anexo B — Políticas RLS
## Anexo C — Diagramas Mermaid (fluxo + máquina de estados)
```

## Como será produzido
1. Ler os 10 `.md` + `README.md` + `schema.sql` + `openapi.yaml` + `.mmd` já existentes em `/mnt/documents/handoff-autorizacao-captacao-v2.zip`.
2. Concatenar em um único `.md` com:
   - Cabeçalho com metadados (versão, data, autor).
   - Sumário com links âncora (`[Seção 3](#3-modelo-de-dados)`).
   - Blocos de código com syntax highlight (`sql`, `yaml`, `json`, `mermaid`).
   - Referências aos 10 screenshots como `![Passo 5](./assets/screenshots/01-botao-passo5.png)` (caminhos relativos compatíveis com o ZIP).
3. Validar: contagem de linhas, presença de todas as 10 seções, blocos Mermaid válidos.
4. Entregar via `<lov-artifact>`.

## Premissas
- Os screenshots **continuam dentro do ZIP** — o `.md` solto referencia-os por caminho relativo. Quem quiser ver as imagens inline precisa extrair o ZIP no mesmo diretório do `.md`.
- Conteúdo idêntico ao PDF/DOCX v2 (sem novas informações) — apenas formato diferente.

## Tempo estimado
~1–2 minutos.
