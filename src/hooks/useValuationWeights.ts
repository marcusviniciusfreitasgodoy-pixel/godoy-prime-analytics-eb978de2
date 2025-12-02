import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ValuationWeight {
  id: string;
  nome_variavel: string;
  parametro: string;
  peso_valor: number;
  tipo_imovel: "Apartamento" | "Casa" | "Ambos";
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

export const useValuationWeights = () => {
  return useQuery({
    queryKey: ["valuation-weights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_valuation_weights")
        .select("*")
        .order("nome_variavel");

      if (error) throw error;
      return data as ValuationWeight[];
    },
  });
};

export const useValuationWeightsByTipo = (tipoImovel: "Apartamento" | "Casa") => {
  return useQuery({
    queryKey: ["valuation-weights", "tipo", tipoImovel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_valuation_weights")
        .select("*")
        .in("tipo_imovel", [tipoImovel, "Ambos"])
        .order("nome_variavel");

      if (error) throw error;
      return data as ValuationWeight[];
    },
    enabled: !!tipoImovel,
  });
};

export const useValuationWeightByVariavel = (nomeVariavel: string, tipoImovel: "Apartamento" | "Casa") => {
  return useQuery({
    queryKey: ["valuation-weight", nomeVariavel, tipoImovel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_valuation_weights")
        .select("*")
        .eq("nome_variavel", nomeVariavel)
        .in("tipo_imovel", [tipoImovel, "Ambos"])
        .maybeSingle();

      if (error) throw error;
      return data as ValuationWeight | null;
    },
    enabled: !!nomeVariavel && !!tipoImovel,
  });
};
