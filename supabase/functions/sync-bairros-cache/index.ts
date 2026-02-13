import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check: require authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await serviceClient
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("[sync-bairros-cache] Starting sync...");
    const supabase = serviceClient;

    // Aggregate bairros from itbi_transactions
    const { data: bairrosData, error: fetchError } = await supabase
      .from("itbi_transactions")
      .select("bairro, total_transacoes");

    if (fetchError) {
      console.error("[sync-bairros-cache] Fetch error:", fetchError);
      throw fetchError;
    }

    // Aggregate in memory
    const bairroMap = new Map<string, number>();
    for (const row of bairrosData || []) {
      const b = row.bairro as string | null;
      if (!b) continue;
      bairroMap.set(b, (bairroMap.get(b) || 0) + (row.total_transacoes || 1));
    }

    console.log(`[sync-bairros-cache] Found ${bairroMap.size} unique bairros`);

    // Clear and repopulate cache
    const { error: deleteError } = await supabase
      .from("bairros_cache")
      .delete()
      .neq("bairro", ""); // Delete all rows

    if (deleteError) {
      console.error("[sync-bairros-cache] Delete error:", deleteError);
      throw deleteError;
    }

    // Insert in batches of 100
    const entries = Array.from(bairroMap.entries()).map(([bairro, total_transacoes]) => ({
      bairro,
      total_transacoes,
      updated_at: new Date().toISOString(),
    }));

    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from("bairros_cache").insert(batch);
      if (insertError) {
        console.error("[sync-bairros-cache] Insert error:", insertError);
        throw insertError;
      }
      inserted += batch.length;
    }

    console.log(`[sync-bairros-cache] Successfully synced ${inserted} bairros`);

    return new Response(
      JSON.stringify({ success: true, synced: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[sync-bairros-cache] Error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to sync bairros cache" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
