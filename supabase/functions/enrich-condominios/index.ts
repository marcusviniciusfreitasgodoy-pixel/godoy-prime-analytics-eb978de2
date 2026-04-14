import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de abreviações ITBI para formato legível
const TIPO_LOGRADOURO_MAP: Record<string, string> = {
  'AVN': 'Avenida', 'AV': 'Avenida', 'RUA': 'Rua', 'R': 'Rua',
  'PRC': 'Praça', 'PC': 'Praça', 'EST': 'Estrada', 'ROD': 'Rodovia',
  'TRV': 'Travessa', 'TV': 'Travessa', 'LRG': 'Largo', 'BEC': 'Beco',
  'ALA': 'Alameda', 'AL': 'Alameda', 'VIA': 'Via', 'CND': 'Condomínio',
  'RES': 'Residencial', 'GAL': 'Galeria', 'PSG': 'Passagem',
  'LDR': 'Ladeira', 'CAM': 'Caminho', 'VLO': 'Viela', 'PNT': 'Ponte',
  'TUN': 'Túnel', 'VD': 'Viaduto', 'VDT': 'Viaduto', 'ECL': 'Escadaria',
  'ESC': 'Escadaria', 'JORN': 'Jornalista', 'PREF': 'Prefeito',
  'MAL': 'Marechal', 'DR': 'Doutor', 'SEN': 'Senador', 'DEP': 'Deputado',
  'GEN': 'General', 'CEL': 'Coronel', 'CAP': 'Capitão', 'TEN': 'Tenente',
  'SGT': 'Sargento', 'PROF': 'Professor', 'ENG': 'Engenheiro',
  'ARQ': 'Arquiteto', 'PE': 'Padre', 'FR': 'Frei', 'STO': 'Santo',
  'STA': 'Santa', 'NS': 'Nossa Senhora',
};

const MANUAL_INTERNAL_STREETS: Record<string, string[]> = {
  'santa monica residencias': [
    'Rua João Geraldo Kuhlman', 'Rua Pedro Ludovico', 'Rua Nelson Rodrigues',
    'Rua Josué de Castro', 'Rua Sebastião Afonso Ferreira',
    'Avenida Jean Paul Sartre', 'Avenida Hildebrando de Araujo Goes',
    'Rua Desenhista Luiz Guimaraes',
  ],
};

function normalizeComparisonText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getManualInternalStreets(condominioNome?: string | null): string[] | null {
  if (!condominioNome) return null;
  const manual = MANUAL_INTERNAL_STREETS[normalizeComparisonText(condominioNome)];
  return manual ? [...manual] : null;
}

function isTechnicalStreetNoise(value: string): boolean {
  const normalized = normalizeComparisonText(value);
  return !normalized || /\b(paa|pal|quadra|lote|gleba|projeto)\b/.test(normalized)
    || /^rua \d+\b/.test(normalized);
}

function sanitizeInternalStreets(streets: string[]): string[] {
  const unique = new Map<string, string>();
  for (const street of streets) {
    const trimmed = street?.trim();
    if (!trimmed || isTechnicalStreetNoise(trimmed)) continue;
    const normalizedKey = normalizeComparisonText(trimmed);
    if (!normalizedKey || unique.has(normalizedKey)) continue;
    unique.set(normalizedKey, normalizeLogradouro(trimmed));
  }
  return Array.from(unique.values());
}

function normalizeLogradouro(logradouroITBI: string): string {
  if (!logradouroITBI) return '';
  let normalized = logradouroITBI.trim();
  for (const [abbr, full] of Object.entries(TIPO_LOGRADOURO_MAP)) {
    const regex = new RegExp(`^${abbr}\\s+`, 'i');
    if (regex.test(normalized)) {
      normalized = normalized.replace(regex, `${full} `);
      break;
    }
  }
  normalized = normalized.toLowerCase().split(' ').map(word => {
    const lowercase = ['da', 'de', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos'];
    if (lowercase.includes(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function extractTipoLogradouro(logradouro: string): string | null {
  const match = logradouro.match(/^([A-Z]{2,4})\s+/);
  return match ? match[1] : null;
}

// ── Places API (New) — searchText ──────────────────────────────────────
async function searchPlacesNew(
  query: string,
  apiKey: string
): Promise<{
  placeId: string;
  lat: number;
  lng: number;
  formattedAddress: string;
  types: string[];
  googleMapsUri: string;
  editorialSummary: string;
  photoRefs: string[];
} | null> {
  try {
    const url = "https://places.googleapis.com/v1/places:searchText";
    const body = {
      textQuery: query,
      languageCode: "pt-BR",
      locationBias: {
        circle: {
          center: { latitude: -22.988, longitude: -43.32 },
          radius: 15000,
        },
      },
      maxResultCount: 1,
    };

    const fieldMask = [
      "places.id", "places.formattedAddress", "places.location",
      "places.types", "places.displayName", "places.googleMapsUri",
      "places.editorialSummary", "places.photos",
    ].join(",");

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (!data.places || data.places.length === 0) return null;

    const place = data.places[0];
    return {
      placeId: place.id,
      lat: place.location?.latitude,
      lng: place.location?.longitude,
      formattedAddress: place.formattedAddress || "",
      types: place.types || [],
      googleMapsUri: place.googleMapsUri || "",
      editorialSummary: place.editorialSummary?.text || "",
      photoRefs: (place.photos || []).slice(0, 5).map((p: any) => p.name),
    };
  } catch (error) {
    console.error("Error searching Places API (New):", error);
    return null;
  }
}

// ── Buscar ruas internas via logradouros_geo ───────────────────────────
async function findInternalStreets(
  supabaseUrl: string, supabaseKey: string,
  lat: number, lng: number, radiusMeters = 500
): Promise<string[]> {
  const radiusDegrees = radiusMeters / 111000;
  const client = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await client
    .from('logradouros_geo')
    .select('logradouro, latitude, longitude')
    .gte('latitude', lat - radiusDegrees).lte('latitude', lat + radiusDegrees)
    .gte('longitude', lng - radiusDegrees).lte('longitude', lng + radiusDegrees)
    .not('logradouro', 'is', null);
  if (error) { console.error('Error finding internal streets:', error); return []; }
  const unique = new Set<string>();
  (data || []).forEach((r: any) => { if (r.logradouro) unique.add(r.logradouro); });
  return Array.from(unique);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Auth check
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

    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY') || Deno.env.get('GOOGLE_GEOCODING_API_KEY');
    if (!googleApiKey) throw new Error('Google Maps API key not configured');

    const supabase = serviceClient;
    const body = await req.json().catch(() => ({}));
    const {
      condominioId, bairro = 'BARRA DA TIJUCA', microbairro,
      forceRefresh = false, limit = 20
    } = body;

    console.log('Starting enrichment (Places API New)', { condominioId, bairro, microbairro, forceRefresh, limit });

    let query = supabase.from('condominios_mapeamento').select('*').order('nome_condominio')
      .not('nome_condominio', 'ilike', '%Logradouro não identificado%')
      .not('nome_condominio', 'ilike', '%não identificado%');

    if (condominioId) { query = query.eq('id', condominioId); }
    else if (!forceRefresh) { query = query.or('latitude.is.null,google_place_id.is.null'); }
    if (microbairro) { query = query.eq('microbairro', microbairro); }
    if (limit) { query = query.limit(limit); }

    const { data: condominios, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    console.log(`Found ${condominios?.length || 0} condominios to enrich`);

    const results = {
      processed: 0, enriched: 0, failed: 0,
      details: [] as Array<{ nome: string; status: string; error?: string }>
    };

    for (const condo of condominios || []) {
      results.processed++;
      try {
        const manualInternalStreets = getManualInternalStreets(condo.nome_condominio);
        const searchQuery = `${condo.nome_condominio}, ${bairro}, Rio de Janeiro, RJ, Brasil`;
        console.log(`Searching (New API): ${searchQuery}`);

        const placeInfo = await searchPlacesNew(searchQuery, googleApiKey);

        if (!placeInfo) {
          console.log(`No place found for ${condo.nome_condominio}`);
          results.failed++;
          results.details.push({ nome: condo.nome_condominio, status: 'not_found', error: 'Nenhum resultado' });
          continue;
        }

        let ruasInternas: string[] = [];
        if (manualInternalStreets) {
          ruasInternas = manualInternalStreets;
        } else if (placeInfo.lat && placeInfo.lng) {
          ruasInternas = await findInternalStreets(supabaseUrl, supabaseServiceKey, placeInfo.lat, placeInfo.lng);
          ruasInternas = sanitizeInternalStreets(ruasInternas);
        }

        const logradouroItbi = condo.logradouro_padrao?.toUpperCase().replace(/\s+/g, ' ').trim();

        const { error: updateError } = await supabase
          .from('condominios_mapeamento')
          .update({
            latitude: placeInfo.lat,
            longitude: placeInfo.lng,
            google_place_id: placeInfo.placeId,
            endereco_completo: placeInfo.formattedAddress,
            logradouro_itbi_normalizado: logradouroItbi,
            ruas_internas: ruasInternas,
            google_place_types: placeInfo.types,
            google_maps_uri: placeInfo.googleMapsUri,
            google_editorial_summary: placeInfo.editorialSummary || null,
            google_photos_refs: placeInfo.photoRefs,
          })
          .eq('id', condo.id);

        if (updateError) throw updateError;

        // Normalizações de logradouros
        const logradouroNormalizado = condo.logradouro_padrao ? normalizeLogradouro(condo.logradouro_padrao) : null;
        if (logradouroItbi && logradouroNormalizado) {
          const tipo = extractTipoLogradouro(logradouroItbi);
          await supabase.from('logradouros_normalizacao').upsert({
            logradouro_original: logradouroItbi, logradouro_normalizado: logradouroNormalizado,
            tipo_logradouro: tipo, bairro
          }, { onConflict: 'logradouro_original,bairro' });
        }
        for (const ruaInterna of ruasInternas) {
          const ruaNorm = normalizeLogradouro(ruaInterna);
          const tipo = extractTipoLogradouro(ruaInterna);
          await supabase.from('logradouros_normalizacao').upsert({
            logradouro_original: ruaInterna, logradouro_normalizado: ruaNorm,
            tipo_logradouro: tipo, bairro
          }, { onConflict: 'logradouro_original,bairro' });
        }

        results.enriched++;
        results.details.push({ nome: condo.nome_condominio, status: 'enriched' });

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error enriching ${condo.nome_condominio}:`, err);
        results.failed++;
        results.details.push({ nome: condo.nome_condominio, status: 'error', error: errorMessage });
      }
    }

    console.log('Enrichment complete:', results);
    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in enrich-condominios:', err);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
