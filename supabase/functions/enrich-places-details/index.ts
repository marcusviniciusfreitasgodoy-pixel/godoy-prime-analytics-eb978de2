import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function fetchPlaceDetails(placeId: string, apiKey: string) {
  const fieldMask = [
    "id", "displayName", "formattedAddress", "types", "googleMapsUri",
    "editorialSummary", "photos", "reviews", "rating", "userRatingCount",
  ].join(",");

  const url = `https://places.googleapis.com/v1/places/${placeId}?languageCode=pt-BR`;
  const resp = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Places Details error ${resp.status}: ${text}`);
  }

  return await resp.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await serviceClient
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!googleApiKey) throw new Error("GOOGLE_MAPS_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const limit = body.limit ?? 20;

    // Buscar condomínios com place_id mas sem editorial_summary
    let query = serviceClient
      .from("condominios_mapeamento")
      .select("id, nome_condominio, google_place_id")
      .not("google_place_id", "is", null)
      .or("google_place_types.is.null,google_place_types.eq.{}")
      .limit(limit);

    if (body.condominioId) {
      query = serviceClient
        .from("condominios_mapeamento")
        .select("id, nome_condominio, google_place_id")
        .eq("id", body.condominioId)
        .not("google_place_id", "is", null);
    }

    const { data: condominios, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    console.log(`[enrich-places-details] Processing ${condominios?.length || 0} condominios`);

    const results = { processed: 0, enriched: 0, failed: 0, details: [] as any[] };

    for (const condo of condominios || []) {
      results.processed++;
      try {
        const details = await fetchPlaceDetails(condo.google_place_id, googleApiKey);

        const updateData: Record<string, any> = {
          google_place_types: details.types || ["_no_types_returned"],
        };
        if (details.googleMapsUri) updateData.google_maps_uri = details.googleMapsUri;
        if (details.editorialSummary?.text) updateData.google_editorial_summary = details.editorialSummary.text;
        if (details.photos) {
          updateData.google_photos_refs = details.photos.slice(0, 5).map((p: any) => p.name);
        }

        const { error: upErr } = await serviceClient
          .from("condominios_mapeamento")
          .update(updateData)
          .eq("id", condo.id);
        if (upErr) throw upErr;

        results.enriched++;
        results.details.push({
          nome: condo.nome_condominio,
          status: "enriched",
          types: details.types,
          hasEditorial: !!details.editorialSummary?.text,
          rating: details.rating,
          reviewCount: details.userRatingCount,
        });

        console.log(`✓ ${condo.nome_condominio} — types: ${(details.types || []).join(", ")}`);
        await new Promise((r) => setTimeout(r, 150));
      } catch (err: any) {
        console.error(`✗ ${condo.nome_condominio}:`, err.message);
        results.failed++;
        results.details.push({ nome: condo.nome_condominio, status: "error", error: err.message });
      }
    }

    console.log("[enrich-places-details] Complete:", JSON.stringify(results));
    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[enrich-places-details] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
