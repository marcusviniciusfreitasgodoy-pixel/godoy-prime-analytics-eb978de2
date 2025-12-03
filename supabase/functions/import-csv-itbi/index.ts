import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Parse número no formato brasileiro/Prefeitura
 * Detecta automaticamente se é formato brasileiro (. como separador de milhares)
 * ou formato internacional (. como separador decimal)
 */
function parseNumero(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  
  const str = String(valor).trim();
  if (str === '' || str === 'null' || str === 'undefined') return null;
  
  // Contar pontos para determinar formato
  const pontos = (str.match(/\./g) || []).length;
  const virgulas = (str.match(/,/g) || []).length;
  
  let numero: number;
  
  if (virgulas > 0) {
    // Formato brasileiro com vírgula decimal: 1.234.567,89
    numero = parseFloat(str.replace(/\./g, '').replace(',', '.'));
  } else if (pontos > 1) {
    // Múltiplos pontos = separador de milhares: 1.234.567.89
    // Último grupo após ponto determina se é decimal
    const partes = str.split('.');
    const ultimaParte = partes[partes.length - 1];
    
    if (ultimaParte.length <= 2 || (ultimaParte.length === 3 && partes.length === 2)) {
      // Pode ser decimal no final
      // Ex: 1.234.567.89 -> 1234567.89
      const inteira = partes.slice(0, -1).join('');
      numero = parseFloat(inteira + '.' + ultimaParte);
    } else {
      // Todos são separadores de milhares: 1.234.567
      numero = parseFloat(str.replace(/\./g, ''));
    }
  } else if (pontos === 1) {
    // Um único ponto: pode ser decimal ou milhar
    const partes = str.split('.');
    if (partes[1].length === 3 && parseFloat(str) > 1000) {
      // Provavelmente separador de milhar: 1.234 (1234)
      numero = parseFloat(str.replace('.', ''));
    } else {
      // Decimal normal: 1.5 ou 100.50
      numero = parseFloat(str);
    }
  } else {
    numero = parseFloat(str);
  }
  
  return isNaN(numero) ? null : numero;
}

/**
 * Normaliza percentual para valor entre 0 e 100
 */
function normalizaPercentual(valor: number | null): number {
  if (valor === null) return 100;
  
  // Se maior que 100, provavelmente está no formato X.YYY onde Y é decimal
  // Ex: 986.668 deveria ser 98.6668%
  if (valor > 100 && valor < 1000) {
    return valor / 10;
  }
  if (valor > 1000) {
    return valor / 10000;
  }
  
  return valor;
}

/**
 * Detecta uso do imóvel
 */
function parseUso(valor: string | null): 'Residencial' | 'Comercial' {
  if (!valor) return 'Residencial';
  const upper = valor.toUpperCase();
  if (upper.includes('NAO') || upper.includes('NÃO') || upper.includes('COMERCIAL')) {
    return 'Comercial';
  }
  return 'Residencial';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não suportado. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { csv_content, clear_existing, codbairro_filter, min_year } = await req.json();
    
    if (!csv_content) {
      return new Response(
        JSON.stringify({ error: 'Conteúdo CSV não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Iniciando parsing do CSV...');
    console.log(`Filtros: codbairro=${codbairro_filter || 'TODOS'}, min_year=${min_year || 2020}`);

    // Parse CSV
    const linhas = csv_content.split('\n').filter((l: string) => l.trim());
    const cabecalho = linhas[0].split(';').map((h: string) => h.trim().toLowerCase());
    
    console.log('Colunas encontradas:', cabecalho.join(', '));
    
    // Mapear índices das colunas
    const idx = {
      objectid: cabecalho.findIndex((c: string) => c === 'objectid'),
      cl: cabecalho.findIndex((c: string) => c === 'cl'),
      logradouro: cabecalho.findIndex((c: string) => c === 'logradouro'),
      codbairro: cabecalho.findIndex((c: string) => c === 'codbairro'),
      bairro: cabecalho.findIndex((c: string) => c === 'bairro'),
      total_transacoes: cabecalho.findIndex((c: string) => c.includes('total_transa')),
      uso: cabecalho.findIndex((c: string) => c === 'uso'),
      tipologia: cabecalho.findIndex((c: string) => c.includes('tipologia')),
      percentual: cabecalho.findIndex((c: string) => c.includes('percentual')),
      area: cabecalho.findIndex((c: string) => c.includes('rea_constru')),
      valor_transacao: cabecalho.findIndex((c: string) => c.includes('dia_valor_transa')),
      ano: cabecalho.findIndex((c: string) => c.includes('ano_transa')),
      mes: cabecalho.findIndex((c: string) => c.includes('s_transa')),
    };
    
    console.log('Índices mapeados:', JSON.stringify(idx));

    // Processar linhas
    const registros: any[] = [];
    const errosParsing: string[] = [];
    let linhasProcessadas = 0;
    let linhasFiltradas = 0;
    
    // Se codbairro_filter for null/undefined/vazio, importa TODOS os bairros
    const filtroCodbairro = codbairro_filter || null;
    const filtroAno = min_year || 2020;

    for (let i = 1; i < linhas.length; i++) {
      const campos = linhas[i].split(';');
      
      try {
        const codbairro = campos[idx.codbairro]?.trim();
        const ano = parseNumero(campos[idx.ano]);
        
        // Filtrar por bairro somente se filtro foi especificado
        if (filtroCodbairro && codbairro !== filtroCodbairro) {
          linhasFiltradas++;
          continue;
        }
        if (ano && ano < filtroAno) {
          linhasFiltradas++;
          continue;
        }
        
        const logradouro = campos[idx.logradouro]?.trim().toUpperCase() || '';
        const bairro = campos[idx.bairro]?.trim() || '';
        const totalTransacoes = parseNumero(campos[idx.total_transacoes]) || 1;
        const uso = parseUso(campos[idx.uso]);
        const tipologia = campos[idx.tipologia]?.trim().toUpperCase() || null;
        const percentualRaw = parseNumero(campos[idx.percentual]);
        const percentual = normalizaPercentual(percentualRaw);
        const areaRaw = parseNumero(campos[idx.area]);
        const valorRaw = parseNumero(campos[idx.valor_transacao]);
        const mes = parseNumero(campos[idx.mes]) || 1;
        
        // Validar dados mínimos
        if (!logradouro || !ano || !areaRaw || !valorRaw) {
          errosParsing.push(`Linha ${i}: dados incompletos`);
          continue;
        }
        
        // Normalizar área (se muito grande, pode estar com separador errado)
        let area = areaRaw;
        if (area > 10000) {
          // Provavelmente formato X.XXX.XXX interpretado errado
          area = area / 1000;
        }
        if (area > 1000) {
          area = area / 10;
        }
        
        // Normalizar valor
        let valor = valorRaw;
        // Valores de imóveis em Barra da Tijuca: tipicamente R$ 500k - R$ 50M
        // Se valor > 1 bilhão, provavelmente está com separador errado
        if (valor > 1000000000) {
          valor = valor / 1000;
        }
        if (valor > 100000000 && area < 500) {
          valor = valor / 1000;
        }
        
        // Calcular valor/m²
        const valorM2 = area > 0 ? valor / area : null;
        
        // Validar valor/m² razoável (R$ 1.000 a R$ 100.000/m² para Barra)
        if (valorM2 && (valorM2 < 500 || valorM2 > 200000)) {
          // Tentar ajustar
          if (valorM2 < 500 && valor < 100000) {
            // Valor muito baixo, multiplicar por 1000
            valor = valor * 1000;
          } else if (valorM2 > 200000) {
            // Valor muito alto, dividir
            valor = valor / 1000;
          }
        }
        
        // Construir data da transação
        const dataTransacao = `${ano}-${String(mes).padStart(2, '0')}-15`;
        
        registros.push({
          logradouro,
          numero: null,
          complemento: null,
          bairro: bairro.trim() || 'BARRA DA TIJUCA',
          uso,
          tipologia,
          area_m2: Math.round(area * 100) / 100,
          valor_transacao: Math.round(valor * 100) / 100,
          data_transacao: dataTransacao,
          percentual_transferido: Math.round(percentual * 100) / 100,
          total_transacoes: Math.round(totalTransacoes),
        });
        
        linhasProcessadas++;
      } catch (err) {
        errosParsing.push(`Linha ${i}: ${err}`);
      }
    }

    console.log(`Linhas processadas: ${linhasProcessadas}`);
    console.log(`Linhas filtradas: ${linhasFiltradas}`);
    console.log(`Registros válidos: ${registros.length}`);
    console.log(`Erros de parsing: ${errosParsing.length}`);
    
    if (errosParsing.length > 0 && errosParsing.length < 10) {
      console.log('Primeiros erros:', errosParsing.slice(0, 5).join('; '));
    }

    // Amostra de registros para validação
    if (registros.length > 0) {
      const amostra = registros.slice(0, 3).map(r => ({
        logradouro: r.logradouro,
        area: r.area_m2,
        valor: r.valor_transacao,
        valor_m2: r.valor_transacao / r.area_m2,
        data: r.data_transacao,
        total: r.total_transacoes
      }));
      console.log('Amostra de registros:', JSON.stringify(amostra, null, 2));
    }

    // Se solicitado, limpar dados existentes
    if (clear_existing) {
      console.log('Limpando dados existentes...');
      const { error: deleteError } = await supabase
        .from('itbi_transactions')
        .delete()
        .gte('data_transacao', `${filtroAno}-01-01`);
      
      if (deleteError) {
        console.error('Erro ao limpar dados:', deleteError);
      } else {
        console.log('Dados antigos removidos');
      }
    }

    // Inserir em lotes
    const batchSize = 500;
    let totalInseridos = 0;
    const errosInsercao: string[] = [];

    for (let i = 0; i < registros.length; i += batchSize) {
      const batch = registros.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('itbi_transactions')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`Erro no lote ${i}-${i + batchSize}:`, error.message);
        errosInsercao.push(`Lote ${i}: ${error.message}`);
      } else {
        totalInseridos += data?.length || 0;
        console.log(`Inseridos ${totalInseridos}/${registros.length}`);
      }
    }

    // Calcular totais de transações
    const totalTransacoesAgregadas = registros.reduce((sum, r) => sum + (r.total_transacoes || 1), 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Importação concluída',
        estatisticas: {
          linhas_csv: linhas.length - 1,
          linhas_processadas: linhasProcessadas,
          linhas_filtradas: linhasFiltradas,
          registros_validos: registros.length,
          registros_inseridos: totalInseridos,
          total_transacoes_agregadas: totalTransacoesAgregadas,
          erros_parsing: errosParsing.length,
          erros_insercao: errosInsercao.length,
        },
        filtros: {
          codbairro: filtroCodbairro,
          min_year: filtroAno,
        },
        erros: errosInsercao.length > 0 ? errosInsercao : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
