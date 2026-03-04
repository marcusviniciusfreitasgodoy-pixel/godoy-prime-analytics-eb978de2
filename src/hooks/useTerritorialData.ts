import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types
export interface TerritorialCondominio {
  id: string;
  nome_condominio: string;
  logradouro_padrao: string;
  latitude: number;
  longitude: number;
  unidades_estimadas: number | null;
  numero_torres: number | null;
  preco_medio_m2: number | null;
  total_transacoes_itbi: number | null;
  ultima_transacao_itbi: string | null;
  padrao_construtivo: string | null;
  fonte_identificacao: string | null;
  confianca_identificacao: number | null;
  area_lote: number | null;
  area_total_construida: number | null;
  valor_venal_estimado: number | null;
}

export interface TerritorialKPIs {
  total_condominios: number;
  com_historico_precos: number;
  unidades_mapeadas: number;
  preco_medio_m2_barra: number | null;
}

export interface ItbiHistoryPoint {
  periodo: string;
  preco_medio_m2: number;
  transacoes: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface TorreCondominio {
  id: string;
  nome_torre: string | null;
  numero_torre: number | null;
  andares: number | null;
  unidades_estimadas: number | null;
  area_footprint: number | null;
}

export interface LogradouroResumo {
  id: string;
  logradouro: string;
  bairro: string;
  total_imoveis: number | null;
  valor_venal_medio: number | null;
  preco_real_medio_itbi: number | null;
  total_transacoes_itbi: number | null;
  desconto_venal_percentual: number | null;
}

export interface EtlLog {
  id: string;
  fonte: string;
  status: string;
  registros_importados: number | null;
  registros_atualizados: number | null;
  registros_com_erro: number | null;
  iniciado_em: string | null;
  finalizado_em: string | null;
  erro_mensagem: string | null;
}

// Hooks

export function useTerritorialKPIs() {
  return useQuery({
    queryKey: ["territorial-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_territorial_kpis" as any);
      if (error) throw error;
      return data as TerritorialKPIs;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCondominiosBbox(bounds: MapBounds | null) {
  return useQuery({
    queryKey: ["condominios-bbox", bounds],
    queryFn: async () => {
      if (!bounds) return [];
      const { data, error } = await supabase.rpc("get_condominios_bbox" as any, {
        p_north: bounds.north,
        p_south: bounds.south,
        p_east: bounds.east,
        p_west: bounds.west,
        p_limit: 300,
      });
      if (error) throw error;
      return (data || []) as TerritorialCondominio[];
    },
    enabled: !!bounds,
    staleTime: 30 * 1000,
  });
}

export function useCondoItbiHistory(lat: number | null, lng: number | null) {
  return useQuery({
    queryKey: ["condo-itbi-history", lat, lng],
    queryFn: async () => {
      if (!lat || !lng) return [];
      const { data, error } = await supabase.rpc("get_condo_itbi_history" as any, {
        p_lat: lat,
        p_lng: lng,
        p_raio: 150,
      });
      if (error) throw error;
      return (data || []) as ItbiHistoryPoint[];
    },
    enabled: !!lat && !!lng,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTorresByCondominio(condominioId: string | null) {
  return useQuery({
    queryKey: ["torres-condominio", condominioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("torres_condominios")
        .select("id, nome_torre, numero_torre, andares, unidades_estimadas, area_footprint")
        .eq("condominio_id", condominioId!)
        .order("numero_torre");
      if (error) throw error;
      return data as TorreCondominio[];
    },
    enabled: !!condominioId,
  });
}

export function useTerritorialLogradouros() {
  return useQuery({
    queryKey: ["territorial-logradouros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iptu_logradouro_resumo")
        .select("id, logradouro, bairro, total_imoveis, valor_venal_medio, preco_real_medio_itbi, total_transacoes_itbi, desconto_venal_percentual")
        .order("total_imoveis", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as LogradouroResumo[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogradouroSuggestions(search: string) {
  return useQuery({
    queryKey: ["logradouro-suggestions", search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iptu_logradouro_resumo")
        .select("logradouro")
        .ilike("logradouro", `%${search}%`)
        .limit(10);
      if (error) throw error;
      return data?.map((d) => d.logradouro) || [];
    },
    enabled: search.length >= 2,
  });
}

export function useEtlLogs() {
  return useQuery({
    queryKey: ["etl-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etl_log")
        .select("*")
        .order("iniciado_em", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as EtlLog[];
    },
    refetchInterval: 5000,
  });
}

export function useCondominiosRanking() {
  return useQuery({
    queryKey: ["condominios-ranking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios_mapeamento")
        .select("id, nome_condominio, logradouro_padrao, numero_torres, unidades_estimadas, preco_medio_m2, total_transacoes_itbi, ultima_transacao_itbi")
        .not("preco_medio_m2", "is", null)
        .order("preco_medio_m2", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
