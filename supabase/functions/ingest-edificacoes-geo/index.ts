import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

/**
 * ingest-edificacoes-geo — Streaming architecture
 * 
 * Fetch page → transform → upsert → next page
 * Accepts offset_inicial to resume partial ingestion
 * 75s safety timeout (Edge Functions have 90s limit)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ARCGIS_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Edificacoes_2019/MapServer/0/query';
const BATCH_SIZE = 500;
const INSERT_CHUNK = 500;
const MAX_SECONDS = 75;
const DELAY_MS = 200;
const DEFAULT_BBOX = [-43.365, -23.015, -43.270, -22.960];

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ringToWKT(ring: number[][]): string {
  return ring.map(p => `${p[0]} ${p[1]}`).join(',');
}

function geometryToWKT(geometry: { rings: number[][][] }): string {
  if (geometry.rings.length === 1) {
    return `POLYGON((${ringToWKT(geometry.rings[0])}))`;
  }
  const parts = geometry.rings.map(r => `(${ringToWKT(r)})`).join(',');
  return `MULTIPOLYGON((${parts}))`;
}

function calcCentroidLat(rings: number[][][]): number {
  const pts = rings[0];
  let sum = 0;
  for (const p of pts) sum += p[1];
  return sum / pts.length;
}

function calcCentroidLng(rings: number[][][]): number {
  const pts = rings[0];
  let sum = 0;
  for (const p of pts) sum += p[0];
  return sum / pts.length;
}

function buildUrl(bbox: number[], offset: number, count: number): string {
  const bboxJson = JSON.stringify({
    xmin: bbox[0], ymin: bbox[1], xmax: bbox[2], ymax: bbox[3],
    spatialReference: { wkid: 4326 }
  });

  const params = new URLSearchParams({
    where: '1=1',
    geometry: bboxJson,
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'objectid,altura,cod_lote,tipo,base,topo',
    f: 'json',
    returnGeometry: 'true',
    outSR: '4326',
    resultRecordCount: String(count),
    resultOffset: String(offset),
  });

  return `${ARCGIS_URL}?${params}`;
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
    let offsetInicial = 0;
    try {
      const body = await req.json();
      if (Array.isArray(body.bbox) && body.bbox.length === 4) bbox = body.bbox;
      if (typeof body.offset_inicial === 'number') offsetInicial = body.offset_inicial;
    } catch {
      // defaults
    }

    console.log(`[ingest-edif] Start bbox=[${bbox.join(',')}] offset_inicial=${offsetInicial}`);

    // etl_log entry
    const { data: logEntry } = await supabase
      .from('etl_log')
      .insert({ fonte: 'edificacoes_geo', bairro: 'BBOX', status: 'running', detalhes: { offset_inicial: offsetInicial } })
      .select('id')
      .single();
    const logId = logEntry?.id;

    const startTime = Date.now();
    let offset = offsetInicial;
    let totalInserido = 0;
    let totalErro = 0;
    let hasMore = true;
    let totalApi = 0;

    while (hasMore) {
      // Check time before fetching next page
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > MAX_SECONDS) {
        console.log(`[ingest-edif] Timeout safety at ${elapsed.toFixed(1)}s, offset=${offset}`);
        if (logId) {
          await supabase.from('etl_log').update({
            status: 'partial',
            registros_importados: totalInserido,
            registros_com_erro: totalErro,
            finalizado_em: new Date().toISOString(),
            detalhes: { proximo_offset: offset, total_api: totalApi, bbox, motivo: 'timeout_safety' },
          }).eq('id', logId);
        }
        return new Response(JSON.stringify({
          parcial: true, proximo_offset: offset, inserido: totalInserido, erros: totalErro, total_api: totalApi
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Fetch page
      const url = buildUrl(bbox, offset, BATCH_SIZE);
      console.log(`[ingest-edif] Fetching offset=${offset}`);
      const response = await fetch(url);
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

      // Transform
      const registros = features.map((f: { attributes: Record<string, unknown>; geometry?: { rings: number[][][] } }) => {
        const a = f.attributes;
        const objectid = typeof a['objectid'] === 'number' ? a['objectid'] : null;
        if (!objectid) return null;

        let geomWkt: string | null = null;
        let lat: number | null = null;
        let lng: number | null = null;

        if (f.geometry?.rings) {
          try {
            geomWkt = `SRID=4326;${geometryToWKT(f.geometry)}`;
            lat = calcCentroidLat(f.geometry.rings);
            lng = calcCentroidLng(f.geometry.rings);
          } catch {
            // skip geometry
          }
        }

        if (!geomWkt) return null;

        const altura = typeof a['altura'] === 'number' ? a['altura'] : null;

        return {
          objectid_origem: objectid,
          altura_max: altura,
          cod_lote: a['cod_lote'] ? String(a['cod_lote']).trim() : null,
          tipo_edificacao: a['tipo'] ? String(a['tipo']).trim() : null,
          cota_base: typeof a['base'] === 'number' ? a['base'] : null,
          cota_topo: typeof a['topo'] === 'number' ? a['topo'] : null,
          andares_estimados: altura ? Math.max(1, Math.round(altura / 3.0)) : null,
          geom: geomWkt,
          lat,
          lng,
        };
      }).filter(Boolean);

      // Insert in chunks
      for (let i = 0; i < registros.length; i += INSERT_CHUNK) {
        const chunk = registros.slice(i, i + INSERT_CHUNK);
        const { error } = await supabase
          .from('edificacoes_geo')
          .upsert(chunk, { onConflict: 'objectid_origem', ignoreDuplicates: false });

        if (error) {
          totalErro += chunk.length;
          if (totalErro <= 5) console.error(`Upsert error:`, error.message);
        } else {
          totalInserido += chunk.length;
        }
      }

      // Calculate pending areas
      try {
        await supabase.rpc('calcular_area_edificacoes_pendentes');
      } catch (e) {
        console.error('Area calc error:', e);
      }

      hasMore = data.exceededTransferLimit === true;
      offset += features.length;

      if (hasMore) await sleep(DELAY_MS);
    }

    // Final log
    const finalStatus = totalErro > 0 ? 'partial' : 'success';
    if (logId) {
      await supabase.from('etl_log').update({
        status: finalStatus,
        registros_importados: totalInserido,
        registros_com_erro: totalErro,
        finalizado_em: new Date().toISOString(),
        detalhes: { total_api: totalApi, bbox, offset_final: offset },
      }).eq('id', logId);
    }

    const result = { completo: true, inserido: totalInserido, erros: totalErro, total_api: totalApi };
    console.log('[ingest-edif] Done:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[ingest-edif] Fatal:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
