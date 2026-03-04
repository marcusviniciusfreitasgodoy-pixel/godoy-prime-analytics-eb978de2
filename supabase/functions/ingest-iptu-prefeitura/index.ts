import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ARCGIS_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Fazenda/IPTU/MapServer/5/query';
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const DELAY_MS = 300;
const BATCH_SIZE = 500;

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

    // Parse body
    const { bairro } = await req.json();
    if (!bairro) {
      return new Response(JSON.stringify({ error: 'bairro is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[ingest-iptu] Starting for bairro: ${bairro}`);

    // Create etl_log entry
    const { data: logEntry, error: logError } = await supabase
      .from('etl_log')
      .insert({ fonte: 'iptu_prefeitura', bairro, status: 'running' })
      .select('id')
      .single();

    if (logError) {
      console.error('Failed to create etl_log:', logError.message);
    }
    const logId = logEntry?.id;

    // Paginated fetch from ArcGIS
    const outFields = 'INSCRICAO,LOGRADOURO,NUMERO,COMPLEMENTO,BAIRRO,TIPOLOGIA,COD_LOG,VALOR_VENAL,AREA_TERRENO,AREA_CONSTRUIDA';
    const whereClause = `BAIRRO='${bairro}'`;

    interface ArcGISFeature {
      attributes: Record<string, unknown>;
      geometry?: { x: number; y: number };
    }

    let allFeatures: ArcGISFeature[] = [];
    let offset = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({
        where: whereClause,
        outFields,
        f: 'json',
        returnGeometry: 'true',
        outSR: '4326',
        resultRecordCount: String(PAGE_SIZE),
        resultOffset: String(offset),
      });

      console.log(`[ingest-iptu] Page ${page + 1}, offset ${offset}`);
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
      console.log(`[ingest-iptu] Got ${features.length} features (total: ${allFeatures.length})`);

      if (!data.exceededTransferLimit) break;
      offset += PAGE_SIZE;

      if (page < MAX_PAGES - 1) await delay(DELAY_MS);
    }

    console.log(`[ingest-iptu] Total features fetched: ${allFeatures.length}`);

    // Upsert via RPC in batches
    let totalUpserted = 0;
    let semCoordenadas = 0;
    let errors: string[] = [];

    for (let i = 0; i < allFeatures.length; i += BATCH_SIZE) {
      const batch = allFeatures.slice(i, i + BATCH_SIZE);

      for (const f of batch) {
        const a = f.attributes;
        const lat = f.geometry?.y ?? null;
        const lng = f.geometry?.x ?? null;

        if (!lat || !lng) semCoordenadas++;

        const inscricao = String(a['INSCRICAO'] || '').trim();
        if (!inscricao) continue;

        const { error: rpcError } = await supabase.rpc('upsert_iptu_imovel', {
          p_inscricao: inscricao,
          p_logradouro: String(a['LOGRADOURO'] || '').trim() || null,
          p_numero: a['NUMERO'] ? String(a['NUMERO']).trim() : null,
          p_complemento: a['COMPLEMENTO'] ? String(a['COMPLEMENTO']).trim() : null,
          p_bairro: String(a['BAIRRO'] || bairro).trim(),
          p_tipologia: a['TIPOLOGIA'] ? String(a['TIPOLOGIA']).trim() : null,
          p_cod_logradouro: a['COD_LOG'] ? String(a['COD_LOG']).trim() : null,
          p_valor_venal: typeof a['VALOR_VENAL'] === 'number' ? a['VALOR_VENAL'] : null,
          p_area_terreno: typeof a['AREA_TERRENO'] === 'number' ? a['AREA_TERRENO'] : null,
          p_area_construida: typeof a['AREA_CONSTRUIDA'] === 'number' ? a['AREA_CONSTRUIDA'] : null,
          p_lat: lat,
          p_lng: lng,
          p_fonte: 'prefeitura_arcgis',
        });

        if (rpcError) {
          errors.push(`${inscricao}: ${rpcError.message}`);
        } else {
          totalUpserted++;
        }
      }

      console.log(`[ingest-iptu] Upserted ${totalUpserted}/${allFeatures.length}`);
    }

    // Update etl_log
    if (logId) {
      await supabase.from('etl_log').update({
        status: errors.length > 0 ? 'partial' : 'success',
        registros_importados: totalUpserted,
        registros_com_erro: errors.length,
        finalizado_em: new Date().toISOString(),
        detalhes: { sem_coordenadas: semCoordenadas, total_api: allFeatures.length },
      }).eq('id', logId);
    }

    const result = {
      success: true,
      total: totalUpserted,
      sem_coordenadas: semCoordenadas,
      erros: errors.length,
      total_api: allFeatures.length,
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
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
