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

      // Search streets from transactions - CORRIGIDO: incluir total_transacoes para contagem correta
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
    
    // Cada linha é um agregado de escrituras -> ponderar por total_transacoes
    const registros = data
      .map((d) => ({ valor: d.valor_m2 as number, peso: (d.total_transacoes as number) || 1 }))
      .sort((a, b) => a.valor - b.valor);

    const totalTransacoes = registros.reduce((sum, r) => sum + r.peso, 0);

    // Percentis ponderados
    const percentilPonderado = (p: number) => {
      const alvo = totalTransacoes * p;
      let acumulado = 0;
      for (const r of registros) {
        acumulado += r.peso;
        if (acumulado >= alvo) return r.valor;
      }
      return registros[registros.length - 1].valor;
    };

    const min_m2 = percentilPonderado(0.1);
    const max_m2 = percentilPonderado(0.9);
    // Média ponderada pelo nº de escrituras (antes era média aritmética simples)
    const media_ponderada_m2 =
      registros.reduce((sum, r) => sum + r.valor * r.peso, 0) / totalTransacoes;
    const mediana_ponderada_m2 = percentilPonderado(0.5);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          min_m2: Math.round(min_m2),
          // med_m2 mantido por compatibilidade: representa a MÉDIA ponderada
          med_m2: Math.round(media_ponderada_m2),
          media_ponderada_m2: Math.round(media_ponderada_m2),
          mediana_ponderada_m2: Math.round(mediana_ponderada_m2),
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