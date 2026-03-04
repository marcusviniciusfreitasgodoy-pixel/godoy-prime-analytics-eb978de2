import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DELAY_MS = 50;
const MAX_SECONDS = 75;

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

    const { bairro, limite = 500, offset_id = null } = await req.json();
    if (!bairro) {
      return new Response(JSON.stringify({ error: 'bairro is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleApiKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[geocodificar-itbi] Starting bairro=${bairro} limite=${limite} offset=${offset_id}`);

    // Create ETL log entry
    const { data: logEntry } = await supabase
      .from('etl_log')
      .insert({
        fonte: 'geocodificar_itbi',
        bairro,
        status: 'running',
        detalhes: { limite, offset_id },
      })
      .select('id')
      .single();

    const logId = logEntry?.id;

    // Fetch pending records (no geom AND no error marker)
    let query = supabase
      .from('itbi_transactions')
      .select('id, logradouro, numero, bairro')
      .is('geom', null)
      .is('geocodificado_via', null)
      .ilike('bairro', `%${bairro}%`)
      .order('id')
      .limit(limite);

    if (offset_id) {
      query = query.gt('id', offset_id);
    }

    const { data: pendentes, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    if (!pendentes || pendentes.length === 0) {
      if (logId) {
        await supabase.from('etl_log').update({
          status: 'success',
          registros_importados: 0,
          detalhes: { completo: true, mensagem: 'Sem registros pendentes' },
          finalizado_em: new Date().toISOString(),
        }).eq('id', logId);
      }
      return new Response(JSON.stringify({ completo: true, geocodificados: 0, erros: 0, mensagem: 'Sem registros pendentes' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[geocodificar-itbi] Found ${pendentes.length} pending records`);

    const startTime = Date.now();
    let geocodificados = 0;
    let erros = 0;
    let ultimo_id: string | null = null;

    for (const registro of pendentes) {
      // Time guard
      if ((Date.now() - startTime) / 1000 > MAX_SECONDS) {
        console.log(`[geocodificar-itbi] Time limit reached, pausing at ${ultimo_id}`);
        
        if (logId) {
          await supabase.from('etl_log').update({
            status: 'partial',
            registros_importados: geocodificados,
            registros_com_erro: erros,
            detalhes: { parcial: true, proximo_offset_id: ultimo_id, total_processados: geocodificados + erros },
            finalizado_em: new Date().toISOString(),
          }).eq('id', logId);
        }

        return new Response(JSON.stringify({
          parcial: true,
          geocodificados,
          erros,
          proximo_offset_id: ultimo_id,
          mensagem: `Pausado após ${MAX_SECONDS}s. Chamar novamente com offset_id="${ultimo_id}"`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Build address — ITBI is aggregated, numero may not be meaningful
      const numero = registro.numero && registro.numero !== '0' && registro.numero !== 'S/N'
        ? `, ${registro.numero}`
        : '';
      const endereco = `${registro.logradouro}${numero}, ${registro.bairro}, Rio de Janeiro, RJ, Brasil`;

      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(endereco)}&key=${googleApiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
          const { lat, lng } = data.results[0].geometry.location;

          const { error: updateError } = await supabase.rpc('update_itbi_geom', {
            p_id: registro.id,
            p_lat: lat,
            p_lng: lng,
          });

          if (updateError) {
            console.error(`Update error for ${registro.id}:`, updateError.message);
            erros++;
          } else {
            geocodificados++;
          }
        } else {
          // Mark with error status to avoid retrying
          await supabase
            .from('itbi_transactions')
            .update({ geocodificado_via: `erro_${data.status || 'UNKNOWN'}` })
            .eq('id', registro.id);
          
          console.log(`[geocodificar-itbi] No result for: ${endereco} (status: ${data.status})`);
          erros++;
        }
      } catch (e) {
        console.error(`[geocodificar-itbi] Error for ${registro.id}:`, e);
        erros++;
      }

      ultimo_id = registro.id;
      await delay(DELAY_MS);
    }

    const completo = pendentes.length < limite;
    const result = {
      completo,
      parcial: !completo,
      geocodificados,
      erros,
      total_processados: pendentes.length,
      proximo_offset_id: completo ? null : ultimo_id,
    };

    if (logId) {
      await supabase.from('etl_log').update({
        status: completo ? 'success' : 'partial',
        registros_importados: geocodificados,
        registros_com_erro: erros,
        detalhes: result,
        finalizado_em: new Date().toISOString(),
      }).eq('id', logId);
    }

    console.log('[geocodificar-itbi] Done:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[geocodificar-itbi] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
