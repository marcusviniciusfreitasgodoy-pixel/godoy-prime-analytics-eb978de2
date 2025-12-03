import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LocationSearchParams {
  query: string;
  tipologia?: string;
  finalidade?: string;
  areaMin?: number;
  areaMax?: number;
}

export interface LocationSearchResult {
  logradouro: string;
  mediana_m2: number;
  media_m2: number;
  total_transacoes: number;
  desvio_padrao: number;
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

      // Normaliza a busca removendo prefixos comuns e criando variações
      // Banco usa: AVN (Avenida), RUA, PRC (Praça), EST (Estrada)
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

      // Busca pelo termo limpo (sem prefixo) OU pelo termo original
      // Isso permite encontrar "AVN LUCIO COSTA" buscando "Lucio Costa" ou "Avenida Lucio Costa"
      let query = supabase
        .from('itbi_transactions')
        .select('id, logradouro, valor_transacao, area_m2, valor_m2, data_transacao, tipologia, uso')
        .or(`logradouro.ilike.%${cleanedSearch}%,logradouro.ilike.%${searchTerm}%`);

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
        .order('data_transacao', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Calculate statistics
      const valores = data.map(t => t.valor_m2!).sort((a, b) => a - b);
      const media = valores.reduce((sum, v) => sum + v, 0) / valores.length;
      const mediana = valores.length % 2 === 0
        ? (valores[valores.length / 2 - 1] + valores[valores.length / 2]) / 2
        : valores[Math.floor(valores.length / 2)];
      
      const variance = valores.reduce((sum, v) => sum + Math.pow(v - media, 2), 0) / valores.length;
      const desvio_padrao = Math.sqrt(variance);

      return {
        logradouro: data[0].logradouro,
        mediana_m2: Math.round(mediana),
        media_m2: Math.round(media),
        total_transacoes: data.length,
        desvio_padrao: Math.round(desvio_padrao),
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
      let query = supabase
        .from('itbi_transactions')
        .select('logradouro, valor_transacao, valor_m2')
        .eq('uso', 'Residencial')
        .not('valor_m2', 'is', null);

      if (params.valorMin) {
        query = query.gte('valor_transacao', params.valorMin);
      }

      if (params.valorMax) {
        query = query.lte('valor_transacao', params.valorMax);
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
        acc[micro].count++;
        return acc;
      }, {} as Record<string, { valores: number[], count: number }>);

      const result = Object.entries(grouped).map(([microbairro, data]) => ({
        microbairro,
        total_transacoes: data.count,
        preco_medio_m2: Math.round(data.valores.reduce((sum, v) => sum + v, 0) / data.valores.length),
      }));

      return result.sort((a, b) => b.total_transacoes - a.total_transacoes).slice(0, 10);
    },
    enabled,
  });
}
