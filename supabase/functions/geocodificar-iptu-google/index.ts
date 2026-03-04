import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DELAY_MS = 50;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const userId = claimsData.claims.sub as string;

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { bairro, limite = 500 } = await req.json();
    if (!bairro) {
      return new Response(JSON.stringify({ error: 'bairro is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleApiKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[geocodificar] Starting for bairro: ${bairro}, limite: ${limite}`);

    // Fetch records without coordinates
    const { data: records, error: fetchError } = await supabase
      .from('iptu_imoveis')
      .select('id, logradouro, numero, bairro')
      .eq('bairro', bairro)
      .is('geom', null)
      .limit(limite);

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    if (!records || records.length === 0) {
      return new Response(JSON.stringify({ geocodificados: 0, erros: 0, restantes: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[geocodificar] Found ${records.length} records to geocode`);

    let geocodificados = 0;
    let erros = 0;

    for (const record of records) {
      try {
        const parts = [record.logradouro, record.numero, record.bairro, 'Rio de Janeiro', 'RJ', 'Brasil']
          .filter(Boolean);
        const address = parts.join(', ');

        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleApiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
          const { lat, lng } = data.results[0].geometry.location;

          const { error: updateError } = await supabase.rpc('update_iptu_geom', {
            p_id: record.id,
            p_lat: lat,
            p_lng: lng,
          });

          if (updateError) {
            console.error(`Update error for ${record.id}:`, updateError.message);
            erros++;
          } else {
            geocodificados++;
          }
        } else {
          console.log(`[geocodificar] No result for: ${address} (status: ${data.status})`);
          erros++;
        }
      } catch (e) {
        console.error(`[geocodificar] Error for ${record.id}:`, e);
        erros++;
      }

      await delay(DELAY_MS);
    }

    const result = { geocodificados, erros, total_processados: records.length };
    console.log('[geocodificar] Done:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[geocodificar] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
