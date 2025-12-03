import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API da Prefeitura do Rio de Janeiro - ITBI
const PREFEITURA_API_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Fazenda/ITBI/MapServer/8/query';

// Mapeamento de códigos de bairro para nomes (principais bairros do Rio)
const BAIRRO_CODES: Record<string, string> = {
  '128': 'BARRA DA TIJUCA',
  '159': 'RECREIO DOS BANDEIRANTES',
  '118': 'COPACABANA',
  '119': 'IPANEMA',
  '120': 'LEBLON',
  '123': 'LAGOA',
  '029': 'BOTAFOGO',
  '040': 'FLAMENGO',
  '088': 'TIJUCA',
};

interface ArcGISFeature {
  attributes: Record<string, unknown>;
}

interface ArcGISResponse {
  features?: ArcGISFeature[];
  exceededTransferLimit?: boolean;
  error?: { code: number; message: string };
}

function classificarUso(uso: string | null): 'Residencial' | 'Comercial' {
  const texto = (uso || '').toLowerCase().trim();
  if (texto.includes('nao residencial') || texto.includes('não residencial') || texto.includes('comercial')) {
    return 'Comercial';
  }
  return 'Residencial';
}

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
  return 'Apartamento';
}

function extractNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
  return null;
}

function extractString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== SINCRONIZAÇÃO ITBI VIA API (v2 - codbairro) ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Credenciais Supabase não encontradas');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parâmetros
    let clearExisting = false;
    let codbairro = '128'; // Barra da Tijuca por padrão
    let minYear = 2020;
    let maxYear = new Date().getFullYear();
    let onlyResidencial = false;
    
    try {
      const body = await req.json();
      if (body.clearExisting !== undefined) clearExisting = body.clearExisting;
      if (body.codbairro) codbairro = body.codbairro;
      if (body.minYear) minYear = body.minYear;
      if (body.maxYear) maxYear = body.maxYear;
      if (body.onlyResidencial !== undefined) onlyResidencial = body.onlyResidencial;
    } catch {
      console.log('Usando parâmetros padrão');
    }

    const bairroNome = BAIRRO_CODES[codbairro] || 'BARRA DA TIJUCA';
    console.log(`Bairro: ${bairroNome} (código: ${codbairro})`);
    console.log(`Período: ${minYear} - ${maxYear}`);
    console.log(`Apenas residencial: ${onlyResidencial}`);

    // Buscar com paginação - FILTRANDO POR CODBAIRRO NA API!
    let allFeatures: ArcGISFeature[] = [];
    let offset = 0;
    const pageSize = 2000;
    let hasMore = true;

    // Construir WHERE clause com codbairro
    let whereClause = `codbairro='${codbairro}' AND ano_transação>=${minYear} AND ano_transação<=${maxYear}`;
    if (onlyResidencial) {
      whereClause += ` AND uso='RESIDENCIAL'`;
    }
    const encodedWhere = encodeURIComponent(whereClause);

    console.log(`WHERE: ${whereClause}`);
    console.log('Buscando dados da API da Prefeitura...');

    while (hasMore) {
      const apiUrl = `${PREFEITURA_API_URL}?where=${encodedWhere}&outFields=*&f=json&resultRecordCount=${pageSize}&resultOffset=${offset}`;
      
      console.log(`Offset ${offset}...`);

      const response = await fetch(apiUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'GodoyPrime/2.0' }
      });
      
      if (!response.ok) {
        console.error(`HTTP Error: ${response.status}`);
        break;
      }

      const data: ArcGISResponse = await response.json();
      
      if (data.error) {
        console.error('API Error:', data.error);
        break;
      }

      if (!data.features || data.features.length === 0) {
        console.log('Fim dos dados');
        hasMore = false;
      } else {
        console.log(`Página: ${data.features.length} registros`);
        
        // Log primeiro registro para debug
        if (offset === 0 && data.features[0]) {
          const attrs = data.features[0].attributes;
          console.log('Exemplo registro:', JSON.stringify({
            logradouro: attrs['logradouro'],
            bairro: attrs['bairro'],
            codbairro: attrs['codbairro'],
            ano: attrs['ano_transação'],
            mes: attrs['mês_transação'],
            uso: attrs['uso'],
            valor: attrs['média_valor_transação'],
            area: attrs['média_área_construída'],
            percentual: attrs['média_percentual_transferido'],
            total: attrs['total_transações']
          }));
        }
        
        allFeatures = allFeatures.concat(data.features);
        
        if (data.features.length < pageSize && !data.exceededTransferLimit) {
          hasMore = false;
        } else {
          offset += pageSize;
        }
      }

      // Limite de segurança
      if (offset > 50000) {
        console.log('Limite de segurança atingido (50k)');
        hasMore = false;
      }
    }

    console.log(`Total coletado da API: ${allFeatures.length}`);

    if (allFeatures.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum dado encontrado na API',
          transacoes_encontradas: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limpar dados existentes do bairro/período se solicitado
    if (clearExisting) {
      console.log(`Limpando dados existentes de ${bairroNome} (${minYear}-${maxYear})...`);
      
      const { error: deleteError } = await supabase
        .from('itbi_transactions')
        .delete()
        .eq('bairro', bairroNome)
        .gte('data_transacao', `${minYear}-01-01`)
        .lte('data_transacao', `${maxYear}-12-31`);
      
      if (deleteError) {
        console.error('Erro ao limpar:', deleteError.message);
      } else {
        console.log('Dados anteriores removidos');
      }
    }

    // Transformar e validar dados
    const transacoes: Array<{
      logradouro: string;
      numero: string | null;
      complemento: string | null;
      bairro: string;
      valor_transacao: number;
      area_m2: number;
      data_transacao: string;
      uso: 'Residencial' | 'Comercial';
      tipologia: string;
      total_transacoes: number;
      percentual_transferido: number;
    }> = [];

    let skippedInvalidData = 0;
    let skippedOutliers = 0;
    let skippedPercentual = 0;

    for (const f of allFeatures) {
      const attrs = f.attributes;
      
      // Extrair dados nativos JSON (números já vêm corretos da API!)
      const valor = extractNumber(attrs['média_valor_transação']);
      const area = extractNumber(attrs['média_área_construída']);
      const totalTransacoes = extractNumber(attrs['total_transações']) ?? 1;
      const percentualTransferido = extractNumber(attrs['média_percentual_transferido']) ?? 100;
      const logradouro = extractString(attrs['logradouro']);
      const ano = extractNumber(attrs['ano_transação']);
      const mes = extractNumber(attrs['mês_transação']);
      const tipologia = extractString(attrs['principais_tipologias']);
      const uso = extractString(attrs['uso']);

      // Validar dados obrigatórios
      if (!logradouro || valor === null || area === null || valor <= 0 || area <= 0) {
        skippedInvalidData++;
        continue;
      }

      // Filtrar por percentual transferido >= 90%
      if (percentualTransferido < 90) {
        skippedPercentual++;
        continue;
      }

      // Calcular valor/m²
      const valorM2 = valor / area;

      // Validar ranges razoáveis (menos restritivos)
      // Área: 20 a 5000 m²
      // Valor: R$ 100.000 a R$ 200.000.000
      // Valor/m²: R$ 500 a R$ 300.000
      if (area < 20 || area > 5000) {
        skippedOutliers++;
        continue;
      }
      if (valor < 100000 || valor > 200000000) {
        skippedOutliers++;
        continue;
      }
      if (valorM2 < 500 || valorM2 > 300000) {
        skippedOutliers++;
        continue;
      }

      // Montar data
      let dataTransacao: string;
      if (ano && mes) {
        dataTransacao = `${ano}-${String(mes).padStart(2, '0')}-15`;
      } else {
        dataTransacao = `${ano}-06-15`;
      }

      transacoes.push({
        logradouro: logradouro.toUpperCase(),
        numero: null,
        complemento: null,
        bairro: bairroNome,
        valor_transacao: Math.round(valor * 100) / 100,
        area_m2: Math.round(area * 100) / 100,
        data_transacao: dataTransacao,
        uso: classificarUso(uso),
        tipologia: classificarTipologia(tipologia),
        total_transacoes: Math.round(totalTransacoes),
        percentual_transferido: Math.round(percentualTransferido * 100) / 100,
      });
    }

    console.log(`Transações válidas para inserção: ${transacoes.length}`);
    console.log(`Ignoradas (dados inválidos): ${skippedInvalidData}`);
    console.log(`Ignoradas (outliers): ${skippedOutliers}`);
    console.log(`Ignoradas (percentual < 90%): ${skippedPercentual}`);

    // Calcular total de transações reais
    const totalTransacoesReais = transacoes.reduce((sum, t) => sum + t.total_transacoes, 0);
    console.log(`Total de transações reais (soma): ${totalTransacoesReais}`);

    // Inserir em lotes
    let totalInseridas = 0;
    let erros: string[] = [];
    const batchSize = 500;

    for (let i = 0; i < transacoes.length; i += batchSize) {
      const batch = transacoes.slice(i, i + batchSize);
      const { error } = await supabase.from('itbi_transactions').insert(batch);
      
      if (error) {
        console.error(`Erro no lote ${i}-${i + batchSize}:`, error.message);
        erros.push(`Lote ${i}: ${error.message}`);
      } else {
        totalInseridas += batch.length;
        console.log(`Inseridas ${totalInseridas}/${transacoes.length}`);
      }
    }

    const summary = {
      success: true,
      message: 'Sincronização via API concluída',
      bairro: bairroNome,
      codbairro: codbairro,
      periodo: `${minYear}-${maxYear}`,
      api_registros_agregados: allFeatures.length,
      registros_validos: transacoes.length,
      registros_inseridos: totalInseridas,
      total_transacoes_reais: totalTransacoesReais,
      ignorados: {
        dados_invalidos: skippedInvalidData,
        outliers: skippedOutliers,
        percentual_baixo: skippedPercentual,
      },
      erros: erros.length > 0 ? erros : undefined,
    };

    console.log('=== SINCRONIZAÇÃO FINALIZADA ===');
    console.log(JSON.stringify(summary));

    return new Response(JSON.stringify(summary), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('ERRO GERAL:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
