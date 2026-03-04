import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ARCGIS_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Cartografia/Lotes/MapServer/0/query';
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const DELAY_MS = 300;

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function arcgisRingsToGeoJSON(rings: number[][][]): string {
  return JSON.stringify({
    type: 'Polygon',
    coordinates: rings,
  });
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

    const { bairro } = await req.json();
    if (!bairro) {
      return new Response(JSON.stringify({ error: 'bairro is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[ingest-lotes] Starting for bairro: ${bairro}`);

    // Create etl_log entry
    const { data: logEntry } = await supabase
      .from('etl_log')
      .insert({ fonte: 'lotes_pal', bairro, status: 'running' })
      .select('id')
      .single();
    const logId = logEntry?.id;

    // Paginated fetch
    interface ArcGISFeature {
      attributes: Record<string, unknown>;
      geometry?: { rings: number[][][] };
    }

    let allFeatures: ArcGISFeature[] = [];
    let offset = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({
        where: `BAIRRO='${bairro}'`,
        outFields: 'NUM_CONTRIB,LOGRADOURO,NUMERO,BAIRRO,AREA_LOTE',
        f: 'json',
        returnGeometry: 'true',
        outSR: '4326',
        resultRecordCount: String(PAGE_SIZE),
        resultOffset: String(offset),
      });

      console.log(`[ingest-lotes] Page ${page + 1}, offset ${offset}`);
      const response = await fetch(`${ARCGIS_URL}?${params}`);
      if (!response.ok) break;

      const data = await response.json();
      if (data.error) {
        console.error('ArcGIS error:', data.error);
        break;
      }

      const features: ArcGISFeature[] = data.features || [];
      if (features.length === 0) break;

      allFeatures = allFeatures.concat(features);
      console.log(`[ingest-lotes] Got ${features.length} features (total: ${allFeatures.length})`);

      if (!data.exceededTransferLimit) break;
      offset += PAGE_SIZE;

      if (page < MAX_PAGES - 1) await delay(DELAY_MS);
    }

    console.log(`[ingest-lotes] Total features: ${allFeatures.length}`);

    // Upsert via RPC
    let totalUpserted = 0;
    let errors = 0;

    for (const f of allFeatures) {
      const a = f.attributes;
      const numContrib = String(a['NUM_CONTRIB'] || '').trim();
      if (!numContrib) continue;

      let geojson: string | null = null;
      if (f.geometry?.rings) {
        try {
          geojson = arcgisRingsToGeoJSON(f.geometry.rings);
        } catch {
          console.error(`Invalid geometry for ${numContrib}`);
        }
      }

      const { error: rpcError } = await supabase.rpc('upsert_lote_pal', {
        p_num_contribuinte: numContrib,
        p_logradouro: a['LOGRADOURO'] ? String(a['LOGRADOURO']).trim() : null,
        p_numero: a['NUMERO'] ? String(a['NUMERO']).trim() : null,
        p_bairro: String(a['BAIRRO'] || bairro).trim(),
        p_area_lote: typeof a['AREA_LOTE'] === 'number' ? a['AREA_LOTE'] : null,
        p_geojson: geojson,
      });

      if (rpcError) {
        errors++;
        if (errors <= 5) console.error(`RPC error for ${numContrib}:`, rpcError.message);
      } else {
        totalUpserted++;
      }
    }

    // Update etl_log
    if (logId) {
      await supabase.from('etl_log').update({
        status: errors > 0 ? 'partial' : 'success',
        registros_importados: totalUpserted,
        registros_com_erro: errors,
        finalizado_em: new Date().toISOString(),
        detalhes: { total_api: allFeatures.length },
      }).eq('id', logId);
    }

    const result = { success: true, total: totalUpserted, erros: errors, total_api: allFeatures.length };
    console.log('[ingest-lotes] Done:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[ingest-lotes] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
