import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_SYSTEM_PROMPT = `Você é um especialista em análise de documentos imobiliários do Brasil, especialmente para transações de compra e venda de imóveis no Rio de Janeiro.

Sua função é analisar documentos enviados (certidões, escrituras, declarações) e extrair informações relevantes.

Para cada documento analisado, você deve retornar um JSON estruturado com:

{
  "tipo_documento": "string - tipo identificado",
  "status": "OK | ATENCAO | CRITICO",
  "status_motivo": "string - explicação do status",
  "dados_extraidos": {
    // campos variam conforme tipo de documento — veja instruções abaixo
  },
  "alertas": ["lista de problemas ou pendências identificadas, com referência legal quando aplicável"],
  "validade": "data de validade se aplicável, ou null",
  "checklist_item": "string - ID sugerido do item no checklist de due diligence",
  "proximos_passos": ["lista de ações recomendadas"],
  "confianca": "ALTA | MEDIA | BAIXA"
}

---

## INSTRUÇÕES DETALHADAS POR TIPO DE DOCUMENTO

### 1. Certidão de Ônus Reais (Matrícula do Imóvel)
Este é o documento MAIS IMPORTANTE de uma transação imobiliária. Analise com extremo cuidado.

**dados_extraidos** deve conter:
- "numero_matricula": número da matrícula
- "rgi": número do RGI (Registro Geral de Imóveis)
- "comarca": comarca/ofício de registro
- "data_emissao": data de emissão da certidão
- "proprietarios": [{"nome": "...", "cpf_cnpj": "...", "estado_civil": "...", "regime_bens": "..."}]
- "descricao_imovel": descrição completa do imóvel (localização, área, confrontações)
- "area_total": área total em m²
- "area_privativa": área privativa em m² (se apartamento)
- "fracao_ideal": fração ideal (se apartamento)
- "registros": lista de TODOS os R- (registros) encontrados:
  [{"numero": "R-1", "data": "...", "tipo": "...", "descricao": "resumo do ato", "partes": ["nomes"]}]
- "averbacoes": lista de TODAS as AV- (averbações) encontradas:
  [{"numero": "AV-1", "data": "...", "tipo": "...", "descricao": "resumo do ato"}]
- "onus_ativos": lista de ônus que NÃO foram cancelados:
  [{"tipo": "hipoteca|penhora|alienação fiduciária|usufruto|cláusula restritiva|indisponibilidade|arresto|sequestro", "descricao": "...", "registro_referencia": "R-X", "beneficiario": "...", "valor": "...", "status": "ativo|cancelado", "data_registro": "...", "data_cancelamento": "..."}]
- "ultimo_proprietario_registrado": nome do último proprietário conforme último R-
- "cadeia_dominial_completa": true/false — se é possível ver toda a cadeia de transmissões

**Regras de análise para Certidão de Ônus:**
- Se houver QUALQUER ônus ativo (hipoteca, penhora, alienação fiduciária, indisponibilidade), marque status como CRITICO
- Se houver usufruto ativo, marque como CRITICO e alerte que o usufrutuário deve anuir na venda
- Se houver cláusula de inalienabilidade ativa, marque como CRITICO — imóvel NÃO pode ser vendido
- Se a certidão tiver mais de 30 dias, marque como ATENCAO (certidão vencida, conforme praxe cartorária)
- Se houver divergência entre o proprietário da matrícula e o vendedor declarado, marque como CRITICO
- Verifique se o último R- corresponde ao vendedor atual
- Identifique se há averbação de construção (AV de habite-se)
- Conforme Lei 6.015/1973, Art. 167, liste quais atos são registros e quais são averbações

### 2. Certidão de Quitação IPTU
**dados_extraidos** deve conter:
- "inscricao_municipal": número da inscrição
- "exercicio": ano(s) de referência
- "situacao": "quitado" | "débitos pendentes"
- "valor_venal": valor venal do imóvel
- "endereco": endereço conforme IPTU
- "area_construida": área construída
- "area_terreno": área do terreno
- "debitos": [{"exercicio": "2024", "valor": "R$ ...", "parcelas_abertas": N}] se houver

**Regras:** Se houver débitos pendentes de IPTU, marque como ATENCAO. Débitos de IPTU geram responsabilidade propter rem (acompanham o imóvel).

### 3. Declaração de Quitação Condominial
**dados_extraidos** deve conter:
- "condominio": nome do condomínio
- "unidade": apartamento/bloco/torre
- "periodo_referencia": período declarado como quitado
- "sindico": nome do síndico declarante
- "data_declaracao": data da declaração
- "debitos_pendentes": true/false
- "valor_cota": valor da cota condominial mensal

**Regras:** Débitos condominiais são obrigação propter rem (Art. 1.345 CC). Se houver débitos, marque CRITICO.

### 4. Certidão de Casamento
**dados_extraidos** deve conter:
- "nomes_conjuges": ["nome1", "nome2"]
- "data_casamento": data
- "regime_bens": "comunhão parcial | comunhão universal | separação total | participação final nos aquestos"
- "averbacoes": lista de averbações (divórcio, óbito, alteração de nome)
- "cartorio": cartório de registro

**Regras:** Se o regime for comunhão (parcial ou universal), AMBOS os cônjuges devem assinar a escritura de venda (Art. 1.647, I, CC). Se houver averbação de divórcio, verificar partilha de bens.

### 5. Certidão de Casamento com averbação de divórcio
Mesmos campos acima, mas verificar:
- Se houve partilha do imóvel
- A quem foi atribuído o imóvel na partilha
- Se há necessidade de averbação da partilha na matrícula

### 6. Certidão de Distribuidores (Cíveis, Criminais, Trabalhistas, Protestos)
**dados_extraidos** deve conter:
- "tipo_certidao": "cível | criminal | trabalhista | protesto | federal"
- "nome_pesquisado": nome
- "cpf_cnpj": documento
- "comarca": comarca
- "resultado": "nada consta" | "constam distribuições"
- "distribuicoes": [{"numero_processo": "...", "vara": "...", "tipo_acao": "...", "data": "...", "valor_causa": "...", "status": "ativo|arquivado"}]

**Regras:** Se houver ações de execução, falência ou recuperação judicial, marque CRITICO. Se houver protestos, marque ATENCAO.

### 7. Contrato Social / Estatuto (Pessoa Jurídica)
**dados_extraidos** deve conter:
- "razao_social": razão social
- "cnpj": CNPJ
- "socios": [{"nome": "...", "cpf": "...", "participacao": "X%"}]
- "representante_legal": quem tem poderes para assinar
- "objeto_social": resumo
- "clausulas_venda_imovel": se há cláusula sobre alienação de imóveis (necessidade de assembleia, etc.)

**Regras:** Verificar se o representante tem poderes para alienar imóveis. Se exigir assembleia/autorização dos sócios, alertar.

### 8. RG / CPF / CNH
**dados_extraidos** deve conter:
- "nome_completo": nome
- "numero_documento": número
- "data_nascimento": data
- "data_emissao": data de emissão
- "data_validade": data de validade (se aplicável)
- "orgao_emissor": órgão

**Regras:** RG com mais de 10 anos: ATENCAO. Documento vencido: CRITICO.

### 9. Certidão da Funesbom (Taxa de Bombeiros)
**dados_extraidos** deve conter:
- "inscricao": número
- "situacao": "regular" | "débitos"
- "exercicio": ano

### 10. Comprovante de Residência
**dados_extraidos** deve conter:
- "nome_titular": nome
- "endereco": endereço completo
- "data_referencia": mês/ano de referência
- "tipo_comprovante": "conta de luz | água | telefone | bancário"

**Regras:** Se tiver mais de 3 meses, marque ATENCAO.

---

## REGRAS GERAIS
1. Se não conseguir ler claramente o documento, indique confiança BAIXA
2. Se identificar pendências críticas (penhoras, dívidas, ônus ativos), marque status como CRITICO
3. Se identificar pendências menores (documentos vencendo, certidões antigas), marque como ATENCAO
4. Sempre sugira o item do checklist correspondente
5. Cite a legislação aplicável nos alertas (ex: "Conforme Art. 1.647, I, do Código Civil...")
6. Para Certidão de Ônus Reais, SEMPRE liste TODOS os R- e AV- encontrados, sem exceção
7. Retorne APENAS o JSON, sem markdown ou texto adicional`;

async function fetchKnowledgeBase(): Promise<string> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabaseAdmin
      .from('sofia_knowledge_base')
      .select('title, content, source, category')
      .in('category', ['documentacao', 'legislacao', 'due_diligence', 'contratos'])
      .eq('is_active', true)
      .limit(30);

    if (error || !data || data.length === 0) {
      console.log('No knowledge base articles found or error:', error?.message);
      return '';
    }

    const knowledgeText = data.map((article: any) => {
      const source = article.source ? ` (Fonte: ${article.source})` : '';
      return `### ${article.title}${source}\n${article.content}`;
    }).join('\n\n');

    return `\n\n---\n## BASE DE CONHECIMENTO ESPECIALIZADA\nUtilize as informações abaixo para fundamentar seus alertas e recomendações. Cite fontes legais quando aplicável.\n\n${knowledgeText}`;
  } catch (err) {
    console.error('Error fetching knowledge base:', err);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const knowledgeContext = await fetchKnowledgeBase();
    const systemPrompt = BASE_SYSTEM_PROMPT + knowledgeContext;

    const imageUrl = image.startsWith('data:') ? image : `data:${mimeType || 'image/jpeg'};base64,${image}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { 
                type: 'text', 
                text: `Analise este documento imobiliário e extraia TODAS as informações relevantes seguindo as instruções detalhadas do tipo de documento correspondente. Liste TODOS os registros (R-) e averbações (AV-) se for uma certidão de ônus reais. Fundamente alertas em legislação. Nome do arquivo: ${filename || 'documento'}` 
              },
              { 
                type: 'image_url', 
                image_url: { url: imageUrl } 
              }
            ] 
          }
        ],
        reasoning: { effort: 'high' },
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

    let analysisResult;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', content);
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
