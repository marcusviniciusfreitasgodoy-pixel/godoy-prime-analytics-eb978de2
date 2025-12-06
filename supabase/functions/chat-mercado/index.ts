import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um assistente especializado em mercado imobiliário do Rio de Janeiro, especialmente na região da Barra da Tijuca e adjacências.

Você tem acesso a dados oficiais de transações ITBI (Imposto de Transmissão de Bens Imóveis) da Prefeitura do Rio de Janeiro desde 2020.

Suas capacidades incluem:
- Informar preços médios por m² de diferentes bairros e microbairros
- Comparar valorização entre regiões
- Analisar tendências de mercado
- Identificar microbairros com maior liquidez (volume de vendas)
- Responder sobre tipologias (apartamentos, casas)
- Fornecer contexto sobre o mercado de alto padrão

Regras importantes:
1. Sempre baseie suas respostas nos dados fornecidos
2. Quando não tiver dados suficientes, informe ao usuário
3. Use valores em Reais (R$) formatados no padrão brasileiro
4. Seja conciso mas informativo
5. Se a pergunta não for sobre mercado imobiliário, educadamente redirecione para seu foco
6. Cite os períodos dos dados quando relevante

Formato de resposta:
- Use parágrafos curtos
- Para comparações, use listas quando apropriado
- Destaque valores importantes
- Finalize com insights úteis quando possível`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, bairro } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client for data queries
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch relevant market data for context
    const selectedBairro = bairro || 'BARRA DA TIJUCA';
    
    // Get KPI data (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const { data: kpiData } = await supabase
      .from('itbi_transactions')
      .select('valor_m2, total_transacoes, data_transacao, logradouro, tipologia')
      .eq('bairro', selectedBairro)
      .eq('uso', 'Residencial')
      .gte('percentual_transferido', 90)
      .gte('data_transacao', twelveMonthsAgo.toISOString().split('T')[0])
      .not('valor_m2', 'is', null);

    // Get ranking data
    const { data: rankingData } = await supabase
      .from('view_ranking_microbairros')
      .select('*')
      .order('preco_medio_m2', { ascending: false })
      .limit(10);

    // Calculate statistics
    let contextData = '';
    if (kpiData && kpiData.length > 0) {
      const totalTransacoes = kpiData.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);
      const avgValorM2 = kpiData.reduce((sum, r) => sum + (r.valor_m2 || 0), 0) / kpiData.length;
      const valores = kpiData.map(r => r.valor_m2 || 0).sort((a, b) => a - b);
      const minValor = valores[0];
      const maxValor = valores[valores.length - 1];
      
      contextData = `
DADOS DO MERCADO (últimos 12 meses - ${selectedBairro}):
- Total de transações: ${totalTransacoes.toLocaleString('pt-BR')}
- Preço médio R$/m²: R$ ${avgValorM2.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
- Faixa de preços: R$ ${minValor.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} a R$ ${maxValor.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} por m²
`;
    }

    if (rankingData && rankingData.length > 0) {
      contextData += `
RANKING DE MICROBAIRROS (por valorização):
${rankingData.map((r, i) => `${i + 1}. ${r.microbairro}: R$ ${(r.preco_medio_m2 || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })} /m² (${r.total_transacoes || 0} transações)`).join('\n')}
`;
    }

    // Build messages with context
    const systemMessage = {
      role: 'system',
      content: SYSTEM_PROMPT + '\n\n' + contextData
    };

    console.log('Calling Lovable AI with context for:', selectedBairro);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [systemMessage, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos no workspace Lovable.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Chat mercado error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
