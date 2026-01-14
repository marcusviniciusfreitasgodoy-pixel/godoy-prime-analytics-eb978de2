import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MicrobairroGeo {
  nome: string;
  bairro: string;
  latitude_centro: number;
  longitude_centro: number;
  lat_min: number;
  lat_max: number;
  lng_min: number;
  lng_max: number;
  keywords: string[];
}

// Geocodifica usando Google Geocoding API
async function geocodeWithGoogle(address: string, bairro: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = Deno.env.get('GOOGLE_GEOCODING_API_KEY');
  if (!apiKey) {
    console.warn('[classify-microbairros] GOOGLE_GEOCODING_API_KEY não configurada');
    return null;
  }

  const fullAddress = `${address}, ${bairro}, Rio de Janeiro, RJ, Brasil`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}&region=br&language=pt-BR`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    
    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
    
    return null;
  } catch (error) {
    console.error('[classify-microbairros] Geocode error:', error);
    return null;
  }
}

// Classifica por keywords primeiro (mais rápido)
function classifyByKeywords(logradouro: string, microbairros: MicrobairroGeo[]): string | null {
  const log = logradouro.toUpperCase();
  
  for (const micro of microbairros) {
    for (const keyword of micro.keywords || []) {
      if (log.includes(keyword.toUpperCase())) {
        return micro.nome;
      }
    }
  }
  
  return null;
}

// Classifica por bounding box geográfico
function classifyByLocation(lat: number, lng: number, microbairros: MicrobairroGeo[]): string | null {
  for (const micro of microbairros) {
    if (
      lat >= micro.lat_min && 
      lat <= micro.lat_max && 
      lng >= micro.lng_min && 
      lng <= micro.lng_max
    ) {
      return micro.nome;
    }
  }
  
  // Se não encontrou em nenhum bounding box, encontrar o mais próximo
  let closest: string | null = null;
  let minDistance = Infinity;
  
  for (const micro of microbairros) {
    const distance = Math.sqrt(
      Math.pow(lat - micro.latitude_centro, 2) + 
      Math.pow(lng - micro.longitude_centro, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closest = micro.nome;
    }
  }
  
  // Só retorna se estiver relativamente próximo (0.02 graus ~ 2km)
  return minDistance < 0.02 ? closest : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, bairro = 'BARRA DA TIJUCA', limit = 100, forceGeocode = false } = body;

    console.log(`[classify-microbairros] Action: ${action}, Bairro: ${bairro}, Limit: ${limit}`);

    // Buscar definições de microbairros
    const { data: microbairrosData, error: microError } = await supabase
      .from('microbairros_geo')
      .select('*')
      .eq('bairro', bairro.toUpperCase());

    if (microError) throw microError;
    const microbairros = (microbairrosData || []) as MicrobairroGeo[];

    if (microbairros.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum microbairro configurado para este bairro' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: classify - Classificar transações sem microbairro
    if (action === 'classify') {
      // Buscar transações sem microbairro classificado
      const { data: transactions, error: txError } = await supabase
        .from('itbi_transactions')
        .select('id, logradouro')
        .ilike('bairro', bairro)
        .is('microbairro', null)
        .limit(limit);

      if (txError) throw txError;

      console.log(`[classify-microbairros] Encontradas ${transactions?.length || 0} transações para classificar`);

      let classifiedByKeyword = 0;
      let classifiedByGeo = 0;
      let notClassified = 0;
      const updates: { id: string; microbairro: string }[] = [];

      for (const tx of transactions || []) {
        // Tentar classificar por keywords primeiro (mais rápido)
        let microbairro = classifyByKeywords(tx.logradouro, microbairros);

        if (microbairro) {
          classifiedByKeyword++;
        } else if (forceGeocode) {
          // Se forceGeocode, tentar geocodificar via Google
          const coords = await geocodeWithGoogle(tx.logradouro, bairro);
          
          if (coords) {
            microbairro = classifyByLocation(coords.lat, coords.lng, microbairros);
            if (microbairro) {
              classifiedByGeo++;
            }
          }
        }

        if (microbairro) {
          updates.push({ id: tx.id, microbairro });
        } else {
          notClassified++;
        }
      }

      // Atualizar em batch
      if (updates.length > 0) {
        for (const update of updates) {
          await supabase
            .from('itbi_transactions')
            .update({ microbairro: update.microbairro })
            .eq('id', update.id);
        }
      }

      console.log(`[classify-microbairros] Resultado: ${classifiedByKeyword} por keyword, ${classifiedByGeo} por geo, ${notClassified} não classificados`);

      return new Response(
        JSON.stringify({
          success: true,
          processed: transactions?.length || 0,
          classified: updates.length,
          classifiedByKeyword,
          classifiedByGeo,
          notClassified,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: stats - Retornar estatísticas de classificação
    if (action === 'stats') {
      const { data: stats } = await supabase
        .from('itbi_transactions')
        .select('microbairro')
        .ilike('bairro', bairro);

      const total = stats?.length || 0;
      const classified = stats?.filter(s => s.microbairro !== null).length || 0;
      const unclassified = total - classified;

      // Contar por microbairro
      const byMicrobairro: Record<string, number> = {};
      for (const s of stats || []) {
        if (s.microbairro) {
          byMicrobairro[s.microbairro] = (byMicrobairro[s.microbairro] || 0) + 1;
        }
      }

      return new Response(
        JSON.stringify({
          total,
          classified,
          unclassified,
          percentClassified: total > 0 ? ((classified / total) * 100).toFixed(1) : 0,
          byMicrobairro,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: classify-all - Classificar todas as transações (em lotes)
    if (action === 'classify-all') {
      const batchSize = 500;
      let totalProcessed = 0;
      let totalClassified = 0;
      
      // Loop até não ter mais transações sem classificação
      while (true) {
        const { data: transactions, error: txError } = await supabase
          .from('itbi_transactions')
          .select('id, logradouro')
          .ilike('bairro', bairro)
          .is('microbairro', null)
          .limit(batchSize);

        if (txError) throw txError;
        if (!transactions || transactions.length === 0) break;

        const updates: { id: string; microbairro: string }[] = [];

        for (const tx of transactions) {
          const microbairro = classifyByKeywords(tx.logradouro, microbairros);
          if (microbairro) {
            updates.push({ id: tx.id, microbairro });
          }
        }

        // Atualizar em batch
        for (const update of updates) {
          await supabase
            .from('itbi_transactions')
            .update({ microbairro: update.microbairro })
            .eq('id', update.id);
        }

        totalProcessed += transactions.length;
        totalClassified += updates.length;

        console.log(`[classify-microbairros] Batch: ${transactions.length} processados, ${updates.length} classificados`);

        // Safety limit
        if (totalProcessed >= 10000) break;
      }

      return new Response(
        JSON.stringify({
          success: true,
          totalProcessed,
          totalClassified,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida. Use: classify, stats, ou classify-all' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[classify-microbairros] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
