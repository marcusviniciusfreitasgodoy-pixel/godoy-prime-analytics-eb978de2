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
    queryKey: ['transaction-map-data', bairro, periodoMeses, valorMin, valorMax, areaMin, areaMax, tipologia],
    queryFn: async (): Promise<TransactionMapData[]> => {
      // Calcular data limite
      const dataLimite = new Date();
      dataLimite.setMonth(dataLimite.getMonth() - periodoMeses);
      const dataStr = dataLimite.toISOString().split('T')[0];

      // Buscar transações ITBI
      let query = supabase
        .from('itbi_transactions')
        .select('logradouro, valor_m2, valor_transacao, area_m2, tipologia')
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

      // Agrupar por logradouro
      const groupedData = new Map<string, { total: number; somaPreco: number }>();
      
      for (const tx of transactions) {
        const logradouro = tx.logradouro;
        if (!logradouro) continue;

        const existing = groupedData.get(logradouro);
        if (existing) {
          existing.total++;
          existing.somaPreco += tx.valor_m2 || 0;
        } else {
          groupedData.set(logradouro, {
            total: 1,
            somaPreco: tx.valor_m2 || 0,
          });
        }
      }

      // Converter para array
      const aggregatedData = Array.from(groupedData.entries()).map(([logradouro, data]) => ({
        microbairro: logradouro,
        total_transacoes: data.total,
        preco_medio_m2: Math.round(data.somaPreco / data.total),
      }));

      // Ordenar por volume de transações
      aggregatedData.sort((a, b) => b.total_transacoes - a.total_transacoes);

      // Limitar para não sobrecarregar o mapa
      const topLogradouros = aggregatedData.slice(0, 100);

      // Buscar coordenadas via edge function (batch)
      try {
        const enderecos = topLogradouros.map(item => ({
          logradouro: item.microbairro,
          bairro: bairro.toUpperCase(),
        }));

        const { data: geoData, error: geoError } = await supabase.functions.invoke('geo-logradouro/batch-geocode', {
          body: { enderecos },
        });

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

          return topLogradouros.map(item => {
            const geo = geoMap.get(item.microbairro);
            return {
              ...item,
              latitude: geo?.latitude,
              longitude: geo?.longitude,
              aproximado: geo?.aproximado || geo?.source === 'fallback',
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
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
