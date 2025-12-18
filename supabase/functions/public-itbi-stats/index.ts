import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

      // Search streets from transactions
      const { data: streets } = await supabase
        .from('itbi_transactions')
        .select('logradouro')
        .eq('uso', 'Residencial')
        .ilike('bairro', bairro)
        .ilike('logradouro', `%${searchTerm}%`)
        .limit(100);

      // Group and count streets
      const streetCounts = (streets || []).reduce((acc, s) => {
        acc[s.logradouro] = (acc[s.logradouro] || 0) + 1;
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

    // Handle stats request
    const dateLimit = new Date();
    dateLimit.setFullYear(dateLimit.getFullYear() - 1);
    const dateLimitStr = dateLimit.toISOString().split("T")[0];
    
    let statsQuery = supabase
      .from("itbi_transactions")
      .select("valor_m2, total_transacoes")
      .eq("bairro", bairro.toUpperCase().trim())
      .eq("uso", "Residencial")
      .gte("percentual_transferido", 90)
      .not("valor_m2", "is", null)
      .gte("data_transacao", dateLimitStr);
    
    if (logradouro && typeof logradouro === 'string' && logradouro.length <= 200) {
      statsQuery = statsQuery.ilike("logradouro", `%${logradouro.trim()}%`);
    }
    
    if (tipologia && typeof tipologia === 'string' && tipologia !== "Todos") {
      statsQuery = statsQuery.ilike("tipologia", `%${tipologia}%`);
    }
    
    const { data, error } = await statsQuery;
    
    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar dados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          stats: null,
          message: "Dados insuficientes para esta localização"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const valores = data.map((d) => d.valor_m2 as number).sort((a, b) => a - b);
    const totalTransacoes = data.reduce((sum, d) => sum + (d.total_transacoes || 1), 0);
    
    const min_m2 = valores[Math.floor(valores.length * 0.1)] || valores[0];
    const max_m2 = valores[Math.floor(valores.length * 0.9)] || valores[valores.length - 1];
    const med_m2 = valores.reduce((a, b) => a + b, 0) / valores.length;
    
    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          min_m2: Math.round(min_m2),
          med_m2: Math.round(med_m2),
          max_m2: Math.round(max_m2),
          transaction_count: totalTransacoes,
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