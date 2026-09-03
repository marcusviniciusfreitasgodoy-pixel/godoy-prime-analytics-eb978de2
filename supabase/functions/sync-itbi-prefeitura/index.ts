import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { LIMITES_INGESTAO, mesclarDuplicatasItbi, validarFeatureItbi } from "../_shared/itbiIngestion.ts";

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

    // ========== VERIFICAÇÃO DE AUTENTICAÇÃO E ROLE ADMIN ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Token não fornecido');
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Criar cliente com o token do usuário para validação
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.error('Erro de autenticação:', authError?.message || 'Usuário não encontrado');
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin usando a função has_role
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !isAdmin) {
      console.error('Acesso negado - usuário não é admin:', user.email, roleError);
      return new Response(
        JSON.stringify({ error: 'Acesso negado - requer permissão de administrador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Acesso autorizado para admin:', user.email);
    // ========== FIM DA VERIFICAÇÃO ==========

    // Parâmetros
    let clearExisting = false;
    let codbairro: string | null = null; // null = todos os bairros
    let minYear = 2020;
    let maxYear = new Date().getFullYear();
    let minMonth = 1;
    let maxMonth = 12;
    let onlyResidencial = false;
    
    try {
      const body = await req.json();
      if (body.clearExisting !== undefined) clearExisting = body.clearExisting;
      if (body.codbairro) codbairro = body.codbairro; // Se não fornecido, busca todos
      if (body.minYear) minYear = body.minYear;
      if (body.maxYear) maxYear = body.maxYear;
      if (body.minMonth) minMonth = body.minMonth;
      if (body.maxMonth) maxMonth = body.maxMonth;
      if (body.onlyResidencial !== undefined) onlyResidencial = body.onlyResidencial;
    } catch {
      console.log('Usando parâmetros padrão');
    }

    const syncAllBairros = !codbairro;
    console.log(syncAllBairros ? 'Sincronizando TODOS os bairros do Rio' : `Bairro: ${BAIRRO_CODES[codbairro!] || codbairro}`);
    console.log(`Período: ${minYear}/${minMonth} - ${maxYear}/${maxMonth}`);
    console.log(`Apenas residencial: ${onlyResidencial}`);

    // Buscar com paginação - IMPORTANTE: API tem maxRecordCount=1000
    let allFeatures: ArcGISFeature[] = [];
    let offset = 0;
    const pageSize = 1000; // Alinhado com limite da API da Prefeitura
    let hasMore = true;

    // Construir WHERE clause - incluindo filtro de mês
    let whereClause = `ano_transação>=${minYear} AND ano_transação<=${maxYear}`;
    whereClause += ` AND mês_transação>=${minMonth} AND mês_transação<=${maxMonth}`;
    if (codbairro) {
      whereClause = `codbairro='${codbairro}' AND ${whereClause}`;
    }
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

    // Recarga do período (clearExisting): NÃO apaga antes de inserir. Apagar e
    // reinserir perdia lat/lng/geom/microbairro de todas as linhas (incidente de
    // 2026-09-03, base inteira sem geocodificação). O upsert pela chave natural
    // atualiza as linhas existentes preservando essas colunas; as linhas do
    // período que a Prefeitura deixou de publicar são removidas DEPOIS, pelo
    // updated_at anterior ao início desta sincronização (ver "varredura" abaixo).
    const syncStartedAt = new Date().toISOString();
    const periodoInicio = `${minYear}-${String(minMonth).padStart(2, '0')}-01`;
    const periodoFim = `${maxYear}-${String(maxMonth).padStart(2, '0')}-28`; // 28 para cobrir todos os meses

    // Trilha de auditoria (incidente de 2026-09-03: uma carga completa sem autor
    // conhecido). Toda execução grava quem, quando, modo e período em etl_log.
    const { data: logEntry } = await supabase
      .from('etl_log')
      .insert({
        fonte: 'sync_itbi_prefeitura',
        bairro: syncAllBairros ? 'TODOS' : (BAIRRO_CODES[codbairro!] || codbairro),
        status: 'running',
        iniciado_em: syncStartedAt,
        detalhes: {
          usuario_id: user.id,
          usuario_email: user.email,
          modo: syncAllBairros ? 'todos_os_bairros' : 'bairro',
          clear_existing: clearExisting,
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          limites_ingestao: LIMITES_INGESTAO,
        },
      })
      .select('id')
      .single();
    const etlLogId = logEntry?.id as string | undefined;
    const finalizarLog = async (status: string, extra: Record<string, unknown>, erro?: string) => {
      if (!etlLogId) return;
      const { error: logError } = await supabase
        .from('etl_log')
        .update({
          status,
          finalizado_em: new Date().toISOString(),
          erro_mensagem: erro ?? null,
          ...extra,
        })
        .eq('id', etlLogId);
      if (logError) console.warn('etl_log não atualizado:', logError.message);
    };

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
      const logradouro = extractString(attrs['logradouro']);
      const ano = extractNumber(attrs['ano_transação']);
      const mes = extractNumber(attrs['mês_transação']);
      const tipologia = extractString(attrs['principais_tipologias']);
      const uso = extractString(attrs['uso']);
      const bairroApi = extractString(attrs['bairro']);
      const codbairroApi = extractString(attrs['codbairro']);

      // Regras de aceitação compartilhadas com sync-itbi-daily (_shared/itbiIngestion.ts)
      const validacao = validarFeatureItbi({
        valor, area, logradouro,
        totalTransacoes: extractNumber(attrs['total_transações']),
        percentualTransferido: extractNumber(attrs['média_percentual_transferido']),
      });
      if (!validacao.ok) {
        if (validacao.motivo === 'dados_invalidos') skippedInvalidData++;
        else if (validacao.motivo === 'percentual') skippedPercentual++;
        else skippedOutliers++;
        continue;
      }
      const { valor: valorOk, area: areaOk, totalTransacoes, percentualTransferido } = validacao.feature;

      // Montar data
      let dataTransacao: string;
      if (ano && mes) {
        dataTransacao = `${ano}-${String(mes).padStart(2, '0')}-15`;
      } else {
        dataTransacao = `${ano}-06-15`;
      }

      // Determinar nome do bairro (usar da API ou mapear do código)
      const bairroFinal = bairroApi?.toUpperCase() || BAIRRO_CODES[codbairroApi || ''] || 'DESCONHECIDO';

      transacoes.push({
        logradouro: logradouro!.toUpperCase(),
        numero: null,
        complemento: null,
        bairro: bairroFinal,
        valor_transacao: Math.round(valorOk * 100) / 100,
        area_m2: Math.round(areaOk * 100) / 100,
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

    // A API repete a chave natural (tipologias distintas que viram a mesma
    // classe); um lote com a chave repetida derruba o upsert inteiro.
    const { registros: transacoesUnicas, duplicatasMescladas } = mesclarDuplicatasItbi(transacoes);
    console.log(`Duplicatas de chave natural mescladas: ${duplicatasMescladas}`);

    // Inserir em lotes
    let totalInseridas = 0;
    const erros: string[] = [];
    const batchSize = 500;

    for (let i = 0; i < transacoesUnicas.length; i += batchSize) {
      const batch = transacoesUnicas.slice(i, i + batchSize);
      const { error } = await supabase
        .from('itbi_transactions')
        .upsert(batch, {
          onConflict: 'logradouro,bairro,data_transacao,uso,tipologia',
          ignoreDuplicates: false,
        });
      
      if (error) {
        console.error(`Erro no lote ${i}-${i + batchSize}:`, error.message);
        erros.push(`Lote ${i}: ${error.message}`);
      } else {
        totalInseridas += batch.length;
        console.log(`Inseridas ${totalInseridas}/${transacoesUnicas.length}`);
      }
    }

    // Varredura: remove do período só o que esta sincronização não tocou.
    let registrosRemovidos = 0;
    if (clearExisting && erros.length === 0) {
      let sweep = supabase
        .from('itbi_transactions')
        .delete({ count: 'exact' })
        .gte('data_transacao', periodoInicio)
        .lte('data_transacao', periodoFim)
        .lt('updated_at', syncStartedAt);
      if (!syncAllBairros) {
        sweep = sweep.eq('bairro', BAIRRO_CODES[codbairro!] || codbairro!);
      }
      const { error: sweepError, count } = await sweep;
      if (sweepError) {
        console.error('Erro na varredura de registros obsoletos:', sweepError.message);
      } else {
        registrosRemovidos = count ?? 0;
        console.log(`Registros obsoletos removidos do período: ${registrosRemovidos}`);
      }
    } else if (clearExisting) {
      console.warn('Varredura de obsoletos pulada: houve erro em algum lote do upsert.');
    }

    const summary = {
      success: true,
      message: syncAllBairros ? 'Sincronização de TODOS os bairros concluída' : 'Sincronização via API concluída',
      bairro: syncAllBairros ? 'TODOS' : (BAIRRO_CODES[codbairro!] || codbairro),
      codbairro: codbairro || 'TODOS',
      periodo: `${minYear}/${minMonth}-${maxYear}/${maxMonth}`,
      api_registros_agregados: allFeatures.length,
      registros_validos: transacoes.length,
      registros_inseridos: totalInseridas,
      registros_obsoletos_removidos: registrosRemovidos,
      geocodificacao_preservada: true,
      total_transacoes_reais: totalTransacoesReais,
      duplicatas_mescladas: duplicatasMescladas,
      ignorados: {
        dados_invalidos: skippedInvalidData,
        outliers: skippedOutliers,
        percentual_baixo: skippedPercentual,
      },
      erros: erros.length > 0 ? erros : undefined,
    };

    console.log('=== SINCRONIZAÇÃO FINALIZADA ===');
    console.log(JSON.stringify(summary));

    await finalizarLog(erros.length > 0 ? 'concluido_com_erros' : 'concluido', {
      registros_importados: totalInseridas,
      registros_com_erro: erros.length,
      detalhes: {
        usuario_id: user.id,
        usuario_email: user.email,
        modo: syncAllBairros ? 'todos_os_bairros' : 'bairro',
        clear_existing: clearExisting,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        limites_ingestao: LIMITES_INGESTAO,
        api_registros_agregados: allFeatures.length,
        registros_validos: transacoes.length,
        registros_unicos: transacoesUnicas.length,
        duplicatas_mescladas: duplicatasMescladas,
        registros_obsoletos_removidos: registrosRemovidos,
        total_transacoes_reais: totalTransacoesReais,
        geocodificacao_preservada: true,
      },
    });

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
