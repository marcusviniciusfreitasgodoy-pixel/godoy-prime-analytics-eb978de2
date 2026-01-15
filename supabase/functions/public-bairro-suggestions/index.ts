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

    // Normalize query for better fuzzy matching
    const normalizedQuery = query.toUpperCase();

    // Use fuzzy search with pg_trgm similarity
    // First try exact ILIKE match, then fall back to similarity search
    const { data: exactData, error: exactError } = await supabase
      .from("bairros_cache")
      .select("bairro, total_transacoes")
      .ilike("bairro", `%${normalizedQuery}%`)
      .order("total_transacoes", { ascending: false })
      .limit(limit);

    if (exactError) {
      console.error("[public-bairro-suggestions] Exact search error:", exactError);
    }

    // If exact matches found, return them
    if (exactData && exactData.length > 0) {
      const suggestions = exactData.map((row) => ({
        bairro: row.bairro,
        total_transacoes: row.total_transacoes,
      }));

      return new Response(
        JSON.stringify({ success: true, suggestions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // If no exact matches, use fuzzy search with similarity threshold
    // Using RPC to call similarity function
    const { data: fuzzyData, error: fuzzyError } = await supabase.rpc(
      "search_bairros_fuzzy",
      { search_term: normalizedQuery, result_limit: limit }
    );

    if (fuzzyError) {
      console.error("[public-bairro-suggestions] Fuzzy search error:", fuzzyError);
      // Fallback to empty results if fuzzy search fails
      return new Response(
        JSON.stringify({ success: true, suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const suggestions = (fuzzyData || []).map((row: { bairro: string; total_transacoes: number }) => ({
      bairro: row.bairro,
      total_transacoes: row.total_transacoes,
    }));

    console.log(`[public-bairro-suggestions] Query: "${query}" -> ${suggestions.length} fuzzy results`);

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
