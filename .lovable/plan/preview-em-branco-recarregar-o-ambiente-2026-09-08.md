# Preview em branco: recarregar o ambiente

## O que está acontecendo

O servidor do preview respondeu normalmente (código 200), mas ele foi reiniciado há pouco por causa de uma mudança em configuração e, durante o reinício, dois pacotes internos (a biblioteca de navegação entre páginas e a de carregamento de dados) ficaram apontando para arquivos temporários antigos. Isso deixa a tela em branco no navegador, mesmo com o servidor no ar.

Na nova verificação, esses arquivos já voltaram a carregar corretamente. Ou seja, o problema é de cache no seu navegador/aba do preview.

O endereço público (analytics.godoyprime.com.br) respondeu normalmente. O endereço lovable.app respondeu com um redirecionamento, o que é esperado quando o domínio próprio está ativo.

## O que farei

1. Limpar o cache temporário de dependências do ambiente e reiniciar o servidor do preview, para eliminar qualquer resíduo do reinício anterior.
2. Abrir a página inicial em um navegador de teste e confirmar que ela carrega, capturando a tela e os erros do console.
3. Se algum erro aparecer, corrigi-lo e repetir a verificação.

## Do seu lado

Depois disso, recarregue o preview com Ctrl+Shift+R (ou Cmd+Shift+R no Mac) para descartar o cache da sua aba.

## Detalhes técnicos

- Remover `node_modules/.vite` e matar o processo `vite` (o supervisor reinicia sozinho), aguardando a porta 8080 responder.
- Validar com Playwright em `http://localhost:8080/`, checando console e requisições com falha.
- Nenhuma mudança de código está prevista, a menos que a verificação revele um erro real.
