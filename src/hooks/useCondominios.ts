import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Condominio {
  id: string;
  nome_condominio: string;
  logradouro_padrao: string;
  numero_inicio: number | null;
  numero_fim: number | null;
  microbairro: string | null;
  padrao_construtivo: string | null;
  created_at: string;
}

export const useCondominios = () => {
  return useQuery({
    queryKey: ["condominios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios_mapeamento")
        .select("*")
        .eq("ativo", true)
        .order("nome_condominio");

      if (error) throw error;
      return data as Condominio[];
    },
  });
};

export const useCondominiosByMicrobairro = (microbairro: string) => {
  return useQuery({
    queryKey: ["condominios", "microbairro", microbairro],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios_mapeamento")
        .select("*")
        .eq("ativo", true)
        .eq("microbairro", microbairro)
        .order("nome_condominio");

      if (error) throw error;
      return data as Condominio[];
    },
    enabled: !!microbairro,
  });
};

export const useCondominioByLogradouro = (logradouro: string, numero?: number) => {
  return useQuery({
    queryKey: ["condominio", "logradouro", logradouro, numero],
    queryFn: async () => {
      let query = supabase
        .from("condominios_mapeamento")
        .select("*")
        .eq("ativo", true)
        .eq("logradouro_padrao", logradouro);

      if (numero) {
        query = query
          .or(`numero_inicio.lte.${numero},numero_inicio.is.null`)
          .or(`numero_fim.gte.${numero},numero_fim.is.null`);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data as Condominio | null;
    },
    enabled: !!logradouro,
  });
};
