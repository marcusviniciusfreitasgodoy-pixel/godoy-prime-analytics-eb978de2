import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PREFEITURA_API_BASE = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Trechos_Logradouros/MapServer/0/query';

// Coordenadas aproximadas do centro de cada bairro (WGS84)
const BAIRRO_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  'BARRA DA TIJUCA': { lat: -23.0000, lng: -43.3650 },
  'RECREIO DOS BANDEIRANTES': { lat: -23.0250, lng: -43.4650 },
  'JACAREPAGUA': { lat: -22.9500, lng: -43.3500 },
  'COPACABANA': { lat: -22.9700, lng: -43.1850 },
  'IPANEMA': { lat: -22.9850, lng: -43.2000 },
  'LEBLON': { lat: -22.9850, lng: -43.2200 },
  'BOTAFOGO': { lat: -22.9500, lng: -43.1850 },
  'TIJUCA': { lat: -22.9250, lng: -43.2350 },
  'FLAMENGO': { lat: -22.9300, lng: -43.1750 },
  'LARANJEIRAS': { lat: -22.9350, lng: -43.1850 },
};

// Calcula centroid de uma polyline
function calculateCentroid(paths: number[][][]): { x: number; y: number } | null {
  if (!paths || paths.length === 0) return null;
  
  let totalX = 0;
  let totalY = 0;
  let totalPoints = 0;
  
  for (const path of paths) {
    for (const point of path) {
      if (point.length >= 2) {
        totalX += point[0];
        totalY += point[1];
        totalPoints++;
      }
    }
  }
  
  if (totalPoints === 0) return null;
  
  return {
    x: totalX / totalPoints,
    y: totalY / totalPoints,
  };
}

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = req.method === 'POST' ? await req.json() : {};
    const bairro = (body.bairro || 'BARRA DA TIJUCA').toUpperCase();
    const limitLogradouros = body.limit || 200;

    console.log(`[sync-logradouros-geo] Iniciando sync para ${bairro}, limite: ${limitLogradouros}`);

    // 1. Buscar logradouros únicos das transações ITBI
    const { data: logradouros, error: queryError } = await supabase
      .from('itbi_transactions')
      .select('logradouro')
      .eq('bairro', bairro)
      .limit(1000);

    if (queryError) {
      console.error('[sync-logradouros-geo] Erro ao buscar logradouros:', queryError);
      throw queryError;
    }

    // Extrair únicos
    const uniqueLogradouros = [...new Set(logradouros?.map(l => l.logradouro).filter(Boolean))];
    console.log(`[sync-logradouros-geo] Encontrados ${uniqueLogradouros.length} logradouros únicos`);

    // 2. Verificar quais já estão no cache
    const { data: cached } = await supabase
      .from('logradouros_geo')
      .select('logradouro')
      .eq('bairro', bairro);

    const cachedSet = new Set(cached?.map(c => c.logradouro) || []);
    const toGeocode = uniqueLogradouros.filter(l => !cachedSet.has(l)).slice(0, limitLogradouros);

    console.log(`[sync-logradouros-geo] ${cachedSet.size} já em cache, ${toGeocode.length} para geocodificar`);

    if (toGeocode.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Todos os logradouros já estão no cache',
          cached: cachedSet.size,
          geocoded: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Geocodificar cada logradouro
    const results = {
      success: 0,
      failed: 0,
      fallback: 0,
      errors: [] as string[],
    };

    const fallback = BAIRRO_CENTROIDS[bairro] || BAIRRO_CENTROIDS['BARRA DA TIJUCA'];

    for (let i = 0; i < toGeocode.length; i++) {
      const logradouro = toGeocode[i];
      
      try {
        // Buscar na API da Prefeitura
        const whereClause = `NM_COMPLETO_LOGRADOURO = '${logradouro}'`;
        const apiUrl = `${PREFEITURA_API_BASE}?where=${encodeURIComponent(whereClause)}&outFields=NM_COMPLETO_LOGRADOURO,CD_TRECHO_LOGRADOURO,HIERARQUIA,TP_LOGRADOURO&returnGeometry=true&outSR=4326&f=json&resultRecordCount=1`;
        
        const apiResponse = await fetch(apiUrl);
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          
          if (apiData.features && apiData.features.length > 0) {
            const feature = apiData.features[0];
            const attrs = feature.attributes;
            let lat: number | null = null;
            let lng: number | null = null;

            if (feature.geometry?.paths) {
              const centroid = calculateCentroid(feature.geometry.paths);
              if (centroid) {
                lat = centroid.y;
                lng = centroid.x;
              }
            }

            if (lat && lng) {
              const { error: upsertError } = await supabase
                .from('logradouros_geo')
                .upsert({
                  logradouro,
                  bairro,
                  cod_trecho: attrs.CD_TRECHO_LOGRADOURO,
                  hierarquia: attrs.HIERARQUIA,
                  tipo_logradouro: attrs.TP_LOGRADOURO,
                  latitude: lat,
                  longitude: lng,
                  last_sync: new Date().toISOString(),
                }, { onConflict: 'logradouro,bairro' });

              if (upsertError) {
                console.warn(`[sync-logradouros-geo] Erro ao salvar ${logradouro}:`, upsertError);
                results.errors.push(`${logradouro}: ${upsertError.message}`);
                results.failed++;
              } else {
                results.success++;
              }
              
              // Rate limiting
              if ((i + 1) % 10 === 0) {
                console.log(`[sync-logradouros-geo] Progresso: ${i + 1}/${toGeocode.length}`);
                await delay(200);
              }
              continue;
            }
          }
        }
        
        // Fallback: salvar com coordenadas aproximadas
        const { error: fallbackError } = await supabase
          .from('logradouros_geo')
          .upsert({
            logradouro,
            bairro,
            latitude: fallback.lat + (Math.random() - 0.5) * 0.015,
            longitude: fallback.lng + (Math.random() - 0.5) * 0.015,
            last_sync: new Date().toISOString(),
          }, { onConflict: 'logradouro,bairro' });

        if (!fallbackError) {
          results.fallback++;
        } else {
          results.failed++;
        }
        
      } catch (error) {
        console.warn(`[sync-logradouros-geo] Erro em ${logradouro}:`, error);
        results.failed++;
      }
      
      // Rate limiting entre requests
      await delay(100);
    }

    console.log(`[sync-logradouros-geo] Concluído: ${results.success} OK, ${results.fallback} fallback, ${results.failed} falhas`);

    return new Response(
      JSON.stringify({
        success: true,
        bairro,
        total_logradouros: uniqueLogradouros.length,
        already_cached: cachedSet.size,
        geocoded: results.success,
        fallback: results.fallback,
        failed: results.failed,
        errors: results.errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-logradouros-geo] Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
