import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API da Prefeitura do Rio de Janeiro - ITBI
const PREFEITURA_API_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Fazenda/ITBI/MapServer/8/query';

interface ArcGISFeature {
  attributes: Record<string, unknown>;
}

interface ArcGISResponse {
  features: ArcGISFeature[];
  exceededTransferLimit?: boolean;
}

// Função para classificar uso (Residencial vs Comercial)
function classificarUso(uso: string | null): 'Residencial' | 'Comercial' {
  const texto = (uso || '').toLowerCase().trim();
  
  if (texto.includes('nao residencial') || texto.includes('não residencial') || texto.includes('comercial')) {
    return 'Comercial';
  }
  return 'Residencial';
}

// Função para classificar tipologia
function classificarTipologia(tipologia: string | null): string {
  const tipo = (tipologia || '').toLowerCase().trim();
  
  if (tipo.includes('apartamento') || tipo.includes('apto') || tipo.includes('flat') || tipo.includes('cobertura')) {
    return 'Apartamento';
  } else if (tipo.includes('casa') || tipo.includes('sobrado') || tipo.includes('residencia')) {
    return 'Casa';
  } else if (tipo.includes('terreno') || tipo.includes('lote')) {
    return 'Terreno';
  } else if (tipo.includes('sala') || tipo.includes('loja') || tipo.includes('escritório')) {
    return 'Comercial';
  }
  
  return 'Apartamento'; // Default
}

// Helper para extrair número de um valor desconhecido
function extractNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
  return null;
}

// Helper para extrair string de um valor desconhecido
function extractString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando sincronização com API da Prefeitura...');

    // Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Credenciais Supabase não encontradas');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parâmetros opcionais do request
    let clearExisting = false;
    let bairroFilter = 'BARRA DA TIJUCA';
    
    try {
      const body = await req.json();
      if (body.clearExisting !== undefined) clearExisting = body.clearExisting;
      if (body.bairro) bairroFilter = body.bairro;
    } catch {
      console.log('Usando parâmetros padrão');
    }

    console.log(`Buscando transações para: ${bairroFilter}`);

    // Buscar dados da API da Prefeitura
    // O campo bairro tem espaços extras, então usamos LIKE com %
    const whereClause = encodeURIComponent(`bairro LIKE '%${bairroFilter}%'`);
    const apiUrl = `${PREFEITURA_API_URL}?where=${whereClause}&outFields=*&outSR=4326&f=json&resultRecordCount=2000`;
    
    console.log('Requisição para:', apiUrl);

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Erro na API da Prefeitura: ${response.status} ${response.statusText}`);
    }

    const data: ArcGISResponse = await response.json();
    
    if (!data.features || data.features.length === 0) {
      console.log('Nenhuma transação encontrada na API');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhuma transação encontrada na API da Prefeitura',
          transacoes_encontradas: 0,
          transacoes_inseridas: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Encontradas ${data.features.length} transações na API`);
    
    // Log dos campos disponíveis na primeira transação
    if (data.features[0]) {
      console.log('Campos disponíveis:', Object.keys(data.features[0].attributes));
      console.log('Exemplo de dados:', JSON.stringify(data.features[0].attributes).substring(0, 500));
    }

    // Limpar dados existentes se solicitado
    if (clearExisting) {
      console.log('Limpando dados existentes...');
      const { error: deleteError } = await supabase
        .from('itbi_transactions')
        .delete()
        .ilike('bairro', `%${bairroFilter}%`);
      
      if (deleteError) {
        console.warn('Aviso ao limpar dados:', deleteError);
      }
    }

    // Campos da API (baseado nos logs):
    // objectid, cl, logradouro, codbairro, bairro, total_transações, uso,
    // principais_tipologias, média_percentual_transferido, média_área_construída,
    // média_valor_transação, média_valor_imóvel, principal_transação_mercado,
    // ano_transação, cd_utilizacao, mês_transação

    // Transformar e inserir dados
    const transacoes = data.features
      .filter(f => {
        const attrs = f.attributes;
        // Filtrar transações válidas (com valor e área médios)
        const valor = extractNumber(attrs['média_valor_transação']);
        const area = extractNumber(attrs['média_área_construída']);
        return valor !== null && valor > 0 && area !== null && area > 0;
      })
      .map(f => {
        const attrs = f.attributes;
        
        // Mapear campos da API para nosso schema
        const valor = extractNumber(attrs['média_valor_transação']) ?? 0;
        const area = extractNumber(attrs['média_área_construída']) ?? 1;
        const logradouro = extractString(attrs['logradouro']) ?? 'Não informado';
        const bairro = extractString(attrs['bairro'])?.trim() ?? bairroFilter;
        const ano = extractNumber(attrs['ano_transação']);
        const mes = extractNumber(attrs['mês_transação']);
        const tipologia = extractString(attrs['principais_tipologias']);
        const uso = extractString(attrs['uso']);

        // Construir data da transação a partir de ano e mês
        let dataTransacao = new Date().toISOString().split('T')[0];
        if (ano && mes) {
          dataTransacao = `${ano}-${String(mes).padStart(2, '0')}-01`;
        } else if (ano) {
          dataTransacao = `${ano}-01-01`;
        }

        return {
          logradouro: logradouro.toUpperCase(),
          numero: null,
          complemento: null,
          bairro: bairro.trim(),
          valor_transacao: Math.round(valor * 100) / 100,
          area_m2: Math.round(area * 100) / 100,
          valor_m2: Math.round((valor / area) * 100) / 100,
          data_transacao: dataTransacao,
          uso: classificarUso(uso),
          tipologia: classificarTipologia(tipologia),
        };
      });

    console.log(`${transacoes.length} transações válidas para inserção`);

    // Inserir em lotes de 100
    const batchSize = 100;
    let totalInseridas = 0;
    let erros = 0;

    for (let i = 0; i < transacoes.length; i += batchSize) {
      const batch = transacoes.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('itbi_transactions')
        .insert(batch);

      if (insertError) {
        console.error(`Erro ao inserir lote ${i / batchSize + 1}:`, insertError);
        erros++;
      } else {
        totalInseridas += batch.length;
        console.log(`Lote ${i / batchSize + 1} inserido: ${batch.length} registros`);
      }
    }

    const summary = {
      success: true,
      message: 'Sincronização concluída',
      transacoes_encontradas: data.features.length,
      transacoes_validas: transacoes.length,
      transacoes_inseridas: totalInseridas,
      erros: erros,
      exceeded_transfer_limit: data.exceededTransferLimit || false,
      timestamp: new Date().toISOString(),
    };

    console.log('Sincronização finalizada:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
