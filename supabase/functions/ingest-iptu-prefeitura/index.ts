import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

/**
 * ingest-iptu-prefeitura — Busca dados AGREGADOS de IPTU por logradouro
 * 
 * Layers utilizados (Fazenda/IPTU/MapServer):
 *   Layer 5 — Residencial por logradouro
 *   Layer 4 — Não residencial por logradouro
 *   Layer 6 — Territorial por logradouro
 * 
 * IMPORTANTE: A tabela iptu_imoveis NÃO é populada por esta função.
 * iptu_imoveis aguarda fonte de dados individuais (CSV manual ou parceria futura).
 * Esta função popula iptu_logradouro_resumo com dados agregados.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Fazenda/IPTU/MapServer';
const PAGE_SIZE = 1000;
const MAX_PAGES = 100;
const DELAY_MS = 300;

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

interface LayerResult {
  label: string;
  features: ArcGISFeature[];
}

async function fetchLayer(layerId: number, bairro: string): Promise<ArcGISFeature[]> {
  const allFeatures: ArcGISFeature[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      where: `nome LIKE '%${bairro}%'`,
      outFields: 'cl,nome_completo,nome,tipologia,tot_imoveis,areaconst_res,exercicio',
      f: 'json',
      returnGeometry: 'false',
      resultRecordCount: String(PAGE_SIZE),
      resultOffset: String(offset),
    });

    console.log(`[ingest-iptu] Layer ${layerId}, page ${page + 1}, offset ${offset}`);
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

  return allFeatures;
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

    console.log(`[ingest-iptu] Starting for bairro: ${bairro}`);

    // Create etl_log entry
    const { data: logEntry } = await supabase
      .from('etl_log')
      .insert({ fonte: 'iptu_prefeitura_agregado', bairro, status: 'running' })
      .select('id')
      .single();
    const logId = logEntry?.id;

    // Fetch all 3 layers
    const layerResults: LayerResult[] = [];
    for (const layer of LAYERS) {
      const features = await fetchLayer(layer.id, bairro);
      layerResults.push({ label: layer.label, features });
    }

    // Upsert all features via RPC
    let totalUpserted = 0;
    let errors = 0;
    const counters: Record<string, number> = {};

    for (const lr of layerResults) {
      let layerCount = 0;

      for (const f of lr.features) {
        const a = f.attributes;
        const logradouro = a['nome_completo'] ? String(a['nome_completo']).trim() : null;
        const bairroVal = a['nome'] ? String(a['nome']).trim() : null;
        if (!logradouro || !bairroVal) continue;

        const tipologia = a['tipologia'] ? String(a['tipologia']).trim() : lr.label;
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

      counters[lr.label] = layerCount;
    }

    // Update etl_log
    if (logId) {
      await supabase.from('etl_log').update({
        status: errors > 0 ? 'partial' : 'success',
        registros_importados: totalUpserted,
        registros_com_erro: errors,
        finalizado_em: new Date().toISOString(),
        detalhes: {
          layer5: counters['residencial'] || 0,
          layer4: counters['nao_residencial'] || 0,
          layer6: counters['territorial'] || 0,
        },
      }).eq('id', logId);
    }

    const result = {
      success: true,
      layer5: counters['residencial'] || 0,
      layer4: counters['nao_residencial'] || 0,
      layer6: counters['territorial'] || 0,
      total: totalUpserted,
      erros: errors,
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
