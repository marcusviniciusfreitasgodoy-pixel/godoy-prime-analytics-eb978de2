import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const logradouro = url.searchParams.get("logradouro");

    if (!logradouro || logradouro.trim().length < 3) {
      return new Response(JSON.stringify({ data: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.rpc("normalizar_logradouro", {
      texto: logradouro.trim(),
    });

    if (error) throw error;

    const logradouroNorm = data as string;

    const { data: result, error: queryError } = await supabase
      .from("iptu_logradouro_resumo")
      .select(
        "cod_logradouro, logradouro, nome_completo_oficial, tipologia, total_imoveis, tot_imoveis_oficial, area_media_unidade, valor_venal_medio, preco_real_medio_itbi, total_transacoes_itbi, desconto_venal_percentual"
      )
      .eq("logradouro_norm", logradouroNorm)
      .limit(1)
      .maybeSingle();

    if (queryError) throw queryError;

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
