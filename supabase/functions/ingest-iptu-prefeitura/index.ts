import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

/**
 * ingest-iptu-prefeitura — Busca dados AGREGADOS de IPTU por logradouro
 * 
 * Layers (Fazenda/IPTU/MapServer):
 *   5 — Residencial por logradouro
 *   4 — Não residencial por logradouro
 *   6 — Territorial por logradouro
 * 
 * Auto-discovers bairro field per layer.
 * Falls back to spatial bbox query if field not found.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Fazenda/IPTU/MapServer';
const PAGE_SIZE = 1000;
const MAX_PAGES = 100;
const DELAY_MS = 300;
const DEFAULT_BBOX = [-43.365, -23.015, -43.270, -22.960];

const LAYERS = [
  { id: 5, label: 'residencial' },
  { id: 4, label: 'nao_residencial' },
  { id: 6, label: 'territorial' },
];

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface ArcGISFeature {
  attributes: Record<string, unknown>;
}

interface LayerMeta {
  campo_bairro: string | null;
  tentativa: string;
}

/**
 * Discover which field contains the bairro name in a given layer.
 */
async function descobrirCampoBairro(layerId: number): Promise<string | null> {
  try {
    const url = `${BASE_URL}/${layerId}?f=json`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const info = await response.json();
    const campos = (info.fields || []).map((f: { name: string }) => f.name.toLowerCase());

    const candidatos = ['nome', 'bairro', 'nm_bairro', 'nome_bairro',
      'ds_bairro', 'bairro_nome', 'nome_logradouro'];

    for (const candidato of candidatos) {
      if (campos.includes(candidato)) return candidato;
    }

    console.log(`[ingest-iptu] Layer ${layerId} fields: ${campos.join(', ')} — no bairro field found`);
    return null;
  } catch (e) {
    console.error(`[ingest-iptu] Error discovering fields for layer ${layerId}:`, e);
    return null;
  }
}

/**
 * Fetch features from a layer using either bairro field filter or bbox spatial query.
 */
async function fetchLayer(
  layerId: number,
  bairro: string,
  campoBairro: string | null,
  bbox: number[]
): Promise<{ features: ArcGISFeature[]; meta: LayerMeta }> {
  const allFeatures: ArcGISFeature[] = [];
  let offset = 0;

  const meta: LayerMeta = {
    campo_bairro: campoBairro,
    tentativa: campoBairro ? `field:${campoBairro}` : 'bbox',
  };

  // Build query params — either field-based or spatial
  const baseParams: Record<string, string> = {
    outFields: 'cl,nome_completo,nome,tipologia,tot_imoveis,areaconst_res,exercicio',
    f: 'json',
    returnGeometry: 'false',
    resultRecordCount: String(PAGE_SIZE),
  };

  if (campoBairro) {
    // Use UPPER for case-insensitive matching
    baseParams.where = `UPPER(${campoBairro}) LIKE '%${bairro.toUpperCase()}%'`;
  } else {
    // Fallback: spatial query with bbox
    baseParams.where = '1=1';
    baseParams.geometry = JSON.stringify({
      xmin: bbox[0], ymin: bbox[1], xmax: bbox[2], ymax: bbox[3],
      spatialReference: { wkid: 4326 }
    });
    baseParams.geometryType = 'esriGeometryEnvelope';
    baseParams.spatialRel = 'esriSpatialRelIntersects';
    baseParams.returnGeometry = 'false';
  }

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      ...baseParams,
      resultOffset: String(offset),
    });

    console.log(`[ingest-iptu] Layer ${layerId}, page ${page + 1}, offset ${offset}, via ${meta.tentativa}`);
    const response = await fetch(`${BASE_URL}/${layerId}/query?${params}`);
    if (!response.ok) {
      console.error(`HTTP ${response.status} on layer ${layerId}`);
      break;
    }

    const data = await response.json();
    if (data.error) {
      console.error(`ArcGIS error layer ${layerId}:`, data.error);
      break;
    }

    const features: ArcGISFeature[] = data.features || [];
    if (features.length === 0) break;

    allFeatures.push(...features);
    console.log(`[ingest-iptu] Layer ${layerId}: got ${features.length} (total: ${allFeatures.length})`);

    if (!data.exceededTransferLimit) break;
    offset += PAGE_SIZE;

    if (page < MAX_PAGES - 1) await delay(DELAY_MS);
  }

  return { features: allFeatures, meta };
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

    let bairro = 'Barra da Tijuca';
    let bbox = DEFAULT_BBOX;
    try {
      const body = await req.json();
      if (body.bairro) bairro = body.bairro;
      if (Array.isArray(body.bbox) && body.bbox.length === 4) bbox = body.bbox;
    } catch {
      // defaults
    }

    if (!bairro) {
      return new Response(JSON.stringify({ error: 'bairro is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[ingest-iptu] Starting for bairro: ${bairro}`);

    const { data: logEntry } = await supabase
      .from('etl_log')
      .insert({ fonte: 'iptu_prefeitura_agregado', bairro, status: 'running' })
      .select('id')
      .single();
    const logId = logEntry?.id;

    // Process each layer
    let totalUpserted = 0;
    let errors = 0;
    const layerDetails: Record<string, { registros: number; campo_bairro: string | null; tentativa: string }> = {};

    for (const layer of LAYERS) {
      // Discover field for this layer
      const campoBairro = await descobrirCampoBairro(layer.id);
      const { features, meta } = await fetchLayer(layer.id, bairro, campoBairro, bbox);

      let layerCount = 0;

      for (const f of features) {
        const a = f.attributes;
        const logradouro = a['nome_completo'] ? String(a['nome_completo']).trim() : null;
        const bairroVal = a['nome'] ? String(a['nome']).trim() : null;
        if (!logradouro || !bairroVal) continue;

        const tipologia = a['tipologia'] ? String(a['tipologia']).trim() : layer.label;
        const totalImoveis = typeof a['tot_imoveis'] === 'number' ? a['tot_imoveis'] : null;
        const areaConst = typeof a['areaconst_res'] === 'number' ? a['areaconst_res'] : null;
        const codLog = a['cl'] ? String(a['cl']).trim() : null;

        const { error: rpcError } = await supabase.rpc('upsert_iptu_logradouro_resumo', {
          p_logradouro: logradouro,
          p_bairro: bairroVal,
          p_tipologia: tipologia,
          p_total_imoveis: totalImoveis,
          p_total_area_construida: areaConst,
          p_cod_logradouro: codLog,
        });

        if (rpcError) {
          errors++;
          if (errors <= 5) console.error(`RPC error: ${rpcError.message}`);
        } else {
          totalUpserted++;
          layerCount++;
        }
      }

      layerDetails[`layer${layer.id}`] = {
        registros: layerCount,
        campo_bairro: meta.campo_bairro,
        tentativa: meta.tentativa,
      };
    }

    // Check if layers 4/6 returned zero and add diagnostic message
    const diagnosticMessages: string[] = [];
    for (const layer of LAYERS) {
      const detail = layerDetails[`layer${layer.id}`];
      if (detail.registros === 0 && !detail.campo_bairro) {
        diagnosticMessages.push(
          `Layer ${layer.id} (${layer.label}) sem dados para bbox da Barra da Tijuca. ` +
          `Pode ser ausência de dados ou nomenclatura diferente. ` +
          `Investigar manualmente: consultar endpoint sem filtro e verificar campos.`
        );
      }
    }

    // Update etl_log
    const finalStatus = errors > 0 || diagnosticMessages.length > 0 ? 'partial' : 'success';
    if (logId) {
      await supabase.from('etl_log').update({
        status: finalStatus,
        registros_importados: totalUpserted,
        registros_com_erro: errors,
        finalizado_em: new Date().toISOString(),
        detalhes: {
          ...layerDetails,
          diagnostico: diagnosticMessages.length > 0 ? diagnosticMessages : undefined,
        },
      }).eq('id', logId);
    }

    const result = {
      success: true,
      ...layerDetails,
      total: totalUpserted,
      erros: errors,
      diagnostico: diagnosticMessages.length > 0 ? diagnosticMessages : undefined,
    };

    console.log('[ingest-iptu] Done:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[ingest-iptu] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
