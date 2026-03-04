import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { bairro = "Barra da Tijuca", modo = "completo", limpar_algoritmo = false } = body;

    console.log(`[process-condominios-algorithm] bairro=${bairro} modo=${modo} limpar=${limpar_algoritmo}`);

    // Create ETL log entry
    const { data: logEntry, error: logError } = await supabase
      .from("etl_log")
      .insert({
        fonte: "process_condominios_algorithm",
        bairro,
        status: "running",
        detalhes: { modo, limpar_algoritmo },
      })
      .select("id")
      .single();

    if (logError) {
      console.error("Failed to create ETL log:", logError);
    }

    const logId = logEntry?.id;

    // Step 0: Optionally clean algorithm-generated records
    if (limpar_algoritmo) {
      console.log("[Step 0] Cleaning algorithm-generated records...");

      // First delete torres linked to algorithm condominios
      const { error: torresDelErr } = await supabase.rpc("limpar_torres_algoritmo");
      if (torresDelErr) {
        console.error("Error cleaning torres:", torresDelErr);
      }

      // Then delete the algorithm condominios themselves
      const { error: condDelErr } = await supabase
        .from("condominios_mapeamento")
        .delete()
        .in("fonte_identificacao", ["algoritmo_pal", "algoritmo_dbscan"]);

      if (condDelErr) {
        console.error("Error cleaning condominios:", condDelErr);
      }

      console.log("[Step 0] Cleanup complete");
    }

    // Step 1: Identify condominios via PAL lots
    console.log("[Step 1] Running identificar_condominios_pal...");
    const { data: r1, error: e1 } = await supabase.rpc("identificar_condominios_pal");
    if (e1) {
      console.error("Step 1 error:", e1);
      if (logId) {
        await supabase
          .from("etl_log")
          .update({
            status: "error",
            erro_mensagem: `Step 1: ${e1.message}`,
            finalizado_em: new Date().toISOString(),
          })
          .eq("id", logId);
      }
      return new Response(
        JSON.stringify({ success: false, step: 1, error: e1.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[Step 1] Result:", JSON.stringify(r1));

    // Step 2: Enrich with ITBI data
    console.log("[Step 2] Running enriquecer_condominios_com_itbi...");
    const { data: r2, error: e2 } = await supabase.rpc("enriquecer_condominios_com_itbi");
    if (e2) {
      console.error("Step 2 error:", e2);
      if (logId) {
        await supabase
          .from("etl_log")
          .update({
            status: "error",
            erro_mensagem: `Step 2: ${e2.message}`,
            finalizado_em: new Date().toISOString(),
            detalhes: { step1: r1 },
          })
          .eq("id", logId);
      }
      return new Response(
        JSON.stringify({ success: false, step: 2, error: e2.message, step1: r1 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[Step 2] Result:", JSON.stringify(r2));

    // Step 3: Update logradouro summaries
    console.log("[Step 3] Running atualizar_resumo_logradouros...");
    const { data: r3, error: e3 } = await supabase.rpc("atualizar_resumo_logradouros");
    if (e3) {
      console.error("Step 3 error:", e3);
      if (logId) {
        await supabase
          .from("etl_log")
          .update({
            status: "error",
            erro_mensagem: `Step 3: ${e3.message}`,
            finalizado_em: new Date().toISOString(),
            detalhes: { step1: r1, step2: r2 },
          })
          .eq("id", logId);
      }
      return new Response(
        JSON.stringify({ success: false, step: 3, error: e3.message, step1: r1, step2: r2 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[Step 3] Result:", JSON.stringify(r3));

    // Finalize ETL log
    const resultado = { ...(r1 || {}), ...(r2 || {}), ...(r3 || {}) };
    if (logId) {
      await supabase
        .from("etl_log")
        .update({
          status: "success",
          registros_importados: resultado.condominios_inseridos || 0,
          registros_atualizados: resultado.condominios_atualizados || 0,
          detalhes: resultado,
          finalizado_em: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    console.log("[process-condominios-algorithm] Complete:", JSON.stringify(resultado));

    return new Response(
      JSON.stringify({ success: true, ...resultado }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
