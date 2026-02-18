import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const SYSTEM_PROMPT = `Você é um especialista em análise de documentos imobiliários do Brasil, especialmente para transações de compra e venda de imóveis no Rio de Janeiro.

Sua função é analisar documentos enviados (certidões, escrituras, declarações) e extrair informações relevantes.

Para cada documento analisado, você deve retornar um JSON estruturado com:

{
  "tipo_documento": "string - tipo identificado (Certidão de Ônus Reais, IPTU, Quitação Condominial, RG, CPF, Certidão de Casamento, etc.)",
  "status": "OK | ATENCAO | CRITICO",
  "status_motivo": "string - explicação do status",
  "dados_extraidos": {
    // campos variam conforme tipo de documento
  },
  "alertas": ["lista de problemas ou pendências identificadas"],
  "validade": "data de validade se aplicável, ou null",
  "checklist_item": "string - ID sugerido do item no checklist de due diligence que este documento corresponde",
  "proximos_passos": ["lista de ações recomendadas"],
  "confianca": "ALTA | MEDIA | BAIXA - confiança na análise"
}

Tipos de documentos que você sabe analisar:
1. Certidão de Ônus Reais - verificar hipotecas, penhoras, ações judiciais
2. Certidão de Quitação IPTU - verificar débitos fiscais
3. Declaração de Quitação Condominial - verificar débitos de condomínio
4. RG/CPF - verificar validade e dados pessoais
5. Certidão de Casamento - regime de bens, averbações
6. Certidão de Nascimento
7. Comprovante de Residência
8. Escritura de União Estável
9. Contrato Social - para pessoa jurídica
10. Certidão da Funesbom - taxa de bombeiros
11. Certidões de Distribuidores - protestos, ações

Regras importantes:
1. Se não conseguir ler claramente o documento, indique confiança BAIXA
2. Se identificar pendências críticas (penhoras, dívidas), marque status como CRITICO
3. Se identificar pendências menores (documentos vencendo), marque como ATENCAO
4. Sempre sugira o item do checklist correspondente
5. Retorne APENAS o JSON, sem markdown ou texto adicional`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Autenticação obrigatória' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { image, mimeType, filename } = await req.json();
    
    if (!image) {
      throw new Error('Imagem do documento é obrigatória');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing document:', filename || 'unknown', 'type:', mimeType);

    // Prepare the image for the API
    const imageUrl = image.startsWith('data:') ? image : `data:${mimeType || 'image/jpeg'};base64,${image}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: [
              { 
                type: 'text', 
                text: `Analise este documento imobiliário e extraia todas as informações relevantes. Nome do arquivo: ${filename || 'documento'}` 
              },
              { 
                type: 'image_url', 
                image_url: { url: imageUrl } 
              }
            ] 
          }
        ],
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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    // Parse the JSON response
    let analysisResult;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', content);
      // Return a structured error response
      analysisResult = {
        tipo_documento: 'Não identificado',
        status: 'ATENCAO',
        status_motivo: 'Não foi possível analisar o documento automaticamente',
        dados_extraidos: {},
        alertas: ['Documento requer análise manual'],
        validade: null,
        checklist_item: null,
        proximos_passos: ['Verifique o documento manualmente'],
        confianca: 'BAIXA',
        raw_response: content
      };
    }

    console.log('Document analysis completed:', analysisResult.tipo_documento);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Analyze document error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      tipo_documento: 'Erro',
      status: 'CRITICO',
      status_motivo: 'Falha na análise do documento',
      alertas: [error instanceof Error ? error.message : 'Erro desconhecido'],
      confianca: 'BAIXA'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
