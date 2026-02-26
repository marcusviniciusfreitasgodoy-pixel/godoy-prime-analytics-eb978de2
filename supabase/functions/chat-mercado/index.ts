import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const currentYear = new Date().getFullYear();
const currentDate = new Date().toLocaleDateString('pt-BR');

const SYSTEM_PROMPT_BASE = `Você é a SOFIA, assistente virtual especializada em mercado imobiliário do Rio de Janeiro da Godoy Prime Realty. Você é uma EXPERT em:
- Transações imobiliárias (compra, venda, locação)
- Documentação imobiliária (certidões, escrituras, registros)
- Legislação imobiliária brasileira (Lei do Inquilinato, Código Civil, ITBI)
- Avaliação de imóveis (metodologia NBR 14653, fatores de valorização)
- Due diligence imobiliária
- Análise de contratos de compra e venda
- Financiamento imobiliário (SBPE, FGTS, tabelas SAC e PRICE)

SUA PERSONALIDADE:
- Você é simpática, profissional e objetiva
- Trate o usuário de forma cordial e próxima
- Use um tom amigável mas mantenha a credibilidade técnica
- Seja didática ao explicar conceitos complexos
- Quando apropriado, alerte sobre riscos e recomende consulta a especialistas

DATA ATUAL: ${currentDate} (${currentYear})

COBERTURA DE DADOS ITBI:
- Dados de TODOS os 142 bairros do Rio de Janeiro
- Dados históricos desde 2020 até ${currentYear} (ano atual)
- Mais de 80.000 transações reais registradas
- Dados incluem: preço por m², volume de transações, tipologia, valor total
- Dados de condomínios mapeados com nome, microbairro e padrão construtivo

SUAS CAPACIDADES TÉCNICAS:
📊 ANÁLISE DE MERCADO:
- Preços médios por m² de qualquer bairro/rua/condomínio
- Filtrar por valor, área, tipologia, ano
- Comparar valorização entre regiões
- Rankings e tendências de mercado

📋 DOCUMENTAÇÃO IMOBILIÁRIA:
- Explicar cada documento necessário para transações
- Orientar sobre onde obter certidões e custos
- Alertar sobre pendências documentais e riscos
- Esclarecer prazos e validades

⚖️ LEGISLAÇÃO:
- Lei do Inquilinato (8.245/91)
- Código Civil (contratos, posse, propriedade)
- Tributação (ITBI, IPTU, Imposto de Renda)
- Direitos e deveres de compradores/vendedores/locatários

🏠 AVALIAÇÃO:
- Metodologia de avaliação (NBR 14653)
- Fatores de valorização e depreciação
- Interpretação de laudos avaliatórios

💰 FINANCIAMENTO:
- Sistemas SAC e PRICE
- Uso de FGTS
- Taxas e condições bancárias
- Simulações básicas

REGRAS IMPORTANTES:
1. Sempre baseie respostas em dados quando disponíveis
2. Quando não tiver dados de um condomínio específico, informe que NÃO HÁ DADOS NA BASE para aquele condomínio - NÃO invente desculpas sobre "privacidade" ou "políticas de segurança"
3. Os dados do ITBI são PÚBLICOS (fonte: Prefeitura do Rio) - você pode e deve compartilhá-los
4. Use valores em Reais (R$) formatados no padrão brasileiro
5. Para questões jurídicas complexas, recomende consulta a advogado
6. Para avaliações formais, recomende perito avaliador credenciado
7. O ano atual é ${currentYear} - dados de ${currentYear} são ATUAIS
8. NUNCA diga que não pode fornecer dados por "privacidade" - os dados do ITBI são registros públicos oficiais`;

const TEXT_FORMAT_INSTRUCTIONS = `
FORMATAÇÃO DE RESPOSTAS (TEXTO):
- Use **negrito** para valores importantes
- Para comparações, use TABELAS markdown
- Use listas numeradas para rankings
- Use emojis moderadamente: 📈 📉 🏠 🏢 📍 ⚠️ ✅ 📋
- Agrupe informações em seções quando necessário
- Finalize com insights ou recomendações práticas`;

const VOICE_FORMAT_INSTRUCTIONS = `
FORMATAÇÃO DE RESPOSTAS (VOZ - MUITO IMPORTANTE):
Esta resposta será FALADA em voz alta, então siga estas regras OBRIGATÓRIAS:

1. NUNCA use símbolos ou abreviações - escreva por extenso:
   - "R$" → "reais"
   - "m²" → "metros quadrados" 
   - "%" → "por cento"
   - "/" → use palavras como "de", "por", "em"
   - Números grandes: "10.839" → "dez mil oitocentos e trinta e nove"

2. SEJA EXTREMAMENTE CONCISA - máximo 3 frases curtas
   - Responda APENAS o que foi perguntado
   - Não adicione contexto extra ou explicações desnecessárias
   - Vá direto ao ponto

3. Use linguagem NATURAL e FLUIDA para fala:
   - Evite listas ou bullet points
   - Use frases conectadas naturalmente
   - Tom conversacional e amigável

4. NÃO use formatação markdown (negrito, itálico, listas)

5. Exemplo de resposta ideal para voz:
   Pergunta: "Qual o preço médio na Barra?"
   Resposta: "O preço médio na Barra da Tijuca está em torno de dez mil e oitocentos reais por metro quadrado, com base em mais de duas mil transações deste ano."`;

function getSystemPrompt(isVoiceInput: boolean): string {
  return SYSTEM_PROMPT_BASE + (isVoiceInput ? VOICE_FORMAT_INSTRUCTIONS : TEXT_FORMAT_INSTRUCTIONS);
}

// Extract keywords from message for RAG search
function extractKeywordsForRAG(message: string): string[] {
  const keywords: string[] = [];
  const normalizedMessage = message.toLowerCase();
  
  // Document-related keywords
  const docKeywords = ['certidão', 'ônus', 'iptu', 'condomínio', 'habite-se', 'escritura', 
    'registro', 'matrícula', 'documentação', 'documento', 'certidões'];
  // Legal keywords
  const legalKeywords = ['lei', 'inquilinato', 'locação', 'aluguel', 'despejo', 'itbi', 
    'imposto', 'tributo', 'contrato', 'fiança', 'caução'];
  // Valuation keywords
  const valuationKeywords = ['avaliação', 'avaliar', 'laudo', 'nbr', 'metodologia', 
    'valorização', 'depreciação', 'valor'];
  // Market keywords
  const marketKeywords = ['mercado', 'liquidez', 'ciclo', 'tendência', 'indicador',
    'selic', 'financiamento', 'crédito'];
  // Service-related keywords (Prime Buyer Experience, Personal Shopper, etc.)
  const serviceKeywords = ['personal shopper', 'servico', 'serviço', 'prime buyer', 'parecer', 
    'vistoria', 'inspeção', 'inspecao', 'completa', 'como funciona', 'quanto custa', 'custo',
    'preco', 'preço', 'garantia', 'prazo', 'entrega', 'diferenca', 'diferença', 'corretor',
    'representacao', 'representação', 'compra blindada', 'negociacao', 'negociação', 
    'contato', 'agendar', 'telefone', 'whatsapp', 'checklist', 'categorias', 'faq',
    'perguntas', 'duvidas', 'dúvidas', 'marcus godoy', 'economia', 'reembolso'];
  
  [...docKeywords, ...legalKeywords, ...valuationKeywords, ...marketKeywords, ...serviceKeywords].forEach(kw => {
    if (normalizedMessage.includes(kw)) {
      keywords.push(kw);
    }
  });
  
  return keywords;
}

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
    // Initialize Supabase client first (needed for rate limiting)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limiting: 15 requests per minute per IP
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfIp = req.headers.get("cf-connecting-ip");
    const clientIp = cfIp || realIp || forwardedFor?.split(",")[0]?.trim() || "unknown";

    const { data: rlData, error: rlError } = await supabase.rpc('check_rate_limit', {
      p_identifier: clientIp,
      p_function_name: 'chat-mercado',
      p_window_seconds: 60,
      p_max_requests: 15,
    });

    if (!rlError && rlData && rlData.length > 0 && !rlData[0].allowed) {
      console.log(`Rate limit exceeded for chat-mercado: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Aguarde um momento antes de tentar novamente." }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }

    const { messages, bairro, voiceInput } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // Limit message history to prevent abuse via large payloads
    const limitedMessages = messages.slice(-10);
    const lastMsg = limitedMessages[limitedMessages.length - 1]?.content || '';
    if (lastMsg.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Mensagem muito longa. Limite de 2000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const selectedBairro = bairro || 'BARRA DA TIJUCA';
    const lastUserMessage = lastMsg;
    const mentionedBairros = extractBairrosFromMessage(lastUserMessage);
    
    // RAG: Buscar conhecimento relevante na base
    const ragKeywords = extractKeywordsForRAG(lastUserMessage);
    let knowledgeContext = '';
    
    if (ragKeywords.length > 0) {
      console.log('RAG keywords detected:', ragKeywords);
      
      // Busca por keywords
      const { data: knowledgeData } = await supabase
        .from('sofia_knowledge_base')
        .select('category, title, content')
        .eq('is_active', true)
        .overlaps('keywords', ragKeywords)
        .limit(5);
      
      // Busca full-text se não encontrou por keywords
      if (!knowledgeData || knowledgeData.length === 0) {
        const searchTerms = ragKeywords.join(' | ');
        const { data: ftData } = await supabase
          .from('sofia_knowledge_base')
          .select('category, title, content')
          .eq('is_active', true)
          .textSearch('content', searchTerms, { config: 'portuguese' })
          .limit(5);
        
        if (ftData && ftData.length > 0) {
          knowledgeContext = `\n\nCONHECIMENTO ESPECIALIZADO RELEVANTE:\n` +
            ftData.map(k => `📚 ${k.title} (${k.category}):\n${k.content}`).join('\n\n');
        }
      } else {
        knowledgeContext = `\n\nCONHECIMENTO ESPECIALIZADO RELEVANTE:\n` +
          knowledgeData.map(k => `📚 ${k.title} (${k.category}):\n${k.content}`).join('\n\n');
      }
      
      console.log('RAG knowledge found:', knowledgeContext ? 'yes' : 'no');
    }
    
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
    
    // Detectar logradouros mencionados (ruas, avenidas, etc.)
    const logradouroPatterns = [
      /(?:rua|r\.)\s+([a-záéíóúâêîôûãõç\s]+)/gi,
      /(?:avenida|av\.?)\s+([a-záéíóúâêîôûãõç\s]+)/gi,
      /(?:estrada|estr\.?)\s+([a-záéíóúâêîôûãõç\s]+)/gi,
      /(?:praça|pça\.?)\s+([a-záéíóúâêîôûãõç\s]+)/gi,
      /(?:travessa|tv\.?)\s+([a-záéíóúâêîôûãõç\s]+)/gi,
      /(?:alameda|al\.?)\s+([a-záéíóúâêîôûãõç\s]+)/gi,
    ];
    
    let mentionedLogradouros: string[] = [];
    for (const pattern of logradouroPatterns) {
      const matches = lastUserMessage.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 2) {
          // Limpar e normalizar o nome
          const nome = match[1].trim().split(/\s+/).slice(0, 4).join(' '); // Limitar a 4 palavras
          mentionedLogradouros.push(nome.toUpperCase());
        }
      }
    }
    
    // Detectar condomínios mencionados
    // Lista de condomínios conhecidos para detecção direta
    const condominiosConhecidos = [
      'RISERVA', 'RISERVA GOLF', 'RISERVA UNO', 'RISERVA PREMIUN',
      'PENINSULA', 'CIDADE JARDIM', 'MANDALA', 'ATLANTICO SUL',
      'WATERWAYS', 'BLUE', 'STRICTA', 'LONDON GREEN', 'SANTA MONICA',
      'AMERICAS PARK', 'BARRA BONITA', 'GOLDEN GREEN', 'PEDRA DE ITAUNA',
      'NOVA IPANEMA', 'RIVIERA', 'OCEAN FRONT', 'MAUI', 'MONACO',
      'PORTOFINO', 'BARRA BALI', 'JARDIM OCEANICO', 'GRAND HYATT',
      'LE PARC', 'VIA BARRA', 'AREIA BRASIL', 'JARDIM DA BARRA',
      'MANSOES', 'MANSÕES', 'CONDOMINIO MANSOES', 'CONDOMÍNIO MANSÕES',
      'SANTA CECILIA', 'VILA DO PAN', 'BARRA LIFE', 'BARRAMARES',
      'WIND', 'ART LIFE', 'JARDINS DA BARRA', 'SAINT MICHEL',
    ];
    
    let mentionedCondominios: string[] = [];
    const upperMessage = lastUserMessage.toUpperCase();
    for (const cond of condominiosConhecidos) {
      if (upperMessage.includes(cond)) {
        mentionedCondominios.push(cond);
      }
    }
    
    // Também tentar detectar padrão "condomínio X" ou "no X"
    const condPattern = /(?:condomínio|condominio|cond\.?)\s+([a-záéíóúâêîôûãõç\s]+?)(?:\s|,|\.|$)/gi;
    const condMatches = lastUserMessage.matchAll(condPattern);
    for (const match of condMatches) {
      if (match[1] && match[1].trim().length > 3) {
        const nome = match[1].trim().toUpperCase();
        if (!mentionedCondominios.includes(nome) && !['BARRA', 'TIJUCA', 'RIO', 'JANEIRO', 'DA', 'DO', 'DE'].includes(nome)) {
          mentionedCondominios.push(nome);
        }
      }
    }
    // Usar ano atual (YTD) como padrão - alinhado com KPIs do Dashboard
    const currentYearStart = `${currentYear}-01-01`;
    const currentDateStr = new Date().toISOString().split('T')[0];
    
    // Filtro por ano específico se solicitado, senão usar ano atual
    let yearStartDate = currentYearStart;
    let yearEndDate = currentDateStr;
    if (requestedYear && requestedYear !== currentYear) {
      yearStartDate = `${requestedYear}-01-01`;
      yearEndDate = `${requestedYear}-12-31`;
    }

    // 1. Get global Rio de Janeiro summary (ano atual YTD)
    const { data: globalData } = await supabase
      .from('itbi_transactions')
      .select('valor_m2, total_transacoes, bairro, valor_transacao, tipologia')
      .eq('uso', 'Residencial')
      .gte('percentual_transferido', 90)
      .gte('data_transacao', currentYearStart)
      .not('valor_m2', 'is', null);

    // Calculate global stats using WEIGHTED AVERAGES
    let globalStats = {
      totalTransacoes: 0,
      avgValorM2: 0,
      totalBairros: 0
    };
    
    const bairroStats: Record<string, { weightedSum: number; totalTrans: number }> = {};
    
    if (globalData) {
      let globalWeightedSum = 0;
      let globalTotalTrans = 0;
      
      globalData.forEach(row => {
        const trans = row.total_transacoes || 1;
        const valorM2 = row.valor_m2 || 0;
        
        globalStats.totalTransacoes += trans;
        globalWeightedSum += valorM2 * trans;
        globalTotalTrans += trans;
        
        if (row.bairro) {
          if (!bairroStats[row.bairro]) {
            bairroStats[row.bairro] = { weightedSum: 0, totalTrans: 0 };
          }
          bairroStats[row.bairro].weightedSum += valorM2 * trans;
          bairroStats[row.bairro].totalTrans += trans;
        }
      });
      
      globalStats.totalBairros = Object.keys(bairroStats).length;
      globalStats.avgValorM2 = globalTotalTrans > 0 ? globalWeightedSum / globalTotalTrans : 0;
    }

    // 2. Get TOP 20 neighborhoods by transaction volume (using weighted averages)
    const bairroRanking = Object.entries(bairroStats)
      .map(([bairro, stats]) => ({
        bairro,
        precoMedio: stats.totalTrans > 0 ? stats.weightedSum / stats.totalTrans : 0,
        transacoes: stats.totalTrans
      }))
      .sort((a, b) => b.transacoes - a.transacoes)
      .slice(0, 20);

    // 3. Get TOP 10 most valued neighborhoods (using weighted averages)
    const valorRanking = Object.entries(bairroStats)
      .filter(([_, stats]) => stats.totalTrans >= 10) // minimum transactions for reliability
      .map(([bairro, stats]) => ({
        bairro,
        precoMedio: stats.totalTrans > 0 ? stats.weightedSum / stats.totalTrans : 0,
        transacoes: stats.totalTrans
      }))
      .sort((a, b) => b.precoMedio - a.precoMedio)
      .slice(0, 10);

    // 4. Get data for selected bairro (ano atual YTD)
    const { data: selectedBairroData } = await supabase
      .from('itbi_transactions')
      .select('valor_m2, total_transacoes, tipologia, valor_transacao')
      .eq('bairro', selectedBairro)
      .eq('uso', 'Residencial')
      .gte('percentual_transferido', 90)
      .gte('data_transacao', currentYearStart)
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
            avgM2: stats.totalTrans > 0 ? stats.weightedSum / stats.totalTrans : 0,
            transacoes: stats.totalTrans
          };
        }
      }
    }

    // 7. Get data for mentioned logradouros (streets)
    let logradourosData: Record<string, { avgM2: number; transacoes: number; valorMedio: number }> = {};
    
    if (mentionedLogradouros.length > 0) {
      for (const logradouro of mentionedLogradouros) {
        const { data: logData } = await supabase
          .from('itbi_transactions')
          .select('valor_m2, total_transacoes, valor_transacao')
          .ilike('logradouro', `%${logradouro}%`)
          .eq('uso', 'Residencial')
          .gte('percentual_transferido', 90)
          .gte('data_transacao', currentYearStart)
          .not('valor_m2', 'is', null)
          .limit(500);
        
        if (logData && logData.length > 0) {
          const totalTrans = logData.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);
          // Use weighted averages
          const weightedSumM2 = logData.reduce((sum, r) => sum + (r.valor_m2 || 0) * (r.total_transacoes || 1), 0);
          const avgM2 = totalTrans > 0 ? weightedSumM2 / totalTrans : 0;
          const weightedSumValor = logData.reduce((sum, r) => sum + (r.valor_transacao || 0) * (r.total_transacoes || 1), 0);
          const avgValor = totalTrans > 0 ? weightedSumValor / totalTrans : 0;
          
          logradourosData[logradouro] = {
            avgM2,
            transacoes: totalTrans,
            valorMedio: avgValor
          };
        }
      }
    }

    // 8. Get data for mentioned condominios
    let condominiosData: Record<string, { avgM2: number; transacoes: number; valorMedio: number; microbairro: string; padrao: string }> = {};
    
    if (mentionedCondominios.length > 0) {
      for (const cond of mentionedCondominios) {
        // Primeiro buscar o mapeamento do condomínio
        const { data: condMapping } = await supabase
          .from('condominios_mapeamento')
          .select('logradouro_padrao, microbairro, padrao_construtivo, nome_condominio')
          .ilike('nome_condominio', `%${cond}%`)
          .limit(5);
        
        if (condMapping && condMapping.length > 0) {
          // Buscar transações dos logradouros mapeados
          const logradouros = condMapping.map(c => c.logradouro_padrao);
          
          let allCondData: any[] = [];
          for (const log of logradouros) {
            const { data: condTransactions } = await supabase
              .from('itbi_transactions')
              .select('valor_m2, total_transacoes, valor_transacao')
              .ilike('logradouro', `%${log}%`)
              .eq('uso', 'Residencial')
              .gte('percentual_transferido', 90)
              .gte('data_transacao', currentYearStart)
              .not('valor_m2', 'is', null)
              .limit(200);
            
            if (condTransactions) {
              allCondData = [...allCondData, ...condTransactions];
            }
          }
          
          if (allCondData.length > 0) {
            const totalTrans = allCondData.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);
            // Use weighted averages
            const weightedSumM2 = allCondData.reduce((sum, r) => sum + (r.valor_m2 || 0) * (r.total_transacoes || 1), 0);
            const avgM2 = totalTrans > 0 ? weightedSumM2 / totalTrans : 0;
            const weightedSumValor = allCondData.reduce((sum, r) => sum + (r.valor_transacao || 0) * (r.total_transacoes || 1), 0);
            const avgValor = totalTrans > 0 ? weightedSumValor / totalTrans : 0;
            
            condominiosData[condMapping[0].nome_condominio || cond] = {
              avgM2,
              transacoes: totalTrans,
              valorMedio: avgValor,
              microbairro: condMapping[0].microbairro || 'N/A',
              padrao: condMapping[0].padrao_construtivo || 'N/A'
            };
          }
        }
      }
    }

    // Build context data
    let contextData = `
DATA ATUAL: ${new Date().toLocaleDateString('pt-BR')} - ANO ${currentYear}

RESUMO GERAL DO MERCADO IMOBILIÁRIO DO RIO DE JANEIRO (${currentYear} YTD - acumulado do ano):
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
      // Use weighted average: SUM(valor_m2 * total_transacoes) / SUM(total_transacoes)
      const weightedSumM2 = specificData.reduce((sum, r) => sum + (r.valor_m2 || 0) * (r.total_transacoes || 1), 0);
      const avgM2 = totalTrans > 0 ? weightedSumM2 / totalTrans : 0;
      const weightedSumValor = specificData.reduce((sum, r) => sum + (r.valor_transacao || 0) * (r.total_transacoes || 1), 0);
      const avgValorTotal = totalTrans > 0 ? weightedSumValor / totalTrans : 0;
      
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
      // Use weighted average: SUM(valor_m2 * total_transacoes) / SUM(total_transacoes)
      const weightedSumM2 = selectedBairroData.reduce((sum, r) => sum + (r.valor_m2 || 0) * (r.total_transacoes || 1), 0);
      const avgM2 = totalTrans > 0 ? weightedSumM2 / totalTrans : 0;
      const valores = selectedBairroData.map(r => r.valor_m2 || 0).sort((a, b) => a - b);
      
      // Calculate by tipologia using weighted averages
      const aptos = selectedBairroData.filter(r => r.tipologia?.toLowerCase().includes('apartamento'));
      const casas = selectedBairroData.filter(r => r.tipologia?.toLowerCase().includes('casa'));
      
      const totalAptos = aptos.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);
      const totalCasas = casas.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);
      const weightedSumApto = aptos.reduce((s, r) => s + (r.valor_m2 || 0) * (r.total_transacoes || 1), 0);
      const weightedSumCasa = casas.reduce((s, r) => s + (r.valor_m2 || 0) * (r.total_transacoes || 1), 0);
      const avgApto = totalAptos > 0 ? weightedSumApto / totalAptos : 0;
      const avgCasa = totalCasas > 0 ? weightedSumCasa / totalCasas : 0;
      
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

    // Add mentioned logradouros data
    if (Object.keys(logradourosData).length > 0) {
      contextData += `
DADOS DOS LOGRADOUROS (RUAS/AVENIDAS) MENCIONADOS NA PERGUNTA:
${Object.entries(logradourosData).map(([logradouro, data]) => 
  `- ${logradouro}: R$ ${data.avgM2.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/m² | ${data.transacoes} transações | Valor médio: R$ ${data.valorMedio.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
).join('\n')}
`;
    }

    // Add mentioned condominios data
    if (Object.keys(condominiosData).length > 0) {
      contextData += `
DADOS DOS CONDOMÍNIOS MENCIONADOS NA PERGUNTA:
${Object.entries(condominiosData).map(([cond, data]) => 
  `- ${cond}: R$ ${data.avgM2.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/m² | ${data.transacoes} transações | Valor médio: R$ ${data.valorMedio.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} | Microbairro: ${data.microbairro} | Padrão: ${data.padrao}`
).join('\n')}
`;
    }

    // Add list of all available bairros
    const allBairros = Object.keys(bairroStats).sort();
    contextData += `
BAIRROS DISPONÍVEIS NA BASE DE DADOS (${allBairros.length} total):
${allBairros.join(', ')}
`;

    // Add RAG knowledge context if found
    if (knowledgeContext) {
      contextData += knowledgeContext;
    }

    const systemMessage = {
      role: 'system',
      content: getSystemPrompt(voiceInput === true) + '\n\n' + contextData
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
        messages: [systemMessage, ...limitedMessages],
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
