import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ARCGIS_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Cartografia/Edificacoes/MapServer/0/query';
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const DELAY_MS = 300;

// Default bounding box: Barra da Tijuca
const DEFAULT_BBOX = { xmin: -43.365, ymin: -23.015, xmax: -43.270, ymax: -22.960 };

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function computeCentroid(rings: number[][][]): { lat: number; lng: number } | null {
  if (!rings?.[0]?.length) return null;
  const ring = rings[0];
  let sumX = 0, sumY = 0;
  for (const [x, y] of ring) {
    sumX += x;
    sumY += y;
  }
  return { lng: sumX / ring.length, lat: sumY / ring.length };
}

function ringsToGeoJSON(rings: number[][][]): string {
  return JSON.stringify({ type: 'Polygon', coordinates: rings });
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

    // Parse optional custom bbox
    let bbox = DEFAULT_BBOX;
    try {
      const body = await req.json();
      if (body.bbox) bbox = { ...DEFAULT_BBOX, ...body.bbox };
    } catch {
      // Use defaults
    }

    console.log(`[ingest-edificacoes] Starting with bbox:`, JSON.stringify(bbox));

    // Create etl_log
    const { data: logEntry } = await supabase
      .from('etl_log')
      .insert({ fonte: 'edificacoes_geo', bairro: 'BARRA DA TIJUCA', status: 'running' })
      .select('id')
      .single();
    const logId = logEntry?.id;

    // Paginated fetch with spatial query
    const bboxJson = JSON.stringify({
      xmin: bbox.xmin, ymin: bbox.ymin, xmax: bbox.xmax, ymax: bbox.ymax,
      spatialReference: { wkid: 4326 }
    });

    interface ArcGISFeature {
      attributes: Record<string, unknown>;
      geometry?: { rings: number[][][] };
    }

    let allFeatures: ArcGISFeature[] = [];
    let offset = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({
        where: '1=1',
        geometry: bboxJson,
        geometryType: 'esriGeometryEnvelope',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'OBJECTID,AREA,ALTURA_MAX',
        f: 'json',
        returnGeometry: 'true',
        outSR: '4326',
        resultRecordCount: String(PAGE_SIZE),
        resultOffset: String(offset),
      });

      console.log(`[ingest-edificacoes] Page ${page + 1}, offset ${offset}`);
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
      console.log(`[ingest-edificacoes] Got ${features.length} features (total: ${allFeatures.length})`);

      if (!data.exceededTransferLimit) break;
      offset += PAGE_SIZE;

      if (page < MAX_PAGES - 1) await delay(DELAY_MS);
    }

    console.log(`[ingest-edificacoes] Total features: ${allFeatures.length}`);

    // Upsert via RPC
    let totalUpserted = 0;
    let errors = 0;

    for (const f of allFeatures) {
      const a = f.attributes;
      const objectid = typeof a['OBJECTID'] === 'number' ? a['OBJECTID'] : null;
      if (!objectid) continue;

      const alturaMax = typeof a['ALTURA_MAX'] === 'number' ? a['ALTURA_MAX'] : null;
      const area = typeof a['AREA'] === 'number' ? a['AREA'] : null;
      const andares = alturaMax ? Math.floor(alturaMax / 3) : null;

      let geojson: string | null = null;
      let centroid: { lat: number; lng: number } | null = null;

      if (f.geometry?.rings) {
        try {
          geojson = ringsToGeoJSON(f.geometry.rings);
          centroid = computeCentroid(f.geometry.rings);
        } catch {
          console.error(`Invalid geometry for OBJECTID ${objectid}`);
        }
      }

      const { error: rpcError } = await supabase.rpc('upsert_edificacao_geo', {
        p_objectid: objectid,
        p_area: area,
        p_altura_max: alturaMax,
        p_andares: andares,
        p_lat: centroid?.lat ?? null,
        p_lng: centroid?.lng ?? null,
        p_geojson: geojson,
      });

      if (rpcError) {
        errors++;
        if (errors <= 5) console.error(`RPC error for ${objectid}:`, rpcError.message);
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
        detalhes: { total_api: allFeatures.length, bbox },
      }).eq('id', logId);
    }

    const result = { success: true, total: totalUpserted, erros: errors, total_api: allFeatures.length };
    console.log('[ingest-edificacoes] Done:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[ingest-edificacoes] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
