import { useQuery } from '@tanstack/react-query';
import { supabase, Database } from '@/integrations/supabase/client';

type Condominio = Database['public']['Tables']['condominios_mapeamento']['Row'];

export function useCondominios() {
  return useQuery<Condominio[]>({
    queryKey: ['condominios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('condominios_mapeamento')
        .select('*')
        .order('nome_condominio');

      if (error) throw error;
      return data || [];
    },
  });
}
