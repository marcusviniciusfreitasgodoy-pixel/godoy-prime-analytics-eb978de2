import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  MAX_ROWS,
  buildRollingWindow,
  MAX_WINDOW_MONTHS,
  normalizeWindowMonths,
  calculateITBIData,
  collectBairros,
  deflateRows,
  selectRollingWindowRows,
  type MarketRow,
  type PriceIndexPoint,
} from "../_shared/itbiMarketStats.ts";
import {
  DEFAULT_OUTLIER_MAX,
  DEFAULT_OUTLIER_MIN,
  getOutlierLimits,
  getStreetOutlierLimits,
} from "../_shared/outlierLimits.ts";

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
    // 5 anos fechados (ano corrente só quando a amostra é fina), ordenação
    // explícita e limite de linhas, corte MAD em log e faixa P10 / mediana / P95.
    // Piso e teto: por bairro × tipologia; com logradouro informado, calibrados
    // pela própria amostra da rua quando ela tem escrituras suficientes.
    // Janela móvel: padrão 12 meses (24/36/48/60 sob demanda). A consulta traz
    // sempre o máximo e o recorte é feito depois, com expansão automática
    // quando a janela pedida não tem amostra suficiente.
    const janelaMeses = normalizeWindowMonths(janela_meses);
    const window = buildRollingWindow(MAX_WINDOW_MONTHS);
    const bairroNormalizado = bairro.toUpperCase().trim();
    const tipologiaFiltro = tipologia && typeof tipologia === 'string' && tipologia !== "Todos" ? tipologia : null;
    const limitesBairro = getOutlierLimits(bairroNormalizado, tipologiaFiltro);
    const logradouroFiltro =
      logradouro && typeof logradouro === 'string' && logradouro.trim().length > 0 && logradouro.length <= 200
        ? logradouro.trim()
        : null;

    const baseQuery = () => {
      let q = supabase
        .from("itbi_transactions")
        .select("valor_m2, valor_transacao, total_transacoes, data_transacao, bairro, tipologia")
        .eq("bairro", bairroNormalizado)
        .eq("uso", "Residencial")
        .gte("percentual_transferido", 90)
        .not("valor_m2", "is", null)
        .gte("data_transacao", window.start)
        .lte("data_transacao", window.end)
        .order("data_transacao", { ascending: false })
        .order("logradouro", { ascending: true })
        .order("tipologia", { ascending: true })
        .limit(MAX_ROWS);
      if (logradouroFiltro) q = q.ilike("logradouro", `%${logradouroFiltro}%`);
      if (tipologiaFiltro) q = q.ilike("tipologia", `%${tipologiaFiltro}%`);
      return q;
    };

    // Sem logradouro: corte direto no banco pelos limites do bairro.
    // Com logradouro: busca na faixa ampla e recorta com os limites da rua.
    const statsQuery = logradouroFiltro
      ? baseQuery().gte("valor_m2", DEFAULT_OUTLIER_MIN).lte("valor_m2", DEFAULT_OUTLIER_MAX)
      : baseQuery().gte("valor_m2", limitesBairro.piso).lte("valor_m2", limitesBairro.teto);

    const { data, error } = await statsQuery;

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar dados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rowsBrutas = (data || []) as MarketRow[];
    const limites = logradouroFiltro
      ? getStreetOutlierLimits(rowsBrutas, limitesBairro)
      : { ...limitesBairro, escopo: "bairro" as const, escrituras: 0 };
    const piso = limites.piso;
    const teto = limites.teto;

    const rows = logradouroFiltro
      ? rowsBrutas.filter((r) => {
          const v = Number(r.valor_m2);
          return Number.isFinite(v) && v >= piso && v <= teto;
        })
      : rowsBrutas;

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

    const selection = selectRollingWindowRows(rows, janelaMeses);
    if (selection.rows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, stats: null, message: "Dados insuficientes para esta localização" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Índice de preços (best effort): sem a view, calcula sem correção temporal.
    let priceIndex: PriceIndexPoint[] | null = null;
    const { data: indexRows, error: indexError } = await supabase
      .from("itbi_price_index")
      .select("trimestre, ln_mediana, escrituras")
      .order("trimestre", { ascending: true });
    if (indexError) {
      console.warn("[public-itbi-stats] índice indisponível:", indexError.message);
    } else {
      priceIndex = (indexRows || []).map((r: any) => ({
        trimestre: String(r.trimestre),
        ln_mediana: Number(r.ln_mediana),
        escrituras: Number(r.escrituras) || 0,
      }));
    }
    const deflation = deflateRows(selection.rows, priceIndex);

    const stats = calculateITBIData(deflation.rows, {
      method: "mad", // mesmo padrão do motor interno (calibrado em 2026-09-02)
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
        limites_escopo: limites.escopo,
        limites_bairro: { piso: limitesBairro.piso, teto: limitesBairro.teto },
        truncado: rowsBrutas.length >= MAX_ROWS,

        deflacionado: deflation.aplicado,
        trimestre_referencia: deflation.trimestreReferencia,
        janela_meses: selection.janelaMeses,
        janela_meses_solicitada: selection.janelaSolicitadaMeses,
        janela_expandida: selection.expandidoAutomaticamente,
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
          max_m2: stats.max_m2,                 // P95 ponderado
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
