# Páginas HTML dos documentos

`md2html.py` converte um documento de `docs/` (Markdown com seções numeradas, tabelas, blocos de código, listas e checklists) numa página estática com sumário lateral e a paleta do produto (navy e gold, tema claro e escuro). Usado para publicar a especificação e o relatório final.

```sh
python3 scripts/docs-html/md2html.py docs/especificacao-metodologia-godoy-prime.md scripts/docs-html/cabecalho.html /tmp/especificacao.html
python3 scripts/docs-html/md2html.py docs/relatorio-final-desenvolvedor-2026-09-04.md scripts/docs-html/cabecalho.html /tmp/relatorio.html
```

O documento precisa ter, no primeiro parágrafo, `**Versão X.Y, consolidada (data).**` e, em algum lugar, `após o PR #N`: o conversor lê os dois para montar o cabeçalho. Sem dependências além do Python 3.

Páginas publicadas em 2026-09-04 (privadas, compartilháveis pelo menu da página):

- Especificação v3.0: https://claude.ai/code/artifact/fb9ae801-33c6-47e6-8f26-5021d94d2a45
- Relatório final v1.0: https://claude.ai/code/artifact/2ee5d2bf-1a53-4c15-beff-fc1731a0313b
