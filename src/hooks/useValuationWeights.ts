import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ValuationWeight {
  id: string;
  nome_variavel: string | null;
  parametro: string | null;
  peso_valor: number | null;
  tipo_imovel: string | null;
  descricao: string | null;
  factor_key: string | null;
  label: string | null;
  multiplier: number | null;
  category: string | null;
  is_active: boolean | null;
  order_index: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export const useValuationWeights = () => {
  return useQuery({
    queryKey: ["valuation-weights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_valuation_weights")
        .select("*")
        .eq("is_active", true)
        .order("order_index");

      if (error) throw error;
      return data as ValuationWeight[];
    },
  });
};
