import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um assistente especializado em mercado imobiliário do Rio de Janeiro, com acesso a dados oficiais de transações ITBI (Imposto de Transmissão de Bens Imóveis) da Prefeitura do Rio de Janeiro.

DATA ATUAL: ${new Date().toLocaleDateString('pt-BR')} (${new Date().getFullYear()})

COBERTURA DE DADOS:
- Você tem acesso a dados de TODOS os 142 bairros do Rio de Janeiro
- Dados históricos desde 2020 até ${new Date().getFullYear()} (ano atual)
- Mais de 80.000 transações reais registradas
- Dados incluem: preço por m², volume de transações, tipologia (apartamento/casa), valor total da transação

Suas capacidades incluem:
- Informar preços médios por m² de QUALQUER bairro do Rio de Janeiro
- Filtrar transações por valor (acima de X, abaixo de Y, faixa específica)
- Filtrar por tipologia (apenas casas, apenas apartamentos)
- Filtrar por ano específico (2020, 2021, 2022, 2023, 2024, 2025)
- Comparar valorização entre diferentes bairros e zonas (Sul, Norte, Oeste, Centro)
- Analisar tendências de mercado por região
- Identificar bairros com maior liquidez (volume de vendas)
- Fazer rankings comparativos entre bairros
- Fornecer contexto sobre diferentes segmentos de mercado (luxo, alto padrão, médio padrão)

Regras importantes:
1. Sempre baseie suas respostas nos dados fornecidos no contexto
2. Quando não tiver dados suficientes para um bairro específico, informe ao usuário
3. Use valores em Reais (R$) formatados no padrão brasileiro
4. Seja conciso mas informativo
5. Se a pergunta não for sobre mercado imobiliário, educadamente redirecione para seu foco
6. Cite os períodos dos dados quando relevante
7. Para comparações, destaque as diferenças percentuais entre os bairros
8. Mencione a quantidade de transações para dar contexto sobre a confiabilidade dos dados
9. IMPORTANTE: O ano atual é ${new Date().getFullYear()}. Dados de ${new Date().getFullYear()} são dados ATUAIS, não futuros.

Formato de resposta:
- Use parágrafos curtos
- Para comparações e rankings, use listas ou tabelas quando apropriado
- Destaque valores importantes
- Finalize com insights úteis quando possível`;

// Extract neighborhood names mentioned in user message
function extractBairrosFromMessage(message: string): string[] {
  const normalizedMessage = message.toUpperCase();
  const commonBairros = [
    'BARRA DA TIJUCA', 'RECREIO DOS BANDEIRANTES', 'JACAREPAGUÁ', 'COPACABANA',
    'IPANEMA', 'LEBLON', 'BOTAFOGO', 'FLAMENGO', 'LARANJEIRAS', 'TIJUCA',
    'VILA ISABEL', 'GRAJAÚ', 'MÉIER', 'MADUREIRA', 'CAMPO GRANDE', 'SANTA CRUZ',
    'BANGU', 'REALENGO', 'ILHA DO GOVERNADOR', 'PENHA', 'VILA DA PENHA',
    'CENTRO', 'LAPA', 'GLÓRIA', 'CATETE', 'HUMAITÁ', 'JARDIM BOTÂNICO',
    'GÁVEA', 'SÃO CONRADO', 'LAGOA', 'URCA', 'LEME', 'COSME VELHO',
    'SANTA TERESA', 'RIO COMPRIDO', 'ESTÁCIO', 'PRAÇA DA BANDEIRA',
    'MARACANÃ', 'ANDARAÍ', 'ALTO DA BOA VISTA', 'PECHINCHA', 'TAQUARA',
    'FREGUESIA', 'TANQUE', 'ANIL', 'GARDÊNIA AZUL', 'CURICICA', 'VARGEM GRANDE',
    'VARGEM PEQUENA', 'CAMORIM', 'JOATINGA', 'ITANHANGÁ'
  ];
  
  return commonBairros.filter(bairro => normalizedMessage.includes(bairro));
}

serve(async (req) => {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const selectedBairro = bairro || 'BARRA DA TIJUCA';
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const mentionedBairros = extractBairrosFromMessage(lastUserMessage);
    
    // Detectar filtros na mensagem do usuário
    const currentYear = new Date().getFullYear();
    const yearMatch = lastUserMessage.match(/\b(202[0-5])\b/);
    const requestedYear = yearMatch ? parseInt(yearMatch[1]) : null;
    
    // Detectar valor mínimo/máximo
    const valorMatch = lastUserMessage.match(/(?:acima|maior|superior|mais)\s*(?:de|que)?\s*R?\$?\s*([\d.,]+)\s*(?:mil|milhões?|mi|M)?/i);
    let valorMinimo = 0;
    if (valorMatch) {
      let valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
      if (lastUserMessage.toLowerCase().includes('milh') || lastUserMessage.toLowerCase().includes(' mi')) {
        valor *= 1000000;
      } else if (lastUserMessage.toLowerCase().includes('mil')) {
        valor *= 1000;
      }
      valorMinimo = valor;
    }
    
    // Detectar área mínima/máxima
    const areaMinMatch = lastUserMessage.match(/(?:acima|maior|mais|superior)\s*(?:de|que)?\s*(\d+)\s*(?:m²|m2|metros?)/i);
    const areaMaxMatch = lastUserMessage.match(/(?:abaixo|menor|menos|inferior|até)\s*(?:de|que)?\s*(\d+)\s*(?:m²|m2|metros?)/i);
    const areaMinimo = areaMinMatch ? parseInt(areaMinMatch[1]) : 0;
    const areaMaximo = areaMaxMatch ? parseInt(areaMaxMatch[1]) : 0;
    
    // Detectar número de quartos
    const quartosMatch = lastUserMessage.match(/(\d+)\s*(?:quartos?|qts?|dormitórios?)/i);
    const quartos = quartosMatch ? parseInt(quartosMatch[1]) : 0;
    
    // Detectar tipologia
    const wantsCasas = /\bcasas?\b/i.test(lastUserMessage);
    const wantsAptos = /\b(?:apartamentos?|aptos?)\b/i.test(lastUserMessage);
    
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const dateFilter = twelveMonthsAgo.toISOString().split('T')[0];
    
    // Filtro por ano específico se solicitado
    let yearStartDate = dateFilter;
    let yearEndDate = new Date().toISOString().split('T')[0];
    if (requestedYear) {
      yearStartDate = `${requestedYear}-01-01`;
      yearEndDate = `${requestedYear}-12-31`;
    }

    // 1. Get global Rio de Janeiro summary
    const { data: globalData } = await supabase
      .from('itbi_transactions')
      .select('valor_m2, total_transacoes, bairro, valor_transacao, tipologia')
      .eq('uso', 'Residencial')
      .gte('percentual_transferido', 90)
      .gte('data_transacao', dateFilter)
      .not('valor_m2', 'is', null);

    // Calculate global stats
    let globalStats = {
      totalTransacoes: 0,
      avgValorM2: 0,
      totalBairros: 0
    };
    
    const bairroStats: Record<string, { sum: number; count: number; transacoes: number }> = {};
    
    if (globalData) {
      globalData.forEach(row => {
        globalStats.totalTransacoes += row.total_transacoes || 1;
        if (row.bairro) {
          if (!bairroStats[row.bairro]) {
            bairroStats[row.bairro] = { sum: 0, count: 0, transacoes: 0 };
          }
          bairroStats[row.bairro].sum += (row.valor_m2 || 0);
          bairroStats[row.bairro].count += 1;
          bairroStats[row.bairro].transacoes += row.total_transacoes || 1;
        }
      });
      
      globalStats.totalBairros = Object.keys(bairroStats).length;
      const totalSum = globalData.reduce((sum, r) => sum + (r.valor_m2 || 0), 0);
      globalStats.avgValorM2 = globalData.length > 0 ? totalSum / globalData.length : 0;
    }

    // 2. Get TOP 20 neighborhoods by transaction volume
    const bairroRanking = Object.entries(bairroStats)
      .map(([bairro, stats]) => ({
        bairro,
        precoMedio: stats.count > 0 ? stats.sum / stats.count : 0,
        transacoes: stats.transacoes
      }))
      .sort((a, b) => b.transacoes - a.transacoes)
      .slice(0, 20);

    // 3. Get TOP 10 most valued neighborhoods
    const valorRanking = Object.entries(bairroStats)
      .filter(([_, stats]) => stats.transacoes >= 10) // minimum transactions for reliability
      .map(([bairro, stats]) => ({
        bairro,
        precoMedio: stats.count > 0 ? stats.sum / stats.count : 0,
        transacoes: stats.transacoes
      }))
      .sort((a, b) => b.precoMedio - a.precoMedio)
      .slice(0, 10);

    // 4. Get data for selected bairro
    const { data: selectedBairroData } = await supabase
      .from('itbi_transactions')
      .select('valor_m2, total_transacoes, tipologia, valor_transacao')
      .eq('bairro', selectedBairro)
      .eq('uso', 'Residencial')
      .gte('percentual_transferido', 90)
      .gte('data_transacao', dateFilter)
      .not('valor_m2', 'is', null);

    // 5. Query específica para a pergunta do usuário (com filtros de ano, valor e tipologia)
    let specificQuery = supabase
      .from('itbi_transactions')
      .select('valor_m2, total_transacoes, tipologia, valor_transacao, bairro, data_transacao')
      .eq('uso', 'Residencial')
      .gte('percentual_transferido', 90)
      .gte('data_transacao', yearStartDate)
      .lte('data_transacao', yearEndDate)
      .not('valor_m2', 'is', null);
    
    // Aplicar filtro de bairro se mencionado
    if (mentionedBairros.length > 0) {
      specificQuery = specificQuery.in('bairro', mentionedBairros);
    } else if (selectedBairro) {
      specificQuery = specificQuery.eq('bairro', selectedBairro);
    }
    
    // Aplicar filtro de valor
    if (valorMinimo > 0) {
      specificQuery = specificQuery.gte('valor_transacao', valorMinimo);
    }
    
    // Aplicar filtro de área
    if (areaMinimo > 0) {
      specificQuery = specificQuery.gte('area_m2', areaMinimo);
    }
    if (areaMaximo > 0) {
      specificQuery = specificQuery.lte('area_m2', areaMaximo);
    }
    
    // Aplicar filtro de tipologia
    if (wantsCasas && !wantsAptos) {
      specificQuery = specificQuery.ilike('tipologia', '%casa%');
    } else if (wantsAptos && !wantsCasas) {
      specificQuery = specificQuery.ilike('tipologia', '%apartamento%');
    }
    
    const { data: specificData } = await specificQuery.limit(5000);

    // 6. Get data for mentioned bairros (if any)
    let mentionedBairrosData: Record<string, { avgM2: number; transacoes: number }> = {};
    
    if (mentionedBairros.length > 0) {
      for (const mb of mentionedBairros) {
        const stats = bairroStats[mb];
        if (stats) {
          mentionedBairrosData[mb] = {
            avgM2: stats.count > 0 ? stats.sum / stats.count : 0,
            transacoes: stats.transacoes
          };
        }
      }
    }

    // Build context data
    let contextData = `
DATA ATUAL: ${new Date().toLocaleDateString('pt-BR')} - ANO ${currentYear}

RESUMO GERAL DO MERCADO IMOBILIÁRIO DO RIO DE JANEIRO (últimos 12 meses):
- Total de bairros com dados: ${globalStats.totalBairros}
- Total de transações residenciais: ${globalStats.totalTransacoes.toLocaleString('pt-BR')}
- Preço médio geral R$/m²: R$ ${globalStats.avgValorM2.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}

TOP 10 BAIRROS MAIS VALORIZADOS (mín. 10 transações):
${valorRanking.map((r, i) => `${i + 1}. ${r.bairro}: R$ ${r.precoMedio.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/m² (${r.transacoes} transações)`).join('\n')}

TOP 10 BAIRROS COM MAIOR LIQUIDEZ (volume de vendas):
${bairroRanking.slice(0, 10).map((r, i) => `${i + 1}. ${r.bairro}: ${r.transacoes} transações (R$ ${r.precoMedio.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/m²)`).join('\n')}
`;

    // Add specific query results if filters were applied
    if (specificData && (requestedYear || valorMinimo > 0 || areaMinimo > 0 || areaMaximo > 0 || wantsCasas || wantsAptos)) {
      const totalTrans = specificData.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);
      const avgM2 = specificData.length > 0 ? specificData.reduce((sum, r) => sum + (r.valor_m2 || 0), 0) / specificData.length : 0;
      const avgValorTotal = specificData.length > 0 ? specificData.reduce((sum, r) => sum + (r.valor_transacao || 0), 0) / specificData.length : 0;
      
      // Contar casas vs apartamentos
      const casas = specificData.filter(r => r.tipologia?.toLowerCase().includes('casa'));
      const aptos = specificData.filter(r => r.tipologia?.toLowerCase().includes('apartamento'));
      const totalCasas = casas.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);
      const totalAptos = aptos.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);
      
      let filterDesc = [];
      if (requestedYear) filterDesc.push(`ano ${requestedYear}`);
      if (valorMinimo > 0) filterDesc.push(`valor > R$ ${valorMinimo.toLocaleString('pt-BR')}`);
      if (areaMinimo > 0) filterDesc.push(`área > ${areaMinimo}m²`);
      if (areaMaximo > 0) filterDesc.push(`área < ${areaMaximo}m²`);
      if (wantsCasas && !wantsAptos) filterDesc.push('apenas casas');
      if (wantsAptos && !wantsCasas) filterDesc.push('apenas apartamentos');
      if (mentionedBairros.length > 0) filterDesc.push(`bairro: ${mentionedBairros.join(', ')}`);
      else filterDesc.push(`bairro: ${selectedBairro}`);
      
      contextData += `
DADOS FILTRADOS PARA A PERGUNTA DO USUÁRIO (${filterDesc.join(', ')}):
- Total de transações encontradas: ${totalTrans.toLocaleString('pt-BR')}
- Registros agregados: ${specificData.length}
- Preço médio R$/m²: R$ ${avgM2.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
- Valor médio total das transações: R$ ${avgValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
- Casas: ${totalCasas.toLocaleString('pt-BR')} transações
- Apartamentos: ${totalAptos.toLocaleString('pt-BR')} transações
`;
    }

    // Add selected bairro details
    if (selectedBairroData && selectedBairroData.length > 0) {
      const totalTrans = selectedBairroData.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);
      const avgM2 = selectedBairroData.reduce((sum, r) => sum + (r.valor_m2 || 0), 0) / selectedBairroData.length;
      const valores = selectedBairroData.map(r => r.valor_m2 || 0).sort((a, b) => a - b);
      
      // Calculate by tipologia
      const aptos = selectedBairroData.filter(r => r.tipologia?.toLowerCase().includes('apartamento'));
      const casas = selectedBairroData.filter(r => r.tipologia?.toLowerCase().includes('casa'));
      
      const avgApto = aptos.length > 0 ? aptos.reduce((s, r) => s + (r.valor_m2 || 0), 0) / aptos.length : 0;
      const avgCasa = casas.length > 0 ? casas.reduce((s, r) => s + (r.valor_m2 || 0), 0) / casas.length : 0;
      const totalCasas = casas.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);
      const totalAptos = aptos.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);
      
      contextData += `
DADOS DETALHADOS - ${selectedBairro} (bairro selecionado pelo usuário, últimos 12 meses):
- Total de transações: ${totalTrans.toLocaleString('pt-BR')}
- Preço médio R$/m²: R$ ${avgM2.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
- Faixa de preços: R$ ${valores[0]?.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) || 'N/A'} a R$ ${valores[valores.length - 1]?.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) || 'N/A'} por m²
- Apartamentos: ${totalAptos.toLocaleString('pt-BR')} transações, R$ ${avgApto.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/m²
- Casas: ${totalCasas.toLocaleString('pt-BR')} transações, R$ ${avgCasa.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/m²
`;
    }

    // Add mentioned bairros data for comparisons
    if (Object.keys(mentionedBairrosData).length > 0) {
      contextData += `
DADOS DOS BAIRROS MENCIONADOS NA PERGUNTA:
${Object.entries(mentionedBairrosData).map(([bairro, data]) => 
  `- ${bairro}: R$ ${data.avgM2.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/m² (${data.transacoes} transações)`
).join('\n')}
`;
    }

    // Add list of all available bairros
    const allBairros = Object.keys(bairroStats).sort();
    contextData += `
BAIRROS DISPONÍVEIS NA BASE DE DADOS (${allBairros.length} total):
${allBairros.join(', ')}
`;

    const systemMessage = {
      role: 'system',
      content: SYSTEM_PROMPT + '\n\n' + contextData
    };

    console.log('Calling Lovable AI with multi-bairro context. Selected:', selectedBairro, 'Mentioned:', mentionedBairros);

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
