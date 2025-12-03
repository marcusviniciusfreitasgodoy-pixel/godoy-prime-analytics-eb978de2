import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LocationSearchParams {
  query: string;
  tipologia?: string;
  finalidade?: string;
  areaMin?: number;
  areaMax?: number;
  periodoMeses?: number;
}

export interface LocationSearchResult {
  logradouro: string;
  mediana_m2: number;
  media_m2: number;
  total_transacoes: number;
  desvio_padrao: number;
  nome_condominio?: string;
  microbairro?: string;
  padrao_construtivo?: string;
  transacoes: {
    id: string;
    valor_transacao: number;
    area_m2: number;
    valor_m2: number;
    data_transacao: string;
    tipologia: string | null;
  }[];
}

export function useLocationSearch(params: LocationSearchParams, enabled: boolean = false) {
  return useQuery<LocationSearchResult | null>({
    queryKey: ['location-search', params],
    queryFn: async () => {
      if (!params.query || params.query.length < 3) return null;

      // Período configurável (padrão: 12 meses)
      const meses = params.periodoMeses || 12;
      const startDateCalc = new Date();
      startDateCalc.setMonth(startDateCalc.getMonth() - meses);
      const startDate = startDateCalc.toISOString().split('T')[0];

      // Normaliza a busca removendo prefixos comuns e criando variações
      const searchTerm = params.query.toUpperCase().trim();
      
      // Remove prefixos comuns para buscar apenas o nome
      const cleanedSearch = searchTerm
        .replace(/^(AVENIDA|AVN|AV|AV\.|AVENUE)\s*/i, '')
        .replace(/^(RUA|R|R\.)\s*/i, '')
        .replace(/^(PRAÇA|PRC|PRACA)\s*/i, '')
        .replace(/^(ESTRADA|EST|EST\.)\s*/i, '')
        .replace(/^(ALAMEDA|AL|AL\.)\s*/i, '')
        .replace(/^(TRAVESSA|TV|TV\.)\s*/i, '')
        .trim();

      // 1. Buscar na tabela de mapeamento de condomínios
      const { data: condominioMatch } = await supabase
        .from('condominios_mapeamento')
        .select('logradouro_padrao, nome_condominio, microbairro, padrao_construtivo')
        .or(`nome_condominio.ilike.%${cleanedSearch}%,nome_condominio.ilike.%${searchTerm}%,logradouro_padrao.ilike.%${cleanedSearch}%,logradouro_padrao.eq.${searchTerm}`)
        .limit(1)
        .maybeSingle();

      // Se encontrou um condomínio, usar o logradouro padrão para a busca
      const actualSearchLogradouro = condominioMatch?.logradouro_padrao || searchTerm;
      const condInfo = condominioMatch ? {
        nome_condominio: condominioMatch.nome_condominio,
        microbairro: condominioMatch.microbairro || undefined,
        padrao_construtivo: condominioMatch.padrao_construtivo || undefined,
      } : null;

      // 2. Buscar transações pelo logradouro (exato se condomínio encontrado, fuzzy caso contrário)
      let query = supabase
        .from('itbi_transactions')
        .select('id, logradouro, valor_transacao, area_m2, valor_m2, data_transacao, tipologia, uso, total_transacoes')
        .gte('data_transacao', startDate);

      if (condominioMatch) {
        // Busca exata pelo logradouro do condomínio
        query = query.eq('logradouro', condominioMatch.logradouro_padrao);
      } else {
        // Busca fuzzy pelo termo original
        query = query.or(`logradouro.ilike.%${cleanedSearch}%,logradouro.ilike.%${searchTerm}%`);
      }

      // Apply filters
      if (params.finalidade) {
        query = query.eq('uso', params.finalidade === 'residencial' ? 'Residencial' : 'Comercial');
      }

      if (params.tipologia) {
        query = query.ilike('tipologia', `%${params.tipologia}%`);
      }

      if (params.areaMin) {
        query = query.gte('area_m2', params.areaMin);
      }

      if (params.areaMax) {
        query = query.lte('area_m2', params.areaMax);
      }

      const { data, error } = await query
        .not('valor_m2', 'is', null)
        .gte('percentual_transferido', 90)
        .order('data_transacao', { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Calcular total real de transações (SUM de total_transacoes, não count de registros)
      const totalTransacoesReal = data.reduce((sum, t) => sum + (t.total_transacoes || 1), 0);

      // Calculate statistics com ponderação
      const valores = data.map(t => t.valor_m2!).sort((a, b) => a - b);
      
      // Média ponderada por total_transacoes
      let somaValoresPonderados = 0;
      let somaPesos = 0;
      for (const t of data) {
        const peso = t.total_transacoes || 1;
        somaValoresPonderados += t.valor_m2! * peso;
        somaPesos += peso;
      }
      const media = somaPesos > 0 ? somaValoresPonderados / somaPesos : 0;
      
      const mediana = valores.length % 2 === 0
        ? (valores[valores.length / 2 - 1] + valores[valores.length / 2]) / 2
        : valores[Math.floor(valores.length / 2)];
      
      const variance = valores.reduce((sum, v) => sum + Math.pow(v - media, 2), 0) / valores.length;
      const desvio_padrao = Math.sqrt(variance);

      return {
        logradouro: data[0].logradouro,
        mediana_m2: Math.round(mediana),
        media_m2: Math.round(media),
        total_transacoes: totalTransacoesReal,
        desvio_padrao: Math.round(desvio_padrao),
        nome_condominio: condInfo?.nome_condominio,
        microbairro: condInfo?.microbairro,
        padrao_construtivo: condInfo?.padrao_construtivo,
        transacoes: data.map(t => ({
          id: t.id,
          valor_transacao: t.valor_transacao,
          area_m2: t.area_m2,
          valor_m2: t.valor_m2!,
          data_transacao: t.data_transacao,
          tipologia: t.tipologia,
        })),
      };
    },
    enabled,
  });
}

export interface TransactionSearchParams {
  valorMin?: number;
  valorMax?: number;
  bairro?: string;
  tipologia?: string;
  periodoMeses?: number;
  areaMin?: number;
  areaMax?: number;
}

export interface MicrobairroLiquidez {
  microbairro: string;
  total_transacoes: number;
  preco_medio_m2: number;
}

export function useTransactionSearch(params: TransactionSearchParams, enabled: boolean = false) {
  return useQuery<MicrobairroLiquidez[]>({
    queryKey: ['transaction-search', params],
    queryFn: async () => {
      // Período configurável (padrão: 12 meses)
      const meses = params.periodoMeses || 12;
      const startDateCalc = new Date();
      startDateCalc.setMonth(startDateCalc.getMonth() - meses);
      const startDate = startDateCalc.toISOString().split('T')[0];

      let query = supabase
        .from('itbi_transactions')
        .select('logradouro, valor_transacao, valor_m2, total_transacoes, data_transacao')
        .eq('uso', 'Residencial')
        .not('valor_m2', 'is', null)
        .gte('percentual_transferido', 90)
        .gte('data_transacao', startDate);

      // Filtro por bairro
      if (params.bairro) {
        query = query.ilike('bairro', params.bairro);
      }

      // Filtro por tipologia
      if (params.tipologia) {
        query = query.ilike('tipologia', `%${params.tipologia}%`);
      }

      // Filtro por valor
      if (params.valorMin) {
        query = query.gte('valor_transacao', params.valorMin);
      }

      if (params.valorMax) {
        query = query.lte('valor_transacao', params.valorMax);
      }

      // Filtro por área
      if (params.areaMin) {
        query = query.gte('area_m2', params.areaMin);
      }

      if (params.areaMax) {
        query = query.lte('area_m2', params.areaMax);
      }

      const { data, error } = await query.limit(5000);

      if (error) throw error;

      // Group by microbairro (logradouro for now)
      const grouped = (data || []).reduce((acc, t) => {
        const micro = t.logradouro;
        if (!acc[micro]) {
          acc[micro] = { valores: [], count: 0 };
        }
        acc[micro].valores.push(t.valor_m2!);
        acc[micro].count += t.total_transacoes || 1;
        return acc;
      }, {} as Record<string, { valores: number[], count: number }>);

      const allResults = Object.entries(grouped).map(([microbairro, data]) => ({
        microbairro,
        total_transacoes: data.count,
        preco_medio_m2: Math.round(data.valores.reduce((sum, v) => sum + v, 0) / data.valores.length),
      }));

      // Calcular total geral de todas as transações
      const totalGeralTransacoes = allResults.reduce((sum, r) => sum + r.total_transacoes, 0);
      
      // Retornar TOP 10 com metadata do total geral
      const top10 = allResults.sort((a, b) => b.total_transacoes - a.total_transacoes).slice(0, 10);
      
      // Adicionar totalGeral ao primeiro item como metadata (workaround)
      if (top10.length > 0) {
        (top10 as any).__totalGeral = totalGeralTransacoes;
        (top10 as any).__totalLogradouros = allResults.length;
      }
      
      return top10;
    },
    enabled,
  });
}
