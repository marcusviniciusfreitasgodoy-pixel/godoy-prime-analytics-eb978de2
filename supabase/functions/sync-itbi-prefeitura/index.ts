import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API da Prefeitura do Rio de Janeiro - ITBI
// Layer 8: Transações por Logradouro e Mês - Residenciais e Não Residenciais
const PREFEITURA_API_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Fazenda/ITBI/MapServer/8/query';

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
    console.log('=== SINCRONIZAÇÃO ITBI ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Credenciais Supabase não encontradas');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let clearExisting = false;
    let codbairro = '159'; // Barra da Tijuca
    let fetchAll = false;
    let minYear = 2020; // Padrão: buscar apenas desde 2020
    
    try {
      const body = await req.json();
      if (body.clearExisting !== undefined) clearExisting = body.clearExisting;
      if (body.codbairro) codbairro = body.codbairro;
      if (body.fetchAll) fetchAll = body.fetchAll;
      if (body.minYear) minYear = body.minYear;
    } catch {
      console.log('Usando parâmetros padrão');
    }

    console.log(`Código bairro: ${codbairro}`);
    console.log(`Fetch all: ${fetchAll}`);
    console.log(`Ano mínimo: ${minYear}`);

    // Buscar com paginação
    let allFeatures: ArcGISFeature[] = [];
    let offset = 0;
    const pageSize = 2000;
    let hasMore = true;

    // SEMPRE usar 1=1 para buscar todos os dados, filtrar no código
    // A API não suporta bem filtros complexos, melhor filtrar depois
    const whereClause = '1%3D1';

    console.log(`Query: 1=1 (filtro por ano >= ${minYear} será aplicado no código)`);

    while (hasMore) {
      const apiUrl = `${PREFEITURA_API_URL}?where=${whereClause}&outFields=*&f=json&resultRecordCount=${pageSize}&resultOffset=${offset}`;
      
      console.log(`Offset ${offset}...`);

      const response = await fetch(apiUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'GodoyPrime/1.0' }
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
        
        if (offset === 0 && data.features[0]) {
          const attrs = data.features[0].attributes;
          console.log('Exemplo:', JSON.stringify({
            logradouro: attrs['logradouro'],
            bairro: attrs['bairro'],
            codbairro: attrs['codbairro'],
            ano: attrs['ano_transação'],
            mes: attrs['mês_transação'],
            uso: attrs['uso'],
            valor: attrs['média_valor_transação'],
            area: attrs['média_área_construída']
          }));
        }
        
        allFeatures = allFeatures.concat(data.features);
        
        if (data.features.length < pageSize && !data.exceededTransferLimit) {
          hasMore = false;
        } else {
          offset += pageSize;
        }
      }

      // Limite de segurança aumentado para 150k registros
      if (offset > 150000) {
        console.log('Limite de segurança atingido (150k)');
        hasMore = false;
      }
    }

    console.log(`Total coletado da API: ${allFeatures.length}`);

    if (allFeatures.length === 0) {
      // Testar com query simples
      console.log('Testando query simples...');
      const testUrl = `${PREFEITURA_API_URL}?where=1%3D1&outFields=codbairro,bairro,ano_transação&f=json&resultRecordCount=5`;
      const testResp = await fetch(testUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'GodoyPrime/1.0' }
      });
      
      if (testResp.ok) {
        const testData: ArcGISResponse = await testResp.json();
        const samples = testData.features?.slice(0, 5).map(f => ({
          bairro: f.attributes['bairro'],
          codbairro: f.attributes['codbairro'],
          ano: f.attributes['ano_transação']
        })) || [];
        console.log('Amostras:', JSON.stringify(samples));
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Nenhum registro encontrado',
            amostras_disponiveis: samples,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum dado encontrado',
          transacoes_encontradas: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limpar dados se solicitado
    if (clearExisting) {
      console.log('Limpando dados existentes...');
      await supabase.from('itbi_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    // Transformar dados - FILTRAR POR ANO >= minYear
    const transacoes = allFeatures
      .filter(f => {
        const attrs = f.attributes;
        const ano = extractNumber(attrs['ano_transação']);
        const valor = extractNumber(attrs['média_valor_transação']);
        const area = extractNumber(attrs['média_área_construída']);
        
        // Filtrar por ano >= minYear E dados válidos
        return ano !== null && ano >= minYear && 
               valor !== null && valor > 0 && 
               area !== null && area > 0;
      })
      .map(f => {
        const attrs = f.attributes;
        
        const valor = extractNumber(attrs['média_valor_transação']) ?? 0;
        const area = extractNumber(attrs['média_área_construída']) ?? 1;
        const totalTransacoes = extractNumber(attrs['total_transações']) ?? 1;
        const percentualTransferido = extractNumber(attrs['média_percentual_transferido']) ?? 100;
        const logradouro = extractString(attrs['logradouro']) ?? 'Não informado';
        const bairro = extractString(attrs['bairro']) ?? 'BARRA DA TIJUCA';
        const ano = extractNumber(attrs['ano_transação']);
        const mes = extractNumber(attrs['mês_transação']);
        const tipologia = extractString(attrs['principais_tipologias']);
        const uso = extractString(attrs['uso']);

        let dataTransacao = new Date().toISOString().split('T')[0];
        if (ano && mes) {
          dataTransacao = `${ano}-${String(mes).padStart(2, '0')}-15`;
        } else if (ano) {
          dataTransacao = `${ano}-06-15`;
        }

        // Calcular valor_m2 usando a metodologia da Prefeitura
        const valorM2 = area > 0 ? valor / area : 0;

        return {
          logradouro: logradouro.toUpperCase(),
          numero: null,
          complemento: null,
          bairro: bairro.trim().toUpperCase(),
          valor_transacao: Math.round(valor * 100) / 100,
          area_m2: Math.round(area * 100) / 100,
          valor_m2: Math.round(valorM2 * 100) / 100,
          data_transacao: dataTransacao,
          uso: classificarUso(uso),
          tipologia: classificarTipologia(tipologia),
          total_transacoes: Math.round(totalTransacoes),
          percentual_transferido: Math.round(percentualTransferido * 100) / 100,
        };
      });

    console.log(`Válidas (ano >= ${minYear}): ${transacoes.length}`);

    // Inserir em lotes
    let totalInseridas = 0;
    let erros = 0;
    const batchSize = 100;

    for (let i = 0; i < transacoes.length; i += batchSize) {
      const batch = transacoes.slice(i, i + batchSize);
      const { error } = await supabase.from('itbi_transactions').insert(batch);
      if (error) {
        console.error(`Erro lote:`, error.message);
        erros++;
      } else {
        totalInseridas += batch.length;
      }
    }

    const summary = {
      success: true,
      message: 'Sincronização concluída',
      transacoes_encontradas: allFeatures.length,
      transacoes_filtradas_ano: transacoes.length,
      transacoes_inseridas: totalInseridas,
      minYear,
      erros,
    };

    console.log('=== FINALIZADO ===', JSON.stringify(summary));

    return new Response(JSON.stringify(summary), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('ERRO:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
