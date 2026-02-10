import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CorretorProfile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  creci: string | null;
}

export function useCorretores() {
  const { data: corretores, isLoading } = useQuery({
    queryKey: ["corretores-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_corretores_list");
      if (error) throw error;
      return (data as unknown as CorretorProfile[]) || [];
    },
  });

  const getCorretorById = (id: string) => corretores?.find((c) => c.id === id) || null;

  return { corretores: corretores || [], isLoading, getCorretorById };
}
