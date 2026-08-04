import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DELAY_MS = 60;
const MAX_SECONDS = 70;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* sem body */ }
    const bairro = typeof body.bairro === 'string' && body.bairro.trim() ? body.bairro.trim() : null;
    const limiteRaw = Number(body.limite ?? 60);
    const limite = Number.isFinite(limiteRaw) ? Math.min(Math.max(1, limiteRaw), 200) : 60;
    const somenteBackfill = body.somente_backfill === true;

    // Etapa 1: reaproveita a base logradouros_geo (sem custo de API)
    const { data: backfill, error: backfillError } = await supabase.rpc(
      'backfill_itbi_geom_from_logradouros',
    );
    if (backfillError) throw new Error(`Backfill: ${backfillError.message}`);

    if (somenteBackfill) {
      const { data: status } = await supabase.rpc('itbi_geocoding_status');
      return new Response(JSON.stringify({ backfill, status, completo: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY') || Deno.env.get('GOOGLE_GEOCODING_API_KEY');
    if (!googleApiKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY não configurada', backfill }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Etapa 2: geocodifica os logradouros distintos que sobraram
    const { data: pendentes, error: pendError } = await supabase.rpc('itbi_logradouros_pendentes', {
      p_limite: limite,
      p_bairro: bairro,
    });
    if (pendError) throw new Error(`Pendentes: ${pendError.message}`);

    const start = Date.now();
    let ruasGeocodificadas = 0;
    let registrosAtualizados = 0;
    let erros = 0;
    let interrompido = false;

    for (const rua of (pendentes ?? []) as Array<{ logradouro: string; bairro: string; registros: number }>) {
      if ((Date.now() - start) / 1000 > MAX_SECONDS) { interrompido = true; break; }

      const endereco = `${rua.logradouro}, ${rua.bairro ?? ''}, Rio de Janeiro, RJ, Brasil`;
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(endereco)}&region=br&key=${googleApiKey}`;
        const resp = await fetch(url);
        const json = await resp.json();

        if (json.status === 'OK' && json.results?.[0]?.geometry?.location) {
          const { lat, lng } = json.results[0].geometry.location;

          const { data: afetados, error: updError } = await supabase.rpc(
            'update_itbi_geom_por_logradouro',
            { p_logradouro: rua.logradouro, p_bairro: rua.bairro, p_lat: lat, p_lng: lng },
          );
          if (updError) {
            console.error('Update erro', rua.logradouro, updError.message);
            erros++;
          } else {
            ruasGeocodificadas++;
            registrosAtualizados += Number(afetados ?? 0);
            // Alimenta a base de logradouros para reuso futuro
            await supabase.from('logradouros_geo').upsert(
              {
                logradouro: rua.logradouro,
                bairro: rua.bairro ?? 'RIO DE JANEIRO',
                latitude: lat,
                longitude: lng,
                hierarquia: 'GOOGLE',
                last_sync: new Date().toISOString(),
              },
              { onConflict: 'logradouro,bairro' },
            );
          }
        } else {
          await supabase
            .from('itbi_transactions')
            .update({ geocodificado_via: `erro_${json.status || 'UNKNOWN'}` })
            .is('geom', null)
            .eq('logradouro', rua.logradouro)
            .eq('bairro', rua.bairro);
          erros++;
        }
      } catch (e) {
        console.error('Erro geocodificando', rua.logradouro, e);
        erros++;
      }
      await delay(DELAY_MS);
    }

    const { data: status } = await supabase.rpc('itbi_geocoding_status');
    const restantes = Number((status as Record<string, unknown> | null)?.['sem_geom'] ?? 0);

    const resultado = {
      backfill,
      ruas_geocodificadas: ruasGeocodificadas,
      registros_atualizados: registrosAtualizados,
      erros,
      interrompido,
      status,
      completo: !interrompido && restantes === 0,
    };

    await supabase.from('etl_log').insert({
      fonte: 'geocodificar_itbi_logradouros',
      bairro: bairro ?? 'TODOS',
      status: resultado.completo ? 'success' : 'partial',
      registros_importados: registrosAtualizados,
      registros_com_erro: erros,
      detalhes: resultado,
      finalizado_em: new Date().toISOString(),
    });

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[geocodificar-itbi-logradouros] erro fatal', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
