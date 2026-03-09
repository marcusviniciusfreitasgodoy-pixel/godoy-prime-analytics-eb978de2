import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CondominiosStats {
  total: number;
  comCoordenadas: number;
  semCoordenadas: number;
  comMicrobairro: number;
  semMicrobairro: number;
  comNumero: number;
  semNumero: number;
  isLoading: boolean;
}

export function useCondominiosStats() {
  const [stats, setStats] = useState<CondominiosStats>({
    total: 0,
    comCoordenadas: 0,
    semCoordenadas: 0,
    comMicrobairro: 0,
    semMicrobairro: 0,
    comNumero: 0,
    semNumero: 0,
    isLoading: true,
  });

  const fetchStats = useCallback(async () => {
    setStats(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Buscar todos os condomínios para calcular estatísticas
      const { data, error } = await supabase
        .from("condominios_mapeamento")
        .select("id, latitude, longitude, microbairro, numero_inicio")
        .eq("ativo", true);

      if (error) {
        console.error("Erro ao buscar estatísticas:", error);
        return;
      }

      const total = data?.length || 0;
      const comCoordenadas = data?.filter(c => c.latitude !== null && c.longitude !== null).length || 0;
      const comMicrobairro = data?.filter(c => c.microbairro !== null && c.microbairro !== '').length || 0;
      const comNumero = data?.filter(c => c.numero_inicio !== null).length || 0;

      setStats({
        total,
        comCoordenadas,
        semCoordenadas: total - comCoordenadas,
        comMicrobairro,
        semMicrobairro: total - comMicrobairro,
        comNumero,
        semNumero: total - comNumero,
        isLoading: false,
      });
    } catch (error) {
      console.error("Erro ao calcular estatísticas:", error);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, refetch: fetchStats };
}
