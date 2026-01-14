import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  query?: string;
  limit?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json().catch(() => ({}));
    const query = (body.query || "").toString().trim();
    const limit = Math.min(Math.max(Number(body.limit ?? 20) || 20, 1), 50);

    if (query.length < 2 || query.length > 80) {
      return new Response(
        JSON.stringify({ success: true, suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Query from cache table (much faster than aggregating itbi_transactions)
    const { data, error } = await supabase
      .from("bairros_cache")
      .select("bairro, total_transacoes")
      .ilike("bairro", `%${query}%`)
      .order("bairro", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[public-bairro-suggestions] Database error:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar bairros" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const suggestions = (data || []).map((row) => ({
      bairro: row.bairro,
      total_transacoes: row.total_transacoes,
    }));

    return new Response(
      JSON.stringify({ success: true, suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[public-bairro-suggestions] Error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
