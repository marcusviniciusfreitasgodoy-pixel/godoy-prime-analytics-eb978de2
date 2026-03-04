import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

/**
 * ingest-lotes-pal — Importa lotes do GeoPAL (Cadastro Parcelamento)
 * 
 * URL correta: CadParcel/GeoPAL/MapServer/1/query
 * Campos reais: objectid, num_projeto, paa, tipo_parcelamento, situacao
 * Query espacial obrigatória (não tem filtro por bairro)
 * 
 * Após inserção, chamar RPC calculate_lote_areas() para calcular
 * area_lote em m² via ST_Area(ST_Transform(geom, 31983))
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ARCGIS_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadParcel/GeoPAL/MapServer/1/query';
const PAGE_SIZE = 1000;
const MAX_PAGES = 100;
const DELAY_MS = 300;
const DEFAULT_BBOX = [-43.365, -23.015, -43.270, -22.960]; // Barra da Tijuca

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function polygonToGeoJSON(geometry: { rings: number[][][] }): string {
  return JSON.stringify({ type: 'Polygon', coordinates: geometry.rings });
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

    // Parse body — accept bbox array or object
    let bbox = DEFAULT_BBOX;
    try {
      const body = await req.json();
      if (Array.isArray(body.bbox) && body.bbox.length === 4) {
        bbox = body.bbox;
      }
    } catch {
      // Use defaults
    }

    console.log(`[ingest-lotes] Starting with bbox: [${bbox.join(', ')}]`);

    // Create etl_log entry
    const { data: logEntry } = await supabase
      .from('etl_log')
      .insert({ fonte: 'lotes_pal', bairro: 'BBOX', status: 'running' })
      .select('id')
      .single();
    const logId = logEntry?.id;

    // Spatial query envelope
    const bboxJson = JSON.stringify({
      xmin: bbox[0], ymin: bbox[1], xmax: bbox[2], ymax: bbox[3],
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
        outFields: 'objectid,num_projeto,paa,tipo_parcelamento,situacao',
        f: 'json',
        returnGeometry: 'true',
        outSR: '4326',
        resultRecordCount: String(PAGE_SIZE),
        resultOffset: String(offset),
      });

      console.log(`[ingest-lotes] Page ${page + 1}, offset ${offset}`);
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
      const objectid = typeof a['objectid'] === 'number' ? a['objectid'] : null;
      if (!objectid) continue;

      let geojson: string | null = null;
      if (f.geometry?.rings) {
        try {
          geojson = polygonToGeoJSON(f.geometry as { rings: number[][][] });
        } catch {
          console.error(`Invalid geometry for objectid ${objectid}`);
        }
      }

      const { error: rpcError } = await supabase.rpc('upsert_lote_pal', {
        p_objectid_origem: objectid,
        p_num_contribuinte: a['num_projeto'] ? String(a['num_projeto']).trim() : null,
        p_paa: a['paa'] ? String(a['paa']).trim() : null,
        p_tipo_parcelamento: a['tipo_parcelamento'] ? String(a['tipo_parcelamento']).trim() : null,
        p_situacao: a['situacao'] ? String(a['situacao']).trim() : null,
        p_geojson: geojson,
      });

      if (rpcError) {
        errors++;
        if (errors <= 5) console.error(`RPC error for ${objectid}:`, rpcError.message);
      } else {
        totalUpserted++;
      }
    }

    // Calculate areas via PostGIS after all inserts
    if (totalUpserted > 0) {
      console.log('[ingest-lotes] Calculating areas via PostGIS...');
      const { data: areasUpdated } = await supabase.rpc('calculate_lote_areas');
      console.log(`[ingest-lotes] Areas calculated: ${areasUpdated}`);
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
