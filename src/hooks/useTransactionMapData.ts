import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TransactionMapData {
  microbairro: string;
  total_transacoes: number;
  preco_medio_m2: number;
  latitude?: number;
  longitude?: number;
  aproximado?: boolean;
}

interface UseTransactionMapDataParams {
  bairro: string;
  periodoMeses?: number;
  valorMin?: number;
  valorMax?: number;
  areaMin?: number;
  areaMax?: number;
  tipologia?: string;
}

// Limites de outlier por bairro
const OUTLIER_LIMITS: Record<string, number> = {
  'BARRA DA TIJUCA': 50000,
  'RECREIO DOS BANDEIRANTES': 40000,
  'JACAREPAGUA': 30000,
  'COPACABANA': 60000,
  'IPANEMA': 80000,
  'LEBLON': 100000,
  'BOTAFOGO': 50000,
  'TIJUCA': 35000,
  'FLAMENGO': 45000,
  'LARANJEIRAS': 40000,
  'GAVEA': 60000,
  'JARDIM BOTANICO': 55000,
  'LAGOA': 70000,
  'SAO CONRADO': 50000,
  'HUMAITA': 45000,
  'URCA': 60000,
  'CENTRO': 25000,
  'VILA ISABEL': 30000,
  'MEIER': 25000,
};

export function useTransactionMapData(params: UseTransactionMapDataParams, enabled: boolean = true) {
  const { bairro, periodoMeses = 12, valorMin, valorMax, areaMin, areaMax, tipologia } = params;

  return useQuery({
    queryKey: ['transaction-map-data-v2', bairro, periodoMeses, valorMin, valorMax, areaMin, areaMax, tipologia],
    queryFn: async (): Promise<TransactionMapData[]> => {
      console.log('[useTransactionMapData] Buscando dados atualizados para', bairro);
      // Calcular data limite
      const dataLimite = new Date();
      dataLimite.setMonth(dataLimite.getMonth() - periodoMeses);
      const dataStr = dataLimite.toISOString().split('T')[0];

      // Buscar transações ITBI - IMPORTANTE: incluir total_transacoes para contagem correta
      let query = supabase
        .from('itbi_transactions')
        .select('logradouro, valor_m2, valor_transacao, area_m2, tipologia, total_transacoes')
        .eq('bairro', bairro.toUpperCase())
        .gte('data_transacao', dataStr)
        .lte('valor_m2', OUTLIER_LIMITS[bairro.toUpperCase()] || 50000);

      if (valorMin) {
        query = query.gte('valor_transacao', valorMin);
      }
      if (valorMax) {
        query = query.lte('valor_transacao', valorMax);
      }
      if (areaMin) {
        query = query.gte('area_m2', areaMin);
      }
      if (areaMax) {
        query = query.lte('area_m2', areaMax);
      }
      if (tipologia && tipologia !== 'todas') {
        query = query.eq('tipologia', tipologia);
      }

      const { data: transactions, error } = await query;

      if (error) {
        console.error('[useTransactionMapData] Erro ao buscar transações:', error);
        throw error;
      }

      if (!transactions || transactions.length === 0) {
        return [];
      }

      // Agrupar por logradouro - CORRIGIDO: usar total_transacoes ao invés de count
      const groupedData = new Map<string, { total: number; somaPreco: number; somaPrecosPonderados: number }>();
      
      for (const tx of transactions) {
        const logradouro = tx.logradouro;
        if (!logradouro) continue;

        const transCount = (tx as any).total_transacoes || 1;
        const existing = groupedData.get(logradouro);
        if (existing) {
          existing.total += transCount;
          existing.somaPreco += (tx.valor_m2 || 0) * transCount;
          existing.somaPrecosPonderados += transCount;
        } else {
          groupedData.set(logradouro, {
            total: transCount,
            somaPreco: (tx.valor_m2 || 0) * transCount,
            somaPrecosPonderados: transCount,
          });
        }
      }

      // Converter para array
      const aggregatedData = Array.from(groupedData.entries()).map(([logradouro, data]) => ({
        microbairro: logradouro,
        total_transacoes: data.total,
        preco_medio_m2: Math.round(data.somaPreco / data.somaPrecosPonderados),
      }));

      // Ordenar por volume de transações
      aggregatedData.sort((a, b) => b.total_transacoes - a.total_transacoes);

      // Limitar para não sobrecarregar o mapa
      const topLogradouros = aggregatedData.slice(0, 100);

      // Buscar coordenadas via backend function (batch)
      // Força refresh UMA vez por bairro a cada build para evitar “mapa antigo” após ressincronizações.
      try {
        const enderecos = topLogradouros.map((item) => ({
          logradouro: item.microbairro,
          bairro: bairro.toUpperCase(),
        }));

        const refreshKey = `geoRefresh:${bairro.toUpperCase()}`;
        const shouldForceRefresh =
          typeof window !== 'undefined' &&
          window.sessionStorage?.getItem(refreshKey) !== __BUILD_TIMESTAMP__;

        if (shouldForceRefresh) {
          window.sessionStorage?.setItem(refreshKey, __BUILD_TIMESTAMP__);
        }

        const { data: geoData, error: geoError } = await supabase.functions.invoke(
          'geo-logradouro/batch-geocode',
          {
            body: {
              enderecos,
              forceRefresh: !!shouldForceRefresh,
            },
          }
        );

        if (geoError) {
          console.warn('[useTransactionMapData] Erro ao geocodificar:', geoError);
        }

        interface GeoResult {
          logradouro: string;
          latitude?: number;
          longitude?: number;
          aproximado?: boolean;
          source?: string;
        }

        if (geoData?.data) {
          const geoMap = new Map<string, GeoResult>(
            (geoData.data as GeoResult[]).map((g) => [g.logradouro, g])
          );

          // Log para debug - quantos são Google vs fallback
          const googleCount = (geoData.data as GeoResult[]).filter(g => g.source === 'google' || g.source === 'google_cache').length;
          const fallbackCount = (geoData.data as GeoResult[]).filter(g => g.source?.includes('fallback')).length;
          console.log(`[useTransactionMapData] Geocoding: ${googleCount} Google, ${fallbackCount} fallback, ${(geoData.data as GeoResult[]).length} total`);

          return topLogradouros.map(item => {
            const geo = geoMap.get(item.microbairro);
            return {
              ...item,
              latitude: geo?.latitude,
              longitude: geo?.longitude,
              aproximado: geo?.aproximado || geo?.source?.includes('fallback'),
            };
          });
        }
      } catch (geoError) {
        console.warn('[useTransactionMapData] Falha no geocoding, usando dados sem coordenadas:', geoError);
      }

      // Retornar sem coordenadas se geocoding falhar
      return topLogradouros;
    },
    enabled: enabled && !!bairro,
    staleTime: 1 * 60 * 1000, // 1 minuto - cache mais curto para pegar atualizações Google
    gcTime: 2 * 60 * 1000, // Garbage collect após 2 minutos
    refetchOnMount: true, // Sempre recarregar ao montar
  });
}
