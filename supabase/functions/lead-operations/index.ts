import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiting store (resets on function cold start)
// For production, consider using Redis or a database table
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute per IP

function getRateLimitKey(req: Request): string {
  // Get IP from various headers (Cloudflare, Vercel, etc.)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  
  return cfConnectingIp || realIp || forwardedFor?.split(",")[0]?.trim() || "unknown";
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || record.resetAt < now) {
    // First request or window expired - reset
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: record.resetAt - now };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count, resetIn: record.resetAt - now };
}

// Clean up old entries periodically (basic garbage collection)
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore) {
    if (record.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Input validation schemas
const CheckLeadSchema = z.object({
  operation: z.literal("check"),
  email: z.string().email().max(255).transform(s => s.trim().toLowerCase()),
});

const UpdateLeadSchema = z.object({
  operation: z.literal("update"),
  email: z.string().email().max(255).transform(s => s.trim().toLowerCase()),
  nome: z.string().min(2).max(100).optional().transform(s => s?.trim()),
  telefone: z.string().min(10).max(20).optional().transform(s => s?.replace(/\D/g, '')),
  bairro_interesse: z.string().max(100).optional(),
  area_interesse: z.number().positive().max(50000).optional().nullable(),
  valor_interesse: z.number().positive().max(10000000000).optional().nullable(),
  quartos: z.number().int().min(0).max(20).optional().nullable(),
  banheiros: z.number().int().min(0).max(20).optional().nullable(),
  suites: z.number().int().min(0).max(20).optional().nullable(),
  vagas: z.number().int().min(0).max(50).optional().nullable(),
  objetivo: z.string().max(100).optional(),
  urgencia: z.string().max(50).optional(),
  preferencia_contato: z.string().max(50).optional(),
  aceita_marketing: z.boolean().optional(),
  diferenciais_imovel: z.string().max(500).optional(),
  interesse: z.string().max(50).optional(),
  endereco_imovel_analise: z.string().max(300).optional().nullable(),
  valor_pedido_vendedor: z.number().positive().max(10000000000).optional().nullable(),
});

const IncrementEvaluationSchema = z.object({
  operation: z.literal("increment"),
  email: z.string().email().max(255).transform(s => s.trim().toLowerCase()),
});

const RequestSchema = z.discriminatedUnion("operation", [
  CheckLeadSchema,
  UpdateLeadSchema,
  IncrementEvaluationSchema,
]);

serve(async (req: Request) => {
  // Periodic cleanup
  cleanupRateLimitStore();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // In-memory rate limiting (best-effort; augmented by DB-backed check below)
  const clientIp = getRateLimitKey(req);
  const rateLimit = checkRateLimit(clientIp);
  
  const rateLimitHeaders = {
    "X-RateLimit-Limit": RATE_LIMIT_MAX_REQUESTS.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(rateLimit.resetIn / 1000).toString(),
  };

  if (!rateLimit.allowed) {
    console.log(`Rate limit exceeded for IP: ${clientIp}`);
    return new Response(
      JSON.stringify({ 
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil(rateLimit.resetIn / 1000),
      }),
      { 
        status: 429, 
        headers: { 
          "Content-Type": "application/json", 
          "Retry-After": Math.ceil(rateLimit.resetIn / 1000).toString(),
          ...corsHeaders,
          ...rateLimitHeaders,
        } 
      }
    );
  }

  // Request size limit (50KB)
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 50 * 1024) {
    return new Response(
      JSON.stringify({ error: "Request too large" }),
      { status: 413, headers: { "Content-Type": "application/json", ...corsHeaders, ...rateLimitHeaders } }
    );
  }

  try {
    const rawData = await req.json();
    
    // Validate input
    const parseResult = RequestSchema.safeParse(rawData);
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error.flatten());
      return new Response(
        JSON.stringify({ 
          error: "Invalid request data",
          details: parseResult.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...rateLimitHeaders } }
      );
    }

    const data = parseResult.data;

    // Initialize Supabase client with service role for RPC access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // DB-backed rate limit (persistent across cold starts) — per IP + operation
    try {
      const { data: allowed, error: rlErr } = await supabase.rpc("check_rate_limit", {
        p_identifier: clientIp,
        p_function_name: `lead-operations:${data.operation}`,
        p_window_seconds: 60,
        p_max_requests: data.operation === "update" ? 3 : 10,
      });
      if (rlErr) {
        console.error("DB rate limit error:", rlErr);
      } else if (allowed === false) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders, ...rateLimitHeaders } }
        );
      }
    } catch (e) {
      console.error("DB rate limit failed (non-blocking):", e);
    }

    if (data.operation === "check") {
      console.log(`Checking if lead exists (rate-limited): ${data.email.substring(0, 3)}***`);
      
      const { data: result, error } = await supabase.rpc('check_lead_exists', {
        lead_email: data.email,
      });

      if (error) {
        console.error("Error checking lead:", error);
        return new Response(
          JSON.stringify({ error: "Failed to check lead" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...rateLimitHeaders } }
        );
      }

      // Return minimal info - just boolean, don't expose count to prevent inference attacks
      const exists = result && result.length > 0 && result[0].exists_flag;
      
      return new Response(
        JSON.stringify({ exists }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders, ...rateLimitHeaders } }
      );
    }

    if (data.operation === "update") {
      console.log(`Updating lead (rate-limited): ${data.email.substring(0, 3)}***`);
      
      const { data: result, error } = await supabase.rpc('update_lead_by_email', {
        p_email: data.email,
        p_nome: data.nome,
        p_telefone: data.telefone,
        p_bairro_interesse: data.bairro_interesse,
        p_area_interesse: data.area_interesse,
        p_valor_interesse: data.valor_interesse,
        p_quartos: data.quartos,
        p_banheiros: data.banheiros,
        p_suites: data.suites,
        p_vagas: data.vagas,
        p_objetivo: data.objetivo,
        p_urgencia: data.urgencia,
        p_preferencia_contato: data.preferencia_contato,
        p_aceita_marketing: data.aceita_marketing,
        p_diferenciais_imovel: data.diferenciais_imovel,
        p_interesse: data.interesse,
        p_endereco_imovel_analise: data.endereco_imovel_analise,
        p_valor_pedido_vendedor: data.valor_pedido_vendedor,
      });

      if (error) {
        console.error("Error updating lead:", error);
        return new Response(
          JSON.stringify({ error: "Failed to update lead" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...rateLimitHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, leadId: result }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders, ...rateLimitHeaders } }
      );
    }

    if (data.operation === "increment") {
      console.log(`Incrementing evaluation (rate-limited): ${data.email.substring(0, 3)}***`);
      
      const { error } = await supabase.rpc('increment_lead_evaluation', {
        lead_email: data.email,
      });

      if (error) {
        console.error("Error incrementing evaluation:", error);
        return new Response(
          JSON.stringify({ error: "Failed to increment evaluation" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders, ...rateLimitHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders, ...rateLimitHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown operation" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders, ...rateLimitHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
