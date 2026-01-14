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

// Helper para aguardar (rate limiting)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    console.log(`[classify-microbairros] Action: ${action}, Bairro: ${bairro}, Limit: ${limit}, ForceGeocode: ${forceGeocode}`);

    // =========================================
    // ACTION: classify-all-bairros
    // Classifica TODOS os bairros configurados
    // =========================================
    if (action === 'classify-all-bairros') {
      // Buscar lista de bairros únicos com microbairros configurados
      const { data: configuredBairros, error: configError } = await supabase
        .from('microbairros_geo')
        .select('bairro')
        .not('bairro', 'is', null);

      if (configError) throw configError;

      const uniqueBairros = [...new Set(configuredBairros?.map(b => b.bairro))];
      console.log(`[classify-all-bairros] Bairros configurados: ${uniqueBairros.join(', ')}`);

      const results: Record<string, { processed: number; classified: number; byKeyword: number; byGeo: number }> = {};
      let grandTotalProcessed = 0;
      let grandTotalClassified = 0;
      let grandTotalByKeyword = 0;
      let grandTotalByGeo = 0;

      // Processar cada bairro em sequência
      for (const bairroName of uniqueBairros) {
        console.log(`[classify-all-bairros] Processando bairro: ${bairroName}`);

        // Buscar microbairros do bairro
        const { data: micros } = await supabase
          .from('microbairros_geo')
          .select('*')
          .eq('bairro', bairroName);

        const microbairros = (micros || []) as MicrobairroGeo[];
        if (microbairros.length === 0) continue;

        let bairroProcessed = 0;
        let bairroClassified = 0;
        let bairroByKeyword = 0;
        let bairroByGeo = 0;
        const batchSize = 500;

        // Processar em lotes
        while (true) {
          const { data: transactions, error: txError } = await supabase
            .from('itbi_transactions')
            .select('id, logradouro')
            .ilike('bairro', bairroName)
            .is('microbairro', null)
            .limit(batchSize);

          if (txError) throw txError;
          if (!transactions || transactions.length === 0) break;

          const updates: { id: string; microbairro: string }[] = [];

          for (const tx of transactions) {
            let microbairro = classifyByKeywords(tx.logradouro, microbairros);

            if (microbairro) {
              bairroByKeyword++;
            } else if (forceGeocode) {
              // Geocodificar via Google se forceGeocode ativo
              const coords = await geocodeWithGoogle(tx.logradouro, bairroName);
              
              if (coords) {
                microbairro = classifyByLocation(coords.lat, coords.lng, microbairros);
                if (microbairro) {
                  bairroByGeo++;
                }
              }
              
              // Rate limiting para Google API (10 req/s)
              await sleep(100);
            }

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

          bairroProcessed += transactions.length;
          bairroClassified += updates.length;

          console.log(`[classify-all-bairros] ${bairroName}: ${transactions.length} processados, ${updates.length} classificados neste batch`);

          // Safety limit por bairro
          if (bairroProcessed >= 10000) break;
        }

        results[bairroName] = {
          processed: bairroProcessed,
          classified: bairroClassified,
          byKeyword: bairroByKeyword,
          byGeo: bairroByGeo,
        };

        grandTotalProcessed += bairroProcessed;
        grandTotalClassified += bairroClassified;
        grandTotalByKeyword += bairroByKeyword;
        grandTotalByGeo += bairroByGeo;

        console.log(`[classify-all-bairros] ${bairroName} concluído: ${bairroClassified}/${bairroProcessed} classificados`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          bairrosProcessados: uniqueBairros.length,
          results,
          grandTotalProcessed,
          grandTotalClassified,
          grandTotalByKeyword,
          grandTotalByGeo,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================
    // ACTION: stats-all-bairros
    // Estatísticas de classificação de todos os bairros
    // =========================================
    if (action === 'stats-all-bairros') {
      // Buscar lista de bairros únicos com microbairros configurados
      const { data: configuredBairros } = await supabase
        .from('microbairros_geo')
        .select('bairro')
        .not('bairro', 'is', null);

      const uniqueBairros = [...new Set(configuredBairros?.map(b => b.bairro))];

      const results: Record<string, { total: number; classified: number; unclassified: number; percent: string }> = {};
      let grandTotal = 0;
      let grandClassified = 0;

      for (const bairroName of uniqueBairros) {
        const { data: stats } = await supabase
          .from('itbi_transactions')
          .select('microbairro')
          .ilike('bairro', bairroName);

        const total = stats?.length || 0;
        const classified = stats?.filter(s => s.microbairro !== null).length || 0;

        results[bairroName] = {
          total,
          classified,
          unclassified: total - classified,
          percent: total > 0 ? ((classified / total) * 100).toFixed(1) : '0',
        };

        grandTotal += total;
        grandClassified += classified;
      }

      return new Response(
        JSON.stringify({
          bairrosConfigurados: uniqueBairros.length,
          results,
          grandTotal,
          grandClassified,
          grandPercent: grandTotal > 0 ? ((grandClassified / grandTotal) * 100).toFixed(1) : '0',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================
    // Buscar definições de microbairros para bairro específico
    // =========================================
    const { data: microbairrosData, error: microError } = await supabase
      .from('microbairros_geo')
      .select('*')
      .eq('bairro', bairro.toUpperCase());

    if (microError) throw microError;
    const microbairros = (microbairrosData || []) as MicrobairroGeo[];

    if (microbairros.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum microbairro configurado para este bairro', bairro }),
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
          
          // Rate limiting
          await sleep(100);
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
          bairro,
          total,
          classified,
          unclassified,
          percentClassified: total > 0 ? ((classified / total) * 100).toFixed(1) : 0,
          byMicrobairro,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: classify-all - Classificar todas as transações de um bairro (em lotes)
    if (action === 'classify-all') {
      const batchSize = 500;
      let totalProcessed = 0;
      let totalClassified = 0;
      let totalByKeyword = 0;
      let totalByGeo = 0;
      
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
          let microbairro = classifyByKeywords(tx.logradouro, microbairros);
          
          if (microbairro) {
            totalByKeyword++;
          } else if (forceGeocode) {
            const coords = await geocodeWithGoogle(tx.logradouro, bairro);
            
            if (coords) {
              microbairro = classifyByLocation(coords.lat, coords.lng, microbairros);
              if (microbairro) {
                totalByGeo++;
              }
            }
            
            await sleep(100);
          }
          
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

        // Safety limit aumentado para 50.000
        if (totalProcessed >= 50000) break;
      }

      return new Response(
        JSON.stringify({
          success: true,
          bairro,
          totalProcessed,
          totalClassified,
          totalByKeyword,
          totalByGeo,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida. Use: classify, classify-all, classify-all-bairros, stats, stats-all-bairros' }),
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
