

## Plano: Ficha de Visita pública para o cliente

### Problema
O link da ficha completa enviado por WhatsApp (`/visitas/ficha/:id`) aponta para uma rota protegida que exige login. O visitante não tem cadastro no sistema.

### Solução
Criar uma página pública que exibe a ficha de visita com dados seguros (sem PII sensível), acessível pelo código da visita — seguindo o mesmo padrão das páginas públicas de assinatura e feedback.

### Alterações

#### 1. Nova RPC no banco de dados
Criar função `get_ficha_publica(p_codigo text)` que retorna campos seguros para visualização pública: código, endereço, data, nome do corretor, condomínio, unidade, código do imóvel, valor, nome do visitante, nome do proprietário, observações, status, assinaturas (indicador se existem).

#### 2. Nova página pública
**Novo arquivo:** `src/pages/FichaVisitaPublica.tsx`
- Busca a ficha via RPC `get_ficha_publica` pelo código da URL
- Exibe os dados em cards organizados (imóvel, visita, corretor, observações)
- Mostra indicadores de assinatura (se já foram coletadas)
- Links para feedback e assinatura
- Layout limpo sem sidebar/header do sistema

#### 3. Nova rota pública no App.tsx
Adicionar rota `/visitas/ficha-publica/:codigo` fora do `ProtectedRoute`, junto das demais rotas públicas (feedback, assinatura).

#### 4. Atualizar link no WhatsApp
**Arquivo:** `src/utils/whatsappService.ts`
- Alterar `link_ficha` de `/visitas/ficha/${ficha.id}` para `/visitas/ficha-publica/${ficha.codigo}`

### Detalhes técnicos

**Migration SQL:**
```sql
CREATE OR REPLACE FUNCTION public.get_ficha_publica(p_codigo text)
RETURNS TABLE (
  codigo text, endereco_imovel text, data_visita timestamptz,
  nome_corretor text, condominio_edificio text, unidade_imovel text,
  codigo_imovel text, valor_imovel numeric, nome_visitante text,
  nome_proprietario text, observacoes text, status status_visita,
  tem_assinatura_visitante boolean, tem_assinatura_corretor boolean
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT codigo, endereco_imovel, data_visita, nome_corretor,
    condominio_edificio, unidade_imovel, codigo_imovel, valor_imovel,
    nome_visitante, nome_proprietario, observacoes, status,
    (assinatura_visitante IS NOT NULL) as tem_assinatura_visitante,
    (assinatura_corretor IS NOT NULL) as tem_assinatura_corretor
  FROM fichas_visita WHERE codigo = p_codigo;
$$;
```

### Arquivos afetados
- Migration SQL (nova RPC)
- `src/pages/FichaVisitaPublica.tsx` (novo)
- `src/App.tsx` (nova rota pública)
- `src/utils/whatsappService.ts` (atualizar link)

