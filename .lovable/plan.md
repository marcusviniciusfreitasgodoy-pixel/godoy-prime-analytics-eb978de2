
## Corrigir bug do bucket privado `documentos-proposta`

### Problema

A funcao `uploadCNH` em `src/hooks/usePropostas.ts` usa `getPublicUrl()` para obter a URL do arquivo apos upload. Como o bucket `documentos-proposta` e **privado**, essa URL retorna 403 -- o arquivo e salvo com sucesso mas a URL armazenada em `cnh_url` na tabela `propostas_compra` nao funciona.

### Solucao

Substituir `getPublicUrl()` por `createSignedUrl()` com TTL de 60 minutos (3600 segundos). Alem disso, como a URL assinada expira, e necessario tambem criar uma funcao auxiliar para gerar novas URLs assinadas sob demanda quando alguem precisar visualizar o documento.

### Alteracoes

**Arquivo: `src/hooks/usePropostas.ts`**

1. Na funcao `uploadCNH` (linhas 58-61), substituir:

```typescript
// ANTES (bugado)
const { data: urlData } = supabase.storage
  .from("documentos-proposta")
  .getPublicUrl(path);
return urlData.publicUrl;
```

Por:

```typescript
// DEPOIS (corrigido)
const { data: urlData, error: urlError } = await supabase.storage
  .from("documentos-proposta")
  .createSignedUrl(path, 3600); // 60 minutos
if (urlError || !urlData?.signedUrl) throw urlError || new Error("Falha ao gerar URL assinada");
return urlData.signedUrl;
```

2. Adicionar uma funcao `getSignedCNHUrl` ao hook para permitir que outras partes do sistema regenerem URLs assinadas quando necessario (ex: admin visualizando a CNH depois de expirada):

```typescript
const getSignedCNHUrl = async (path: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from("documentos-proposta")
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw error || new Error("Falha ao gerar URL");
  return data.signedUrl;
};
```

3. Exportar `getSignedCNHUrl` no retorno do hook.

### Observacao importante

O valor salvo em `cnh_url` no banco sera uma URL assinada que expira em 60 minutos. Para visualizacoes futuras (ex: admin abrindo proposta dias depois), o front-end devera chamar `getSignedCNHUrl` com o `path` extraido da URL original, ou armazenar apenas o `path` relativo no banco ao inves da URL completa. A abordagem mais robusta e salvar o **path relativo** (`{codigo}/cnh-{timestamp}.{ext}`) no banco e gerar a URL assinada sob demanda na hora da exibicao.

### Resumo das mudancas

- `src/hooks/usePropostas.ts`: trocar `getPublicUrl` por `createSignedUrl`, salvar path relativo no banco, adicionar funcao `getSignedCNHUrl`
- `src/components/visitas/ProposalForm.tsx`: ajustar para salvar o path relativo em `cnh_url` ao inves da URL completa
