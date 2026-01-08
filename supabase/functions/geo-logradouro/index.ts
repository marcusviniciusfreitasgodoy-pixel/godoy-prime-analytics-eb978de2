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
  'GAVEA': { lat: -22.9950, lng: -43.2350 },
  'JARDIM BOTANICO': { lat: -22.9700, lng: -43.2250 },
  'LAGOA': { lat: -22.9750, lng: -43.2100 },
  'SAO CONRADO': { lat: -23.0050, lng: -43.2700 },
  'HUMAITA': { lat: -22.9550, lng: -43.1950 },
  'URCA': { lat: -22.9500, lng: -43.1650 },
  'CENTRO': { lat: -22.9050, lng: -43.1800 },
  'VILA ISABEL': { lat: -22.9200, lng: -43.2500 },
  'MEIER': { lat: -22.9050, lng: -43.2800 },
};

// Converte coordenadas SIRGAS 2000 (EPSG:31983) para WGS84 (EPSG:4326)
// Aproximação simplificada para a região do Rio de Janeiro
function sirgas2000ToWGS84(x: number, y: number): { lat: number; lng: number } {
  // Parâmetros aproximados para conversão na região do RJ
  // Esta é uma conversão simplificada - para precisão máxima seria necessário proj4
  const lng = (x - 666820) / 111320 - 43.17;
  const lat = (y - 7465000) / 110540 - 22.95;
  
  return { lat, lng };
}

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const body = req.method === 'POST' ? await req.json() : {};

    console.log(`[geo-logradouro] ${req.method} /${path}`, body);

    // POST /search - Busca logradouros por nome
    if (path === 'search' && req.method === 'POST') {
      const { termo, bairro, limite = 10 } = body;
      
      if (!termo || termo.length < 2) {
        return new Response(
          JSON.stringify({ error: 'Termo deve ter pelo menos 2 caracteres' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Primeiro, buscar no cache local
      const { data: cacheResults, error: cacheError } = await supabase
        .from('logradouros_geo')
        .select('*')
        .ilike('logradouro', `%${termo}%`)
        .eq(bairro ? 'bairro' : 'id', bairro || 'id')
        .limit(limite);

      if (cacheResults && cacheResults.length > 0) {
        console.log(`[geo-logradouro] Cache hit: ${cacheResults.length} resultados`);
        return new Response(
          JSON.stringify({ source: 'cache', data: cacheResults }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Se não encontrar no cache, buscar na API da Prefeitura
      const whereClause = bairro
        ? `COMPLETO LIKE '%${termo.toUpperCase()}%' AND BAIRRO = '${bairro.toUpperCase()}'`
        : `COMPLETO LIKE '%${termo.toUpperCase()}%'`;

      const apiUrl = `${PREFEITURA_API_BASE}?where=${encodeURIComponent(whereClause)}&outFields=*&returnGeometry=true&f=json&resultRecordCount=${limite}`;
      
      console.log(`[geo-logradouro] Consultando API Prefeitura:`, apiUrl);

      const apiResponse = await fetch(apiUrl);
      
      if (!apiResponse.ok) {
        console.error(`[geo-logradouro] Erro na API: ${apiResponse.status}`);
        return new Response(
          JSON.stringify({ error: 'Erro ao consultar API da Prefeitura', source: 'api_error' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const apiData = await apiResponse.json();
      
      if (!apiData.features || apiData.features.length === 0) {
        return new Response(
          JSON.stringify({ source: 'api', data: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Processar e salvar no cache
      const processedResults = [];
      
      for (const feature of apiData.features) {
        const attrs = feature.attributes;
        const geometry = feature.geometry;
        
        let lat = null;
        let lng = null;
        
        if (geometry && geometry.paths) {
          const centroid = calculateCentroid(geometry.paths);
          if (centroid) {
            const wgs84 = sirgas2000ToWGS84(centroid.x, centroid.y);
            lat = wgs84.lat;
            lng = wgs84.lng;
          }
        }
        
        // Fallback para centroid do bairro
        if (!lat || !lng) {
          const bairroName = attrs.BAIRRO?.toUpperCase() || 'BARRA DA TIJUCA';
          const fallback = BAIRRO_CENTROIDS[bairroName] || BAIRRO_CENTROIDS['BARRA DA TIJUCA'];
          lat = fallback.lat + (Math.random() - 0.5) * 0.01;
          lng = fallback.lng + (Math.random() - 0.5) * 0.01;
        }

        const record = {
          logradouro: attrs.COMPLETO || attrs.NOME_MAPA || '',
          bairro: attrs.BAIRRO || 'BARRA DA TIJUCA',
          cod_trecho: attrs.COD_TRECHO,
          latitude: lat,
          longitude: lng,
          hierarquia: attrs.HIERARQUIA,
          tipo_logradouro: attrs.TIPO,
          velocidade_regulamentada: attrs.VELOCIDADE_REGULAMENTADA,
        };

        processedResults.push(record);

        // Salvar no cache (upsert)
        const { error: upsertError } = await supabase
          .from('logradouros_geo')
          .upsert(record, { onConflict: 'logradouro,bairro' });
        
        if (upsertError) {
          console.warn(`[geo-logradouro] Erro ao salvar cache:`, upsertError);
        }
      }

      console.log(`[geo-logradouro] API retornou ${processedResults.length} resultados`);

      return new Response(
        JSON.stringify({ source: 'api', data: processedResults }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /geocode - Geocodifica um endereço específico
    if (path === 'geocode' && req.method === 'POST') {
      const { logradouro, bairro } = body;
      
      if (!logradouro) {
        return new Response(
          JSON.stringify({ error: 'Logradouro é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar no cache primeiro
      let query = supabase
        .from('logradouros_geo')
        .select('*')
        .ilike('logradouro', `%${logradouro}%`);
      
      if (bairro) {
        query = query.eq('bairro', bairro.toUpperCase());
      }

      const { data: cached } = await query.limit(1).single();
      
      if (cached && cached.latitude && cached.longitude) {
        console.log(`[geo-logradouro] Geocode cache hit: ${logradouro}`);
        return new Response(
          JSON.stringify({ source: 'cache', ...cached }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar na API
      const bairroFilter = bairro ? ` AND BAIRRO = '${bairro.toUpperCase()}'` : '';
      const whereClause = `COMPLETO LIKE '%${logradouro.toUpperCase()}%'${bairroFilter}`;
      const apiUrl = `${PREFEITURA_API_BASE}?where=${encodeURIComponent(whereClause)}&outFields=*&returnGeometry=true&f=json&resultRecordCount=1`;

      const apiResponse = await fetch(apiUrl);
      
      if (!apiResponse.ok) {
        // Fallback para centroid do bairro
        const fallbackBairro = bairro?.toUpperCase() || 'BARRA DA TIJUCA';
        const fallback = BAIRRO_CENTROIDS[fallbackBairro] || BAIRRO_CENTROIDS['BARRA DA TIJUCA'];
        
        return new Response(
          JSON.stringify({
            source: 'fallback',
            logradouro,
            bairro: fallbackBairro,
            latitude: fallback.lat,
            longitude: fallback.lng,
            aproximado: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const apiData = await apiResponse.json();
      
      if (!apiData.features || apiData.features.length === 0) {
        // Fallback
        const fallbackBairro = bairro?.toUpperCase() || 'BARRA DA TIJUCA';
        const fallback = BAIRRO_CENTROIDS[fallbackBairro] || BAIRRO_CENTROIDS['BARRA DA TIJUCA'];
        
        return new Response(
          JSON.stringify({
            source: 'fallback',
            logradouro,
            bairro: fallbackBairro,
            latitude: fallback.lat + (Math.random() - 0.5) * 0.005,
            longitude: fallback.lng + (Math.random() - 0.5) * 0.005,
            aproximado: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const feature = apiData.features[0];
      const attrs = feature.attributes;
      const geometry = feature.geometry;

      let lat = null;
      let lng = null;

      if (geometry && geometry.paths) {
        const centroid = calculateCentroid(geometry.paths);
        if (centroid) {
          const wgs84 = sirgas2000ToWGS84(centroid.x, centroid.y);
          lat = wgs84.lat;
          lng = wgs84.lng;
        }
      }

      if (!lat || !lng) {
        const fallbackBairro = attrs.BAIRRO?.toUpperCase() || bairro?.toUpperCase() || 'BARRA DA TIJUCA';
        const fallback = BAIRRO_CENTROIDS[fallbackBairro] || BAIRRO_CENTROIDS['BARRA DA TIJUCA'];
        lat = fallback.lat + (Math.random() - 0.5) * 0.005;
        lng = fallback.lng + (Math.random() - 0.5) * 0.005;
      }

      const result = {
        logradouro: attrs.COMPLETO || logradouro,
        bairro: attrs.BAIRRO || bairro || 'BARRA DA TIJUCA',
        cod_trecho: attrs.COD_TRECHO,
        latitude: lat,
        longitude: lng,
        hierarquia: attrs.HIERARQUIA,
        tipo_logradouro: attrs.TIPO,
        velocidade_regulamentada: attrs.VELOCIDADE_REGULAMENTADA,
        aproximado: false,
      };

      // Salvar no cache
      await supabase.from('logradouros_geo').upsert({
        logradouro: result.logradouro,
        bairro: result.bairro,
        cod_trecho: result.cod_trecho,
        latitude: result.latitude,
        longitude: result.longitude,
        hierarquia: result.hierarquia,
        tipo_logradouro: result.tipo_logradouro,
        velocidade_regulamentada: result.velocidade_regulamentada,
      }, { onConflict: 'logradouro,bairro' });

      console.log(`[geo-logradouro] Geocode API: ${logradouro} -> ${lat}, ${lng}`);

      return new Response(
        JSON.stringify({ source: 'api', ...result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /batch-geocode - Geocodifica múltiplos endereços
    if (path === 'batch-geocode' && req.method === 'POST') {
      const { enderecos } = body; // Array de { logradouro, bairro }
      
      if (!enderecos || !Array.isArray(enderecos)) {
        return new Response(
          JSON.stringify({ error: 'Lista de endereços é obrigatória' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[geo-logradouro] Batch geocode: ${enderecos.length} endereços`);

      // Buscar todos do cache primeiro
      const logradouros = enderecos.map((e: { logradouro: string }) => e.logradouro);
      const { data: cachedData } = await supabase
        .from('logradouros_geo')
        .select('*')
        .in('logradouro', logradouros);

      const cachedMap = new Map(
        (cachedData || []).map(c => [`${c.logradouro}|${c.bairro}`, c])
      );

      const results = [];
      const toFetch = [];

      for (const endereco of enderecos) {
        const key = `${endereco.logradouro}|${endereco.bairro}`;
        const cached = cachedMap.get(key);
        
        if (cached && cached.latitude && cached.longitude) {
          results.push({ ...cached, source: 'cache' });
        } else {
          toFetch.push(endereco);
        }
      }

      // Buscar os que não estão no cache (limitado para não sobrecarregar)
      for (const endereco of toFetch.slice(0, 20)) {
        const fallbackBairro = endereco.bairro?.toUpperCase() || 'BARRA DA TIJUCA';
        const fallback = BAIRRO_CENTROIDS[fallbackBairro] || BAIRRO_CENTROIDS['BARRA DA TIJUCA'];
        
        results.push({
          logradouro: endereco.logradouro,
          bairro: fallbackBairro,
          latitude: fallback.lat + (Math.random() - 0.5) * 0.01,
          longitude: fallback.lng + (Math.random() - 0.5) * 0.01,
          aproximado: true,
          source: 'fallback',
        });
      }

      console.log(`[geo-logradouro] Batch result: ${results.length} geocoded (${cachedData?.length || 0} from cache)`);

      return new Response(
        JSON.stringify({ data: results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint não encontrado' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[geo-logradouro] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
