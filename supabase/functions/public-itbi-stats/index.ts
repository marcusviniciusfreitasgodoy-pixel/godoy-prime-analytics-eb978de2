import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  MAX_ROWS,
  buildMarketWindow,
  calculateITBIData,
  collectBairros,
  selectWindowRows,
  type MarketRow,
} from "../_shared/itbiMarketStats.ts";
import { getOutlierLimits } from "../_shared/outlierLimits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ITBIStatsRequest {
  action: 'stats' | 'suggestions';
  bairro: string;
  logradouro?: string;
  tipologia?: string;
  query?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ITBIStatsRequest = await req.json();
    const { action = 'stats', bairro, logradouro, tipologia, query } = body;

    // Validate required fields
    if (!bairro || typeof bairro !== 'string' || bairro.length > 100) {
      return new Response(
        JSON.stringify({ error: "Bairro inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle street suggestions
    if (action === 'suggestions') {
      if (!query || query.length < 2) {
        return new Response(
          JSON.stringify({ success: true, suggestions: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const searchTerm = query.toUpperCase().trim()
        .replace(/^(AVENIDA|AVN|AV|AV\.|AVENUE)\s*/i, '')
        .replace(/^(RUA|R|R\.)\s*/i, '')
        .replace(/^(PRAÇA|PRC|PRACA)\s*/i, '')
        .replace(/^(ESTRADA|EST|EST\.)\s*/i, '')
        .trim();

      // Search condominiums
      const { data: condominios } = await supabase
        .from('condominios_mapeamento')
        .select('logradouro_padrao, nome_condominio, microbairro')
        .or(`nome_condominio.ilike.%${searchTerm}%,logradouro_padrao.ilike.%${searchTerm}%`)
        .limit(10);

      // Search streets from transactions - incluir total_transacoes para contagem correta
      const { data: streets } = await supabase
        .from('itbi_transactions')
        .select('logradouro, total_transacoes')
        .eq('uso', 'Residencial')
        .ilike('bairro', bairro)
        .ilike('logradouro', `%${searchTerm}%`)
        .limit(100);

      // Group and SUM total_transacoes (not count records)
      const streetCounts = (streets || []).reduce((acc, s) => {
        acc[s.logradouro] = (acc[s.logradouro] || 0) + (s.total_transacoes || 1);
        return acc;
      }, {} as Record<string, number>);

      // Create suggestions map
      const condMap = new Map((condominios || []).map(c => [c.logradouro_padrao, c]));

      const suggestions = Object.entries(streetCounts)
        .map(([logradouro, count]) => {
          const cond = condMap.get(logradouro);
          return {
            logradouro,
            total_transacoes: count,
            nome_condominio: cond?.nome_condominio,
            microbairro: cond?.microbairro,
          };
        })
        .sort((a, b) => {
          if (a.nome_condominio && !b.nome_condominio) return -1;
          if (!a.nome_condominio && b.nome_condominio) return 1;
          return b.total_transacoes - a.total_transacoes;
        })
        .slice(0, 10);

      return new Response(
        JSON.stringify({ success: true, suggestions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle stats request.
    // Mesma amostra e mesma estatística do motor interno (supabase/functions/_shared):
    // 5 anos fechados (ano corrente só quando a amostra é fina), piso e teto por bairro,
    // ordenação explícita e limite de linhas, corte IQR e faixa P10 / mediana / P90.
    const window = buildMarketWindow();
    const bairroNormalizado = bairro.toUpperCase().trim();
    const { piso, teto } = getOutlierLimits(bairroNormalizado);

    let statsQuery = supabase
      .from("itbi_transactions")
      .select("valor_m2, valor_transacao, total_transacoes, data_transacao, bairro, tipologia")
      .eq("bairro", bairroNormalizado)
      .eq("uso", "Residencial")
      .gte("percentual_transferido", 90)
      .not("valor_m2", "is", null)
      .gte("valor_m2", piso)
      .lte("valor_m2", teto)
      .gte("data_transacao", window.start)
      .lte("data_transacao", window.end)
      .order("data_transacao", { ascending: false })
      .order("logradouro", { ascending: true })
      .order("tipologia", { ascending: true })
      .limit(MAX_ROWS);

    if (logradouro && typeof logradouro === 'string' && logradouro.length <= 200) {
      statsQuery = statsQuery.ilike("logradouro", `%${logradouro.trim()}%`);
    }

    const tipologiaFiltro = tipologia && typeof tipologia === 'string' && tipologia !== "Todos" ? tipologia : null;
    if (tipologiaFiltro) {
      statsQuery = statsQuery.ilike("tipologia", `%${tipologiaFiltro}%`);
    }

    const { data, error } = await statsQuery;

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar dados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rows = (data || []) as MarketRow[];
    if (rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          stats: null,
          message: "Dados insuficientes para esta localização"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selection = selectWindowRows(rows, window);
    const stats = calculateITBIData(selection.rows, {
      method: "iqr",
      meta: {
        data_source: logradouro ? "logradouro" : "bairro",
        bairros_incluidos: collectBairros(selection.rows),
        janela_inicio: selection.janelaInicio,
        janela_fim: selection.janelaFim,
        ano_corrente_incluido: selection.anoCorrenteIncluido,
        tipologia_filtro: tipologiaFiltro,
        tipologia_fallback: false,
        piso_m2: piso,
        teto_m2: teto,
        truncado: rows.length >= MAX_ROWS,
      },
    });

    if (!stats) {
      return new Response(
        JSON.stringify({ success: true, stats: null, message: "Dados insuficientes para esta localização" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          min_m2: stats.min_m2,                 // P10 ponderado
          med_m2: stats.med_m2,                 // MEDIANA ponderada (antes era a média)
          media_ponderada_m2: stats.media_m2,
          mediana_ponderada_m2: stats.med_m2,
          max_m2: stats.max_m2,                 // P90 ponderado
          transaction_count: stats.transaction_count,
          meta: stats.meta,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
