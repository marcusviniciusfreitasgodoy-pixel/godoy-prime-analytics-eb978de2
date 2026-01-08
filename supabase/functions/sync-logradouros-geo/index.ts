// Sync logradouros com Google Geocoding API - v2
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Geocodifica usando Google Geocoding API
async function geocodeWithGoogle(address: string, bairro: string): Promise<{ lat: number; lng: number; formatted_address: string } | null> {
  const apiKey = Deno.env.get('GOOGLE_GEOCODING_API_KEY');
  if (!apiKey) {
    console.warn('[sync-logradouros-geo] GOOGLE_GEOCODING_API_KEY não configurada');
    return null;
  }

  const fullAddress = `${address}, ${bairro}, Rio de Janeiro, RJ, Brasil`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}&region=br&language=pt-BR`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[sync-logradouros-geo] Google API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry?.location;
      
      if (location) {
        return {
          lat: location.lat,
          lng: location.lng,
          formatted_address: result.formatted_address,
        };
      }
    } else if (data.status === 'ZERO_RESULTS') {
      console.log(`[sync-logradouros-geo] Google: sem resultados para ${fullAddress}`);
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      console.error('[sync-logradouros-geo] Google: quota excedida');
    }
    
    return null;
  } catch (error) {
    console.error('[sync-logradouros-geo] Google geocode error:', error);
    return null;
  }
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
    const forceRefresh = body.forceRefresh || false; // Re-geocodifica mesmo os que já têm cache

    console.log(`[sync-logradouros-geo] Iniciando sync Google para ${bairro}, limite: ${limitLogradouros}, forceRefresh: ${forceRefresh}`);

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

    // 2. Verificar quais já estão no cache COM coordenadas do Google
    const { data: cached } = await supabase
      .from('logradouros_geo')
      .select('logradouro, hierarquia')
      .eq('bairro', bairro);

    const googleCachedSet = new Set(
      cached?.filter(c => c.hierarquia === 'GOOGLE').map(c => c.logradouro) || []
    );
    
    // Se forceRefresh, re-geocodifica todos; senão, só os que não têm Google
    const toGeocode = forceRefresh 
      ? uniqueLogradouros.slice(0, limitLogradouros)
      : uniqueLogradouros.filter(l => !googleCachedSet.has(l)).slice(0, limitLogradouros);

    console.log(`[sync-logradouros-geo] ${googleCachedSet.size} já com Google, ${toGeocode.length} para geocodificar`);

    if (toGeocode.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Todos os logradouros já estão geocodificados com Google',
          total: uniqueLogradouros.length,
          google_cached: googleCachedSet.size,
          geocoded: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Geocodificar cada logradouro via Google
    const results = {
      google_success: 0,
      fallback: 0,
      failed: 0,
      errors: [] as string[],
    };

    const fallback = BAIRRO_CENTROIDS[bairro] || BAIRRO_CENTROIDS['BARRA DA TIJUCA'];

    for (let i = 0; i < toGeocode.length; i++) {
      const logradouro = toGeocode[i];
      
      try {
        // Tentar Google Geocoding
        const googleResult = await geocodeWithGoogle(logradouro, bairro);
        
        if (googleResult) {
          const { error: upsertError } = await supabase
            .from('logradouros_geo')
            .upsert({
              logradouro,
              bairro,
              hierarquia: 'GOOGLE',
              latitude: googleResult.lat,
              longitude: googleResult.lng,
              last_sync: new Date().toISOString(),
            }, { onConflict: 'logradouro,bairro' });

          if (upsertError) {
            console.warn(`[sync-logradouros-geo] Erro ao salvar ${logradouro}:`, upsertError);
            results.errors.push(`${logradouro}: ${upsertError.message}`);
            results.failed++;
          } else {
            results.google_success++;
          }
        } else {
          // Fallback: salvar com coordenadas aproximadas
          const { error: fallbackError } = await supabase
            .from('logradouros_geo')
            .upsert({
              logradouro,
              bairro,
              hierarquia: 'FALLBACK',
              latitude: fallback.lat + (Math.random() - 0.5) * 0.015,
              longitude: fallback.lng + (Math.random() - 0.5) * 0.015,
              last_sync: new Date().toISOString(),
            }, { onConflict: 'logradouro,bairro' });

          if (!fallbackError) {
            results.fallback++;
          } else {
            results.failed++;
          }
        }
        
        // Log progresso a cada 10
        if ((i + 1) % 10 === 0) {
          console.log(`[sync-logradouros-geo] Progresso: ${i + 1}/${toGeocode.length} (${results.google_success} Google, ${results.fallback} fallback)`);
        }
        
        // Rate limiting - Google permite 50 req/s, mas vamos ser conservadores
        await delay(100);
        
      } catch (error) {
        console.warn(`[sync-logradouros-geo] Erro em ${logradouro}:`, error);
        results.failed++;
      }
    }

    console.log(`[sync-logradouros-geo] Concluído: ${results.google_success} Google, ${results.fallback} fallback, ${results.failed} falhas`);

    return new Response(
      JSON.stringify({
        success: true,
        bairro,
        total_logradouros: uniqueLogradouros.length,
        already_google_cached: googleCachedSet.size,
        google_success: results.google_success,
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
