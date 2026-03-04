import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

/**
 * territorial-status — Diagnostic endpoint for territorial data ingestion
 * Returns counts and stats from all territorial tables + recent etl_log
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Run all queries in parallel
    const [
      iptuRes,
      iptuBairrosRes,
      lotesRes,
      lotesSemAreaRes,
      edifRes,
      edifComAlturaRes,
      edifComAreaRes,
      condRes,
      condFonteRes,
      etlLogRes,
      // Check for partial edificacoes ingestion
      edifPartialRes,
    ] = await Promise.all([
      // iptu_logradouro_resumo total
      supabase.from('iptu_logradouro_resumo').select('id', { count: 'exact', head: true }),
      // iptu distinct bairros
      supabase.from('iptu_logradouro_resumo').select('bairro').limit(100),
      // lotes_pal total
      supabase.from('lotes_pal').select('id', { count: 'exact', head: true }),
      // lotes without area
      supabase.from('lotes_pal').select('id', { count: 'exact', head: true }).is('area_lote', null).not('geom', 'is', null),
      // edificacoes_geo total
      supabase.from('edificacoes_geo').select('id', { count: 'exact', head: true }),
      // edificacoes with height
      supabase.from('edificacoes_geo').select('id', { count: 'exact', head: true }).not('altura_max', 'is', null),
      // edificacoes with area_footprint
      supabase.from('edificacoes_geo').select('id', { count: 'exact', head: true }).not('area_footprint', 'is', null),
      // condominios_mapeamento total
      supabase.from('condominios_mapeamento').select('id', { count: 'exact', head: true }),
      // condominios by fonte
      supabase.from('condominios_mapeamento').select('fonte_identificacao').limit(1000),
      // Recent etl_log
      supabase.from('etl_log').select('*').order('iniciado_em', { ascending: false }).limit(10),
      // Check for partial edificacoes in etl_log
      supabase.from('etl_log').select('detalhes').eq('fonte', 'edificacoes_geo').eq('status', 'partial').order('iniciado_em', { ascending: false }).limit(1),
    ]);

    // Process bairros
    const bairros = [...new Set((iptuBairrosRes.data || []).map((r: { bairro: string }) => r.bairro))];

    // Process condominios by fonte
    const fonteCount: Record<string, number> = {};
    for (const r of (condFonteRes.data || [])) {
      const fonte = (r as { fonte_identificacao: string | null }).fonte_identificacao || 'manual';
      fonteCount[fonte] = (fonteCount[fonte] || 0) + 1;
    }

    // Get proximo_offset from partial ingestion
    let proximoOffset: number | null = null;
    if (edifPartialRes.data?.[0]?.detalhes) {
      const detalhes = edifPartialRes.data[0].detalhes as { proximo_offset?: number };
      proximoOffset = detalhes.proximo_offset ?? null;
    }

    const edifTotal = edifRes.count || 0;
    const edifComAltura = edifComAlturaRes.count || 0;
    const lotesTotal = lotesRes.count || 0;
    const lotesSemArea = lotesSemAreaRes.count || 0;

    const result = {
      iptu_logradouro_resumo: {
        total: iptuRes.count || 0,
        bairros,
        ultimo_import: (etlLogRes.data || []).find((l: { fonte: string }) => l.fonte === 'iptu_prefeitura_agregado')?.finalizado_em || null,
      },
      lotes_pal: {
        total: lotesTotal,
        com_area: lotesTotal - (lotesSemArea || 0),
        sem_area: lotesSemArea || 0,
      },
      edificacoes_geo: {
        total: edifTotal,
        com_altura: edifComAltura,
        sem_altura: edifTotal - edifComAltura,
        com_area_footprint: edifComAreaRes.count || 0,
        cobertura_percentual: edifTotal > 0 ? `${((edifComAltura / edifTotal) * 100).toFixed(1)}%` : '0%',
        proximo_offset: proximoOffset,
      },
      condominios_mapeamento: {
        total: condRes.count || 0,
        por_fonte: fonteCount,
      },
      etl_log_recente: etlLogRes.data || [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[territorial-status] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
