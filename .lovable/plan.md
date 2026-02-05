
# Sistema de Rate Limiting Persistente com PostgreSQL

## Resumo

Implementar um sistema robusto de rate limiting usando PostgreSQL como armazenamento persistente, garantindo proteção contínua contra abusos mesmo após cold starts das Edge Functions.

## Problema Atual

O `lead-operations` já possui rate limiting, mas usa um `Map()` em memória que é perdido quando a função reinicia (cold start). Isso significa que atacantes podem contornar os limites simplesmente esperando o cache expirar ou forçando novos deploys.

---

## Arquitetura da Solução

```text
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  Edge Function  │────▶│  check_rate_limit│────▶│  rate_limit_log    │
│  (qualquer)     │     │  (RPC function)  │     │  (tabela Postgres) │
└─────────────────┘     └──────────────────┘     └────────────────────┘
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         │              │  Retorna:        │
         │              │  - allowed: bool │
         │              │  - remaining: int│
         │              │  - reset_at: ts  │
         │              └──────────────────┘
         ▼
  ┌─────────────────────────────────────────┐
  │  Se allowed=false → HTTP 429 Too Many   │
  │  Se allowed=true  → Processa requisição │
  └─────────────────────────────────────────┘
```

---

## Implementação

### 1. Criar tabela de logs de rate limiting

```sql
CREATE TABLE public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,        -- IP, email ou função
  function_name TEXT NOT NULL,     -- Nome da Edge Function
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(identifier, function_name, window_start)
);

-- Índice para buscas rápidas
CREATE INDEX idx_rate_limit_lookup 
  ON rate_limit_log(identifier, function_name, window_start);

-- Cleanup automático (registros > 24h)
CREATE INDEX idx_rate_limit_cleanup ON rate_limit_log(window_start);
```

### 2. Criar função RPC para verificar/incrementar limites

```sql
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_function_name TEXT,
  p_window_seconds INTEGER DEFAULT 60,
  p_max_requests INTEGER DEFAULT 10
)
RETURNS TABLE(
  allowed BOOLEAN,
  current_count INTEGER,
  remaining INTEGER,
  reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  -- Calcular início da janela atual (arredondado)
  v_window_start := date_trunc('minute', now()) 
    - (EXTRACT(MINUTE FROM now())::INTEGER % (p_window_seconds / 60)) * INTERVAL '1 minute';
  
  -- Para janelas menores que 1 minuto, usar segundos
  IF p_window_seconds < 60 THEN
    v_window_start := date_trunc('second', now()) 
      - (EXTRACT(SECOND FROM now())::INTEGER % p_window_seconds) * INTERVAL '1 second';
  END IF;

  -- Inserir ou incrementar contador (upsert atômico)
  INSERT INTO rate_limit_log (identifier, function_name, window_start, request_count)
  VALUES (p_identifier, p_function_name, v_window_start, 1)
  ON CONFLICT (identifier, function_name, window_start)
  DO UPDATE SET request_count = rate_limit_log.request_count + 1
  RETURNING request_count INTO v_count;

  -- Retornar resultado
  RETURN QUERY SELECT
    v_count <= p_max_requests AS allowed,
    v_count AS current_count,
    GREATEST(0, p_max_requests - v_count) AS remaining,
    v_window_start + (p_window_seconds || ' seconds')::INTERVAL AS reset_at;
END;
$$;
```

### 3. Criar função de limpeza automática

```sql
CREATE OR REPLACE FUNCTION cleanup_rate_limit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limit_log
  WHERE window_start < now() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
```

### 4. Criar módulo helper compartilhado

**Novo arquivo:** `supabase/functions/_shared/rate-limiter.ts`

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitConfig {
  windowSeconds?: number;  // Janela de tempo (padrão: 60s)
  maxRequests?: number;    // Máximo de requisições (padrão: 10)
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  remaining: number;
  resetAt: Date;
}

export function getClientIdentifier(req: Request): string {
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  const realIp = req.headers.get("x-real-ip");
  const forwardedFor = req.headers.get("x-forwarded-for");
  
  return cfConnectingIp || realIp || forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  identifier: string,
  functionName: string,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const { windowSeconds = 60, maxRequests = 10 } = config;

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_identifier: identifier,
    p_function_name: functionName,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });

  if (error) {
    console.error("[rate-limiter] Database error:", error);
    // Fail-open: permitir em caso de erro do banco
    return { allowed: true, currentCount: 0, remaining: maxRequests, resetAt: new Date() };
  }

  const result = data?.[0] || data;
  return {
    allowed: result?.allowed ?? true,
    currentCount: result?.current_count ?? 0,
    remaining: result?.remaining ?? maxRequests,
    resetAt: new Date(result?.reset_at || Date.now()),
  };
}

export function rateLimitHeaders(result: RateLimitResult, maxRequests: number): Record<string, string> {
  return {
    "X-RateLimit-Limit": maxRequests.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt.getTime() / 1000).toString(),
  };
}

export function rateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>): Response {
  const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        ...corsHeaders,
      },
    }
  );
}
```

### 5. Atualizar Edge Functions existentes

**Exemplo:** Atualizar `lead-operations/index.ts` para usar o novo sistema:

```typescript
import { checkRateLimit, getClientIdentifier, rateLimitResponse, rateLimitHeaders } from "../_shared/rate-limiter.ts";

// Dentro do handler:
const clientIp = getClientIdentifier(req);
const rateLimit = await checkRateLimit(supabase, clientIp, "lead-operations", {
  windowSeconds: 60,
  maxRequests: 5,
});

if (!rateLimit.allowed) {
  return rateLimitResponse(rateLimit, corsHeaders);
}

// Adicionar headers de rate limit nas respostas
const headers = { ...corsHeaders, ...rateLimitHeaders(rateLimit, 5) };
```

### 6. Configurar limpeza periódica (cron job)

Adicionar chamada à função `cleanup_rate_limit_logs()` no cron existente (`sync-itbi-daily`) ou criar um novo job para executar diariamente.

---

## Edge Functions a Proteger

| Função | Limite Sugerido | Janela |
|--------|-----------------|--------|
| `lead-operations` | 5 req | 1 min |
| `public-itbi-stats` | 20 req | 1 min |
| `public-bairro-suggestions` | 30 req | 1 min |
| `chat-mercado` | 10 req | 1 min |
| `elevenlabs-tts` | 5 req | 1 min |
| `send-lead-notification` | 3 req | 1 min |

---

## Detalhes Técnicos

### Vantagens da Abordagem
- **Persistente**: Sobrevive a cold starts e redeployments
- **Atômico**: `INSERT ... ON CONFLICT DO UPDATE` garante contagem precisa
- **Distribuído**: Funciona mesmo com múltiplas instâncias da função
- **Configurável**: Limites por função e janela flexíveis
- **Fail-open**: Em caso de erro do banco, permite a requisição (evita downtime)

### RLS Policy
```sql
-- Apenas service_role pode acessar
CREATE POLICY "service_role_only" ON rate_limit_log
  FOR ALL TO service_role USING (true);

-- Nenhum acesso para usuários normais
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;
```

---

## Arquivos a Criar/Modificar

1. **Nova tabela**: `rate_limit_log` (via migration)
2. **Nova função RPC**: `check_rate_limit`
3. **Novo helper**: `supabase/functions/_shared/rate-limiter.ts`
4. **Atualizar**: 
   - `lead-operations/index.ts`
   - `public-itbi-stats/index.ts`
   - `public-bairro-suggestions/index.ts`
   - `chat-mercado/index.ts`
   - `elevenlabs-tts/index.ts`
   - `send-lead-notification/index.ts`
