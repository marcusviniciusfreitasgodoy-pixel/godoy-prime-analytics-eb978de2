# Corrigir a tela branca do site publicado

## O que está acontecendo

O site publicado (analytics.godoyprime.com.br) carrega a página, mas a tela fica em branco. Abrindo em um navegador de teste, o aplicativo para logo no início com o erro "supabaseUrl is required" — ou seja, a versão publicada não sabe o endereço do banco de dados.

O preview funciona porque o arquivo de configuração com esses endereços existe aqui no ambiente de desenvolvimento. Na limpeza recente do repositório esse arquivo passou a ser ignorado e deixou de ir junto na publicação, então a versão publicada sobe sem os dados de conexão e nada é desenhado na tela.

## Correção

1. Voltar a incluir o arquivo de configuração `.env` no repositório (retirar as linhas que o excluem no `.gitignore`, mantendo a exceção para o `.env.example`).
2. Garantir que ele contenha exatamente os três valores já usados no preview: identificador do projeto, endereço do backend e chave pública. São valores públicos, embutidos no aplicativo web — não há chave secreta envolvida.
3. Republicar e conferir no navegador que a tela de entrada aparece e que não há mais o erro de conexão.
4. Como o site é um aplicativo instalável (PWA), pedir um recarregamento forçado após a publicação para descartar a versão antiga guardada no navegador.

## Observações técnicas

- Nada de código de produto muda: `src/integrations/supabase/client.ts` é gerado pela plataforma e lê `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` de `import.meta.env`; sem eles no build, `createClient` lança em tempo de import e o React nunca monta.
- O `.env` deixou de ser rastreado em `dde349d8`; `.gitignore` linhas 16-17 (`.env`, `.env.*`) precisam ser ajustadas para `.env.local` / `.env.*.local` apenas.
- Alternativa, caso prefira não versionar o `.env`: cadastrar as três variáveis `VITE_*` no ambiente de build. Só é viável se o pipeline de publicação permitir variáveis externas; caso contrário, versionar o `.env` é o caminho padrão da plataforma.
- Verificação após publicar: carregar a home em navegador headless e confirmar `#root` com conteúdo e ausência de `pageerror`.
