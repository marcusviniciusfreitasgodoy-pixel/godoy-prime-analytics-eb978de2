import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Fazenda/ITBI/MapServer/8/query';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Auth check (any authenticated user)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Consulta API oficial: pega o registro mais recente (ano DESC, mês DESC)
    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'ano_transação,mês_transação',
      orderByFields: 'ano_transação DESC,mês_transação DESC',
      resultRecordCount: '1',
      f: 'json',
    });

    const apiResp = await fetch(`${API_URL}?${params}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'GodoyPrime/1.0' },
    });
    if (!apiResp.ok) throw new Error(`API HTTP ${apiResp.status}`);
    const apiData = await apiResp.json();
    const feature = apiData.features?.[0]?.attributes;
    const apiLatestYear: number | null = feature?.['ano_transação'] ?? null;
    const apiLatestMonth: number | null = feature?.['mês_transação'] ?? null;

    // Consulta DB: pega a data_transacao mais recente na tabela
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: dbLatest } = await supabase
      .from('itbi_transactions')
      .select('data_transacao')
      .order('data_transacao', { ascending: false })
      .limit(1)
      .maybeSingle();

    let dbLatestYear: number | null = null;
    let dbLatestMonth: number | null = null;
    if (dbLatest?.data_transacao) {
      const d = new Date(dbLatest.data_transacao);
      dbLatestYear = d.getUTCFullYear();
      dbLatestMonth = d.getUTCMonth() + 1;
    }

    const isOutdated =
      apiLatestYear != null && apiLatestMonth != null &&
      (dbLatestYear == null || dbLatestMonth == null ||
        apiLatestYear > dbLatestYear ||
        (apiLatestYear === dbLatestYear && apiLatestMonth > dbLatestMonth));

    return new Response(JSON.stringify({
      success: true,
      api: { year: apiLatestYear, month: apiLatestMonth },
      db: { year: dbLatestYear, month: dbLatestMonth },
      isOutdated,
      checkedAt: new Date().toISOString(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});