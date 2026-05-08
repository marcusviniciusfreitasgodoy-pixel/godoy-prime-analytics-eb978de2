import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token || token.length < 16) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: aut, error } = await admin
      .from("autorizacoes_captacao")
      .select("*")
      .eq("token_acesso", token)
      .maybeSingle();

    if (error || !aut) {
      return new Response(JSON.stringify({ error: "Autorização não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark as visualizada (only first time)
    if (aut.status === "enviada") {
      await admin
        .from("autorizacoes_captacao")
        .update({ status: "visualizada", data_visualizacao: new Date().toISOString() })
        .eq("id", aut.id);
      await admin.from("autorizacoes_captacao_eventos").insert({
        autorizacao_id: aut.id,
        tipo: "visualizada",
        ip: req.headers.get("x-forwarded-for") || null,
        user_agent: req.headers.get("user-agent") || null,
      });
    }

    // Return safe subset (omit token to avoid echoing back)
    const { token_acesso: _t, ...safe } = aut as any;
    return new Response(JSON.stringify({ autorizacao: safe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});