import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!googleKey) {
      throw new Error("GOOGLE_MAPS_API_KEY not configured");
    }

    // Validate admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some((r: any) =>
      r.role === "admin" || r.role === "superadmin"
    );
    if (!isAdmin) throw new Error("Admin role required");

    // Fetch condominios without street
    const { data: pendentes, error: fetchErr } = await supabaseAdmin
      .from("condominios_mapeamento")
      .select("id, latitude, longitude, logradouro_padrao")
      .or("logradouro_padrao.like.%não cadastrado%,logradouro_padrao.eq.Endereço não localizado via coordenadas")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(50);

    if (fetchErr) throw fetchErr;

    if (!pendentes || pendentes.length === 0) {
      // Count remaining without coords
      const { count } = await supabaseAdmin
        .from("condominios_mapeamento")
        .select("id", { count: "exact", head: true })
        .like("logradouro_padrao", "%não cadastrado%");

      return new Response(
        JSON.stringify({
          resolvidos: 0,
          erros: 0,
          pendentes: count ?? 0,
          proxima_chamada_necessaria: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let resolvidos = 0;
    let erros = 0;

    for (const condo of pendentes) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${condo.latitude},${condo.longitude}&key=${googleKey}&language=pt-BR&result_type=route`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.status === "OK" && data.results?.length > 0) {
          const result = data.results[0];
          // Extract route from address_components
          let route = "";
          for (const comp of result.address_components || []) {
            if (comp.types?.includes("route")) {
              route = comp.long_name;
              break;
            }
          }

          const logradouro = route || result.formatted_address?.split(",")[0] || "";

          if (logradouro) {
            const { error: updateErr } = await supabaseAdmin
              .from("condominios_mapeamento")
              .update({
                logradouro_padrao: logradouro,
                atualizado_em: new Date().toISOString(),
              })
              .eq("id", condo.id);

            if (updateErr) {
              console.error(`Update error for ${condo.id}:`, updateErr);
              erros++;
            } else {
              resolvidos++;
            }
          } else {
            erros++;
          }
        } else {
          console.warn(`Geocoding failed for ${condo.id}: ${data.status}`);
          if (data.status === "ZERO_RESULTS") {
            await supabaseAdmin
              .from("condominios_mapeamento")
              .update({
                logradouro_padrao: "Endereço não localizado via coordenadas",
                atualizado_em: new Date().toISOString(),
              })
              .eq("id", condo.id);
          }
          erros++;
        }
      } catch (err) {
        console.error(`Error processing ${condo.id}:`, err);
        erros++;
      }
    }

    // Count remaining
    const { count: remaining } = await supabaseAdmin
      .from("condominios_mapeamento")
      .select("id", { count: "exact", head: true })
      .like("logradouro_padrao", "%não cadastrado%")
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    const pendentesRestantes = remaining ?? 0;

    // Log to etl_log
    await supabaseAdmin.from("etl_log").insert({
      fonte: "reverse_geocoding",
      status: erros > 0 && resolvidos === 0 ? "error" : "success",
      registros_atualizados: resolvidos,
      registros_com_erro: erros,
      finalizado_em: new Date().toISOString(),
      detalhes: {
        resolvidos,
        erros,
        pendentes: pendentesRestantes,
      },
    });

    return new Response(
      JSON.stringify({
        resolvidos,
        erros,
        pendentes: pendentesRestantes,
        proxima_chamada_necessaria: pendentesRestantes > 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("reverse-geocode-condominios error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
