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

    // We intentionally keep this lightweight: fetch a limited set and de-duplicate client-side.
    const { data, error } = await supabase
      .from("itbi_transactions")
      .select("bairro, total_transacoes")
      .not("bairro", "is", null)
      .ilike("bairro", `%${query}%`)
      .limit(1000);

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar bairros" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const map = new Map<string, number>();
    for (const row of data || []) {
      const b = row.bairro as string | null;
      if (!b) continue;
      map.set(b, (map.get(b) || 0) + (row.total_transacoes || 1));
    }

    const suggestions = Array.from(map.entries())
      .map(([bairro, total_transacoes]) => ({ bairro, total_transacoes }))
      .sort((a, b) => a.bairro.localeCompare(b.bairro, "pt-BR"))
      .slice(0, limit);

    return new Response(
      JSON.stringify({ success: true, suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
