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

// Geocodifica usando Google Geocoding API
async function geocodeWithGoogle(address: string, bairro: string): Promise<{ lat: number; lng: number; formatted_address: string } | null> {
  const apiKey = Deno.env.get('GOOGLE_GEOCODING_API_KEY');
  if (!apiKey) {
    console.warn('[geo-logradouro] GOOGLE_GEOCODING_API_KEY não configurada');
    return null;
  }

  const fullAddress = `${address}, ${bairro}, Rio de Janeiro, RJ, Brasil`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}&region=br&language=pt-BR`;
  
  try {
    console.log(`[geo-logradouro] Google Geocoding: ${fullAddress}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[geo-logradouro] Google API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry?.location;
      
      if (location) {
        console.log(`[geo-logradouro] Google success: ${location.lat}, ${location.lng}`);
        return {
          lat: location.lat,
          lng: location.lng,
          formatted_address: result.formatted_address,
        };
      }
    } else if (data.status === 'ZERO_RESULTS') {
      console.log(`[geo-logradouro] Google: nenhum resultado para ${fullAddress}`);
    } else {
      console.warn(`[geo-logradouro] Google status: ${data.status}`, data.error_message);
    }
    
    return null;
  } catch (error) {
    console.error('[geo-logradouro] Google geocode error:', error);
    return null;
  }
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

    // Auth check: require authenticated admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await serviceClient
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = serviceClient;

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    const body = req.method === 'POST' ? await req.json() : {};

    console.log(`[geo-logradouro] ${req.method} /${path}`, body);

    // Novo endpoint unificado: action-based routing
    if (body.action === 'search') {
      const { term, bairro, limite = 12 } = body;
      
      if (!term || term.length < 2) {
        return new Response(
          JSON.stringify({ results: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const normalizedBairro = bairro?.toUpperCase() || 'BARRA DA TIJUCA';

      // Buscar no cache local primeiro
      const { data: cacheResults } = await supabase
        .from('logradouros_geo')
        .select('*')
        .eq('bairro', normalizedBairro)
        .ilike('logradouro', `%${term.toUpperCase()}%`)
        .limit(limite);

      if (cacheResults && cacheResults.length >= 5) {
        console.log(`[geo-logradouro] Cache hit: ${cacheResults.length} resultados`);
        return new Response(
          JSON.stringify({ 
            results: cacheResults.map(r => ({
              logradouro: r.logradouro,
              bairro: r.bairro,
              cod_trecho: r.cod_trecho,
              hierarquia: r.hierarquia,
              tipo_logradouro: r.tipo_logradouro,
              latitude: r.latitude,
              longitude: r.longitude,
              source: r.hierarquia ? 'google' : 'cache',
            })),
            source: 'cache' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar na API da Prefeitura para sugestões de nomes
      try {
        const whereClause = `NM_COMPLETO_LOGRADOURO LIKE '%${term.toUpperCase()}%'`;
        const apiUrl = `${PREFEITURA_API_BASE}?where=${encodeURIComponent(whereClause)}&outFields=NM_COMPLETO_LOGRADOURO,CD_TRECHO_LOGRADOURO,HIERARQUIA,TP_LOGRADOURO&returnGeometry=true&outSR=4326&f=json&resultRecordCount=${limite}`;
        
        console.log(`[geo-logradouro] Consultando API Prefeitura para sugestões`);
        const apiResponse = await fetch(apiUrl);
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          
          if (apiData.features && apiData.features.length > 0) {
            const results = [];
            
            for (const feature of apiData.features) {
              const attrs = feature.attributes;
              let lat: number | null = null;
              let lng: number | null = null;
              let source = 'prefeitura';

              // Tentar Google Geocoding primeiro para precisão máxima
              const googleResult = await geocodeWithGoogle(attrs.NM_COMPLETO_LOGRADOURO, normalizedBairro);
              
              if (googleResult) {
                lat = googleResult.lat;
                lng = googleResult.lng;
                source = 'google';
              } else if (feature.geometry?.paths) {
                // Fallback para API da Prefeitura
                const centroid = calculateCentroid(feature.geometry.paths);
                if (centroid) {
                  lat = centroid.y;
                  lng = centroid.x;
                }
              }

              // Fallback final para centroid do bairro
              if (!lat || !lng) {
                const fallback = BAIRRO_CENTROIDS[normalizedBairro] || BAIRRO_CENTROIDS['BARRA DA TIJUCA'];
                lat = fallback.lat + (Math.random() - 0.5) * 0.005;
                lng = fallback.lng + (Math.random() - 0.5) * 0.005;
                source = 'fallback';
              }

              results.push({
                logradouro: attrs.NM_COMPLETO_LOGRADOURO,
                bairro: normalizedBairro,
                cod_trecho: attrs.CD_TRECHO_LOGRADOURO,
                hierarquia: source === 'google' ? 'GOOGLE' : attrs.HIERARQUIA,
                tipo_logradouro: attrs.TP_LOGRADOURO,
                latitude: lat,
                longitude: lng,
                source,
              });

              // Salvar no cache (fire and forget)
              if (lat && lng) {
                supabase
                  .from('logradouros_geo')
                  .upsert({
                    logradouro: attrs.NM_COMPLETO_LOGRADOURO,
                    bairro: normalizedBairro,
                    cod_trecho: attrs.CD_TRECHO_LOGRADOURO,
                    hierarquia: source === 'google' ? 'GOOGLE' : attrs.HIERARQUIA,
                    tipo_logradouro: attrs.TP_LOGRADOURO,
                    latitude: lat,
                    longitude: lng,
                    last_sync: new Date().toISOString(),
                  }, { onConflict: 'logradouro,bairro' })
                  .then(() => {});
              }
            }

            const googleCount = results.filter(r => r.source === 'google').length;
            console.log(`[geo-logradouro] Resultados: ${results.length} total (${googleCount} Google)`);
            
            return new Response(
              JSON.stringify({ results, source: 'api' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (apiError) {
        console.error('[geo-logradouro] Erro na API:', apiError);
      }

      // Fallback: retornar cache mesmo se insuficiente
      return new Response(
        JSON.stringify({
          results: (cacheResults || []).map(r => ({
            logradouro: r.logradouro,
            bairro: r.bairro,
            cod_trecho: r.cod_trecho,
            hierarquia: r.hierarquia,
            tipo_logradouro: r.tipo_logradouro,
            latitude: r.latitude,
            longitude: r.longitude,
          })),
          source: 'cache_fallback'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /geocode - Geocodifica um endereço específico (AGORA COM GOOGLE PRIORITY)
    if (path === 'geocode' && req.method === 'POST') {
      const { logradouro, bairro, numero } = body;
      
      if (!logradouro) {
        return new Response(
          JSON.stringify({ error: 'Logradouro é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const normalizedBairro = bairro?.toUpperCase() || 'BARRA DA TIJUCA';
      
      // Construir endereço completo para Google
      const addressParts = [logradouro];
      if (numero) addressParts.push(numero);
      const fullAddress = addressParts.join(', ');

      // 1. Tentar Google Geocoding PRIMEIRO (máxima precisão)
      const googleResult = await geocodeWithGoogle(fullAddress, normalizedBairro);
      
      if (googleResult) {
        const result = {
          logradouro,
          bairro: normalizedBairro,
          latitude: googleResult.lat,
          longitude: googleResult.lng,
          formatted_address: googleResult.formatted_address,
          aproximado: false,
          source: 'google',
        };

        // Salvar no cache
        await supabase.from('logradouros_geo').upsert({
          logradouro,
          bairro: normalizedBairro,
          latitude: result.latitude,
          longitude: result.longitude,
          hierarquia: 'GOOGLE',
          last_sync: new Date().toISOString(),
        }, { onConflict: 'logradouro,bairro' });

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Fallback: buscar no cache local
      let query = supabase
        .from('logradouros_geo')
        .select('*')
        .ilike('logradouro', `%${logradouro}%`);
      
      if (bairro) {
        query = query.eq('bairro', normalizedBairro);
      }

      const { data: cached } = await query.limit(1).single();
      
      if (cached && cached.latitude && cached.longitude) {
        console.log(`[geo-logradouro] Geocode cache hit: ${logradouro}`);
        return new Response(
          JSON.stringify({ source: 'cache', ...cached }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Fallback: usar centroide do bairro
      const fallback = BAIRRO_CENTROIDS[normalizedBairro] || BAIRRO_CENTROIDS['BARRA DA TIJUCA'];
      
      return new Response(
        JSON.stringify({
          source: 'fallback',
          logradouro,
          bairro: normalizedBairro,
          latitude: fallback.lat + (Math.random() - 0.5) * 0.005,
          longitude: fallback.lng + (Math.random() - 0.5) * 0.005,
          aproximado: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /batch-geocode - Geocodifica múltiplos endereços (COM GOOGLE + CONDOMINIO)
    if (path === 'batch-geocode' && req.method === 'POST') {
      const { enderecos, forceRefresh = false } = body;

      if (!enderecos || !Array.isArray(enderecos)) {
        return new Response(
          JSON.stringify({ error: 'Lista de endereços é obrigatória' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[geo-logradouro] Batch geocode: ${enderecos.length} endereços (forceRefresh=${forceRefresh})`);

      // Buscar todos do cache primeiro
      const logradouros = enderecos.map((e: { logradouro: string }) => e.logradouro);
      const { data: cachedData } = await supabase
        .from('logradouros_geo')
        .select('*')
        .in('logradouro', logradouros);

      const cachedMap = new Map(
        (cachedData || []).map((c) => [`${c.logradouro}|${c.bairro}`, c])
      );

      // Buscar todos os condomínios com coordenadas para cruzamento
      const { data: condominiosData } = await supabase
        .from('condominios_mapeamento')
        .select('logradouro_padrao, ruas_internas, logradouro_itbi_normalizado, latitude, longitude, nome_condominio')
        .eq('ativo', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      // Buscar aliases de normalização para expandir o matching
      const { data: normalizacaoData } = await supabase
        .from('logradouros_normalizacao')
        .select('logradouro_original, logradouro_normalizado');

      // Mapa de alias: original → normalizado (e vice-versa)
      const aliasMap = new Map<string, string>();
      for (const n of normalizacaoData || []) {
        if (n.logradouro_original && n.logradouro_normalizado) {
          aliasMap.set(n.logradouro_original.toUpperCase(), n.logradouro_normalizado.toUpperCase());
          aliasMap.set(n.logradouro_normalizado.toUpperCase(), n.logradouro_original.toUpperCase());
        }
      }

      // Criar mapa de logradouro -> coordenadas do condomínio (com normalização)
      // IMPORTANTE: se uma rua aparece em múltiplos condomínios, marca como AMBÍGUA e não usa
      const condominioMap = new Map<string, { lat: number; lng: number; nome: string } | 'AMBIGUOUS'>();
      
      const addToCondMap = (key: string, coordData: { lat: number; lng: number; nome: string }) => {
        const upper = key.toUpperCase().trim();
        if (!upper) return;
        const existing = condominioMap.get(upper);
        if (!existing) {
          condominioMap.set(upper, coordData);
        } else if (existing !== 'AMBIGUOUS' && existing.nome !== coordData.nome) {
          // Mesma rua em condomínios DIFERENTES → ambíguo, não usar
          condominioMap.set(upper, 'AMBIGUOUS');
        }
      };

      for (const cond of condominiosData || []) {
        if (cond.latitude && cond.longitude) {
          const coordData = { lat: cond.latitude, lng: cond.longitude, nome: cond.nome_condominio };
          
          // Mapear logradouro_padrao (endereço principal do condomínio — alta confiança)
          if (cond.logradouro_padrao) {
            addToCondMap(cond.logradouro_padrao, coordData);
          }
          // Mapear logradouro_itbi_normalizado
          if (cond.logradouro_itbi_normalizado) {
            addToCondMap(cond.logradouro_itbi_normalizado, coordData);
          }
          // Mapear ruas_internas
          if (Array.isArray(cond.ruas_internas)) {
            for (const rua of cond.ruas_internas) {
              if (rua) {
                addToCondMap(rua, coordData);
              }
            }
          }
        }
      }

      // Remover entradas ambíguas do mapa
      const ambiguousCount = [...condominioMap.values()].filter(v => v === 'AMBIGUOUS').length;
      for (const [k, v] of condominioMap) {
        if (v === 'AMBIGUOUS') condominioMap.delete(k);
      }

      console.log(`[geo-logradouro] Condomínios: ${condominioMap.size} únicos, ${ambiguousCount} ambíguos removidos, ${aliasMap.size} aliases`);

      // Função para buscar match de condomínio com normalização/fuzzy
      const findCondominioMatch = (logradouro: string): { lat: number; lng: number; nome: string } | null => {
        const upper = logradouro.toUpperCase();
        
        // 1. Match direto (já filtrado de ambíguos)
        const direct = condominioMap.get(upper);
        if (direct && direct !== 'AMBIGUOUS') return direct;

        // 2. Match via alias de normalização
        const alias = aliasMap.get(upper);
        if (alias) {
          const aliasMatch = condominioMap.get(alias);
          if (aliasMatch && aliasMatch !== 'AMBIGUOUS') return aliasMatch;
        }

        // 3. Match fuzzy: verificar se o logradouro contém palavras-chave de uma rua interna
        // Ex: "RUA DESEN LUIZ GUIMARAES" vs "RUA DESENHISTA LUIZ GUIMARAES"
        // Extrair palavras significativas (>3 chars, excluir prefixos comuns)
        const PREFIXES = new Set(['RUA', 'AVENIDA', 'AV', 'ESTRADA', 'EST', 'TRAVESSA', 'TV', 'PRACA', 'ALAMEDA', 'AL']);
        const words = upper.split(/\s+/).filter(w => w.length > 3 && !PREFIXES.has(w));
        
        if (words.length >= 2) {
          for (const [condKey, condCoord] of condominioMap) {
            const condWords = condKey.split(/\s+/).filter(w => w.length > 3 && !PREFIXES.has(w));
            if (condWords.length < 2) continue;
            
            // Verificar se pelo menos 2 palavras significativas coincidem
            const matchCount = words.filter(w => condWords.some(cw => cw.includes(w) || w.includes(cw))).length;
            if (matchCount >= 2 && matchCount >= Math.min(words.length, condWords.length) * 0.6) {
              console.log(`[geo-logradouro] Fuzzy match: "${logradouro}" → "${condKey}" (${condCoord.nome})`);
              return condCoord;
            }
          }
        }

        return null;
      };

      // PRIORIDADE: condomínio > cache Google/CONDOMINIO > Google novo > fallback
      const results: any[] = [];
      const needGoogle: { logradouro: string; bairro: string }[] = [];

      for (const endereco of enderecos) {
        const fallbackBairro = endereco.bairro?.toUpperCase() || 'BARRA DA TIJUCA';
        const logUpper = endereco.logradouro?.toUpperCase();

        // 1. PRIMEIRO: verificar match com condomínio (prioridade máxima)
        const condMatch = findCondominioMatch(endereco.logradouro);
        if (condMatch) {
          const result = {
            logradouro: endereco.logradouro,
            bairro: fallbackBairro,
            latitude: condMatch.lat,
            longitude: condMatch.lng,
            aproximado: false,
            source: 'condominio',
          };
          results.push(result);

          // Atualizar cache com hierarquia CONDOMINIO (sobrescreve GOOGLE se existir)
          supabase
            .from('logradouros_geo')
            .upsert(
              {
                logradouro: result.logradouro,
                bairro: result.bairro,
                hierarquia: 'CONDOMINIO',
                latitude: result.latitude,
                longitude: result.longitude,
                last_sync: new Date().toISOString(),
              },
              { onConflict: 'logradouro,bairro' }
            )
            .then(() => {});
          continue;
        }

        // 2. Se não é condomínio, verificar cache válido
        const key = `${endereco.logradouro}|${fallbackBairro}`;
        const cached = cachedMap.get(key);
        const STALE_AFTER_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias
        const isFresh = cached && cached.latitude && cached.longitude && !forceRefresh &&
          (cached.hierarquia === 'GOOGLE' || cached.hierarquia === 'CONDOMINIO') &&
          cached.last_sync && !Number.isNaN(Date.parse(cached.last_sync)) &&
          (Date.now() - Date.parse(cached.last_sync) <= STALE_AFTER_MS);

        if (isFresh) {
          results.push({
            ...cached,
            source: cached.hierarquia === 'GOOGLE' ? 'google_cache' : 'condominio_cache',
          });
        } else {
          // 3. Precisa Google
          needGoogle.push(endereco);
        }
      }

      const MAX_GOOGLE_CALLS = 50;
      const toFetchLimited = needGoogle.slice(0, MAX_GOOGLE_CALLS);
      console.log(`[geo-logradouro] Condomínio match: ${enderecos.length - needGoogle.length}, Google fetch: ${toFetchLimited.length}`);

      for (const endereco of toFetchLimited) {
        const fallbackBairro = endereco.bairro?.toUpperCase() || 'BARRA DA TIJUCA';
        const fallback =
          BAIRRO_CENTROIDS[fallbackBairro] || BAIRRO_CENTROIDS['BARRA DA TIJUCA'];

        const googleResult = await geocodeWithGoogle(endereco.logradouro, fallbackBairro);

        if (googleResult) {
          const result = {
            logradouro: endereco.logradouro,
            bairro: fallbackBairro,
            latitude: googleResult.lat,
            longitude: googleResult.lng,
            aproximado: false,
            source: 'google',
          };

          results.push(result);

          supabase
            .from('logradouros_geo')
            .upsert(
              {
                logradouro: result.logradouro,
                bairro: result.bairro,
                hierarquia: 'GOOGLE',
                latitude: result.latitude,
                longitude: result.longitude,
                last_sync: new Date().toISOString(),
              },
              { onConflict: 'logradouro,bairro' }
            )
            .then(() => {});

          continue;
        }

        // Fallback: usar centroide do bairro
        results.push({
          logradouro: endereco.logradouro,
          bairro: fallbackBairro,
          latitude: fallback.lat + (Math.random() - 0.5) * 0.008,
          longitude: fallback.lng + (Math.random() - 0.5) * 0.008,
          aproximado: true,
          source: 'fallback',
        });
      }

      // Para endereços além do limite de Google, tentar condomínio primeiro
      for (const endereco of needGoogle.slice(MAX_GOOGLE_CALLS)) {
        const fallbackBairro = endereco.bairro?.toUpperCase() || 'BARRA DA TIJUCA';
        const fallback =
          BAIRRO_CENTROIDS[fallbackBairro] || BAIRRO_CENTROIDS['BARRA DA TIJUCA'];

        results.push({
          logradouro: endereco.logradouro,
          bairro: fallbackBairro,
          latitude: fallback.lat + (Math.random() - 0.5) * 0.008,
          longitude: fallback.lng + (Math.random() - 0.5) * 0.008,
          aproximado: true,
          source: 'fallback_limit',
        });
      }

      const googleCount = results.filter(
        (r) => r.source === 'google' || r.source === 'google_cache'
      ).length;
      const cacheCount = results.filter((r) => r.source === 'cache').length;
      const fallbackCount = results.filter((r) => r.source?.startsWith('fallback')).length;

      console.log(
        `[geo-logradouro] Batch result: ${results.length} total (${googleCount} Google, ${cacheCount} cache, ${fallbackCount} fallback)`
      );

      return new Response(JSON.stringify({ data: results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
