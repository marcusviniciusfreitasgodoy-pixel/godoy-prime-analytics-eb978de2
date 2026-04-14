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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY") || Deno.env.get("GOOGLE_GEOCODING_API_KEY");

    if (!googleKey) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_GEOCODING_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user auth
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey);

    // Check admin role
    const userId = claimsData.claims.sub;
    const { data: roles } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = roles?.some((r: any) =>
      ["admin", "superadmin"].includes(r.role)
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const limite = body.limite ?? 100;

    // Find logradouros from IPTU that don't exist in logradouros_geo
    const { data: pendentes, error: queryErr } = await serviceClient.rpc(
      "get_logradouros_sem_geo",
      { p_limite: limite }
    );

    if (queryErr) {
      // Fallback: direct query if RPC doesn't exist yet
      console.warn("RPC not found, using direct query:", queryErr.message);
      const { data: fallback, error: fbErr } = await serviceClient
        .from("iptu_logradouro_resumo")
        .select("logradouro, logradouro_norm")
        .ilike("bairro", "%Barra%")
        .limit(limite);

      if (fbErr) throw fbErr;
      // Filter manually
      const { data: existingGeo } = await serviceClient
        .from("logradouros_geo")
        .select("logradouro");
      const existingSet = new Set(
        (existingGeo || []).map((g: any) => g.logradouro?.toUpperCase()?.trim())
      );
      const filtered = (fallback || []).filter(
        (r: any) => !existingSet.has(r.logradouro?.toUpperCase()?.trim())
      );
      return await processGeocoding(serviceClient, filtered, googleKey, corsHeaders);
    }

    return await processGeocoding(serviceClient, pendentes || [], googleKey, corsHeaders);
  } catch (err: any) {
    console.error("[enrich-logradouros-geo] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processGeocoding(
  client: any,
  logradouros: any[],
  googleKey: string,
  headers: Record<string, string>
) {
  let geocodificados = 0;
  let erros = 0;
  const errors: string[] = [];

  console.log(
    `[enrich-logradouros-geo] Processing ${logradouros.length} logradouros`
  );

  for (const item of logradouros) {
    const logradouro = item.logradouro;
    if (!logradouro) continue;

    try {
      const address = `${logradouro}, Barra da Tijuca, Rio de Janeiro, RJ, Brasil`;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${googleKey}`;

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status === "OK" && data.results?.[0]) {
        const result = data.results[0];
        const { lat, lng } = result.geometry.location;
        const locationType = result.geometry.location_type;

        const { error: upsertErr } = await client
          .from("logradouros_geo")
          .upsert(
            {
              logradouro: logradouro,
              bairro: "BARRA DA TIJUCA",
              latitude: lat,
              longitude: lng,
              hierarquia: `GOOGLE_${locationType}`,
              last_sync: new Date().toISOString(),
            },
            { onConflict: "logradouro,bairro", ignoreDuplicates: false }
          );

        if (upsertErr) {
          console.warn(`Upsert error for ${logradouro}:`, upsertErr.message);
          // Try insert instead
          const { error: insertErr } = await client
            .from("logradouros_geo")
            .insert({
              logradouro: logradouro,
              bairro: "BARRA DA TIJUCA",
              latitude: lat,
              longitude: lng,
              hierarquia: `GOOGLE_${locationType}`,
              last_sync: new Date().toISOString(),
            });
          if (insertErr) {
            console.error(`Insert also failed for ${logradouro}:`, insertErr.message);
            erros++;
            errors.push(`${logradouro}: ${insertErr.message}`);
            continue;
          }
        }

        geocodificados++;
        console.log(
          `[enrich-logradouros-geo] ✓ ${logradouro} → ${lat},${lng} (${locationType})`
        );
      } else {
        erros++;
        errors.push(`${logradouro}: ${data.status}`);
        console.warn(
          `[enrich-logradouros-geo] ✗ ${logradouro}: ${data.status}`
        );
      }

      // Rate limit: 100ms between calls
      await new Promise((r) => setTimeout(r, 100));
    } catch (err: any) {
      erros++;
      errors.push(`${logradouro}: ${err.message}`);
    }
  }

  const pendentes = logradouros.length - geocodificados - erros;
  const result = { geocodificados, erros, pendentes, errors: errors.slice(0, 10) };
  console.log("[enrich-logradouros-geo] Result:", JSON.stringify(result));

  return new Response(JSON.stringify(result), {
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
