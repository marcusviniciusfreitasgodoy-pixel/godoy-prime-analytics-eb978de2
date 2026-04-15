

## Diagnóstico: Mapa sem dados na Pesquisa de Mercado

### Causa raiz

O mapa só carrega dados quando **duas condições** são verdadeiras simultaneamente:
1. `searchTransactions === true` — o usuário clicou "Buscar" na aba Transações
2. `viewMode === 'map'` — a aba ativa é "Mapa"

Se o usuário navegar diretamente para a aba Mapa sem ter clicado "Buscar" primeiro na aba Transações, o mapa aparece vazio porque a query nunca é disparada.

### Correção proposta

Alterar a lógica de ativação da query do mapa para que ele carregue dados automaticamente ao entrar na aba Mapa, sem exigir que o usuário tenha feito uma busca prévia na aba Transações.

**Arquivo:** `src/pages/PesquisasMercado.tsx`, linha 103

**De:**
```typescript
searchTransactions && viewMode === 'map'
```

**Para:**
```typescript
viewMode === 'map'
```

Isso faz o mapa carregar dados ITBI automaticamente ao selecionar a aba Mapa, usando o bairro e filtros atuais (período, valor, área, tipologia). A experiência fica consistente: o usuário abre o Mapa e já vê os marcadores.

### Impacto
- Nenhum efeito colateral — a query `useTransactionMapData` já tem seu próprio `enabled: !!bairro`
- O filtro interno do mapa (faixa de preço por slider) continua funcionando normalmente sobre os dados carregados

