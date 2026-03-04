import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

/**
 * ingest-lotes-pal — Streaming: fetch page → upsert → next page
 * 
 * URL: CadParcel/GeoPAL/MapServer/1/query
 * Upsert via .from('lotes_pal').upsert() on objectid_origem
 * Calls calculate_lote_areas() at end
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ARCGIS_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadParcel/GeoPAL/MapServer/1/query';
const PAGE_SIZE = 1000;
const MAX_SECONDS = 75;
const DELAY_MS = 300;
const DEFAULT_BBOX = [-43.365, -23.015, -43.270, -22.960];

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ringToWKT(ring: number[][]): string {
  return ring.map(p => `${p[0]} ${p[1]}`).join(',');
}

function polygonToWKT(geometry: { rings: number[][][] }): string {
  if (geometry.rings.length === 1) {
    return `SRID=4326;POLYGON((${ringToWKT(geometry.rings[0])}))`;
  }
  const parts = geometry.rings.map(r => `(${ringToWKT(r)})`).join(',');
  return `SRID=4326;MULTIPOLYGON((${parts}))`;
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

    // Parse body
    let bbox = DEFAULT_BBOX;
    try {
      const body = await req.json();
      if (Array.isArray(body.bbox) && body.bbox.length === 4) bbox = body.bbox;
    } catch {
      // defaults
    }

    console.log(`[ingest-lotes] Start bbox=[${bbox.join(',')}]`);

    const { data: logEntry } = await supabase
      .from('etl_log')
      .insert({ fonte: 'lotes_pal', bairro: 'BBOX', status: 'running' })
      .select('id')
      .single();
    const logId = logEntry?.id;

    const bboxJson = JSON.stringify({
      xmin: bbox[0], ymin: bbox[1], xmax: bbox[2], ymax: bbox[3],
      spatialReference: { wkid: 4326 }
    });

    const startTime = Date.now();
    let offset = 0;
    let totalInserido = 0;
    let totalErro = 0;
    let totalApi = 0;
    let hasMore = true;

    while (hasMore) {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > MAX_SECONDS) {
        console.log(`[ingest-lotes] Timeout safety at ${elapsed.toFixed(1)}s`);
        break;
      }

      const params = new URLSearchParams({
        where: '1=1',
        geometry: bboxJson,
        geometryType: 'esriGeometryEnvelope',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'objectid,num_projeto,paa,tipo_parcelamento,situacao',
        f: 'json',
        returnGeometry: 'true',
        outSR: '4326',
        resultRecordCount: String(PAGE_SIZE),
        resultOffset: String(offset),
      });

      console.log(`[ingest-lotes] Page offset=${offset}`);
      const response = await fetch(`${ARCGIS_URL}?${params}`);
      if (!response.ok) {
        console.error(`HTTP ${response.status}`);
        break;
      }

      const data = await response.json();
      if (data.error) {
        console.error('ArcGIS error:', data.error);
        break;
      }

      const features = data.features || [];
      if (features.length === 0) break;
      totalApi += features.length;

      // Transform and upsert immediately
      const registros = features.map((f: { attributes: Record<string, unknown>; geometry?: { rings: number[][][] } }) => {
        const a = f.attributes;
        const objectid = typeof a['objectid'] === 'number' ? a['objectid'] : null;
        if (!objectid) return null;

        let geomWkt: string | null = null;
        if (f.geometry?.rings) {
          try {
            geomWkt = polygonToWKT(f.geometry);
          } catch {
            // skip
          }
        }

        return {
          objectid_origem: objectid,
          num_contribuinte: a['num_projeto'] ? String(a['num_projeto']).trim() : null,
          paa: a['paa'] ? String(a['paa']).trim() : null,
          tipo_parcelamento: a['tipo_parcelamento'] ? String(a['tipo_parcelamento']).trim() : null,
          situacao: a['situacao'] ? String(a['situacao']).trim() : null,
          geom: geomWkt,
        };
      }).filter(Boolean);

      if (registros.length > 0) {
        const { error } = await supabase
          .from('lotes_pal')
          .upsert(registros, { onConflict: 'objectid_origem', ignoreDuplicates: false });

        if (error) {
          totalErro += registros.length;
          console.error(`Upsert error:`, error.message);
        } else {
          totalInserido += registros.length;
        }
      }

      hasMore = data.exceededTransferLimit === true;
      offset += features.length;

      if (hasMore) await sleep(DELAY_MS);
    }

    // Calculate areas for all lotes
    if (totalInserido > 0) {
      console.log('[ingest-lotes] Calculating areas...');
      const { data: areasUpdated } = await supabase.rpc('calculate_lote_areas');
      console.log(`[ingest-lotes] Areas calculated: ${areasUpdated}`);
    }

    // Update etl_log
    const finalStatus = totalErro > 0 ? 'partial' : 'success';
    if (logId) {
      await supabase.from('etl_log').update({
        status: finalStatus,
        registros_importados: totalInserido,
        registros_com_erro: totalErro,
        finalizado_em: new Date().toISOString(),
        detalhes: { total_api: totalApi, bbox },
      }).eq('id', logId);
    }

    const result = { success: true, total: totalInserido, erros: totalErro, total_api: totalApi };
    console.log('[ingest-lotes] Done:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[ingest-lotes] Fatal:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
