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
      // Buscar todos os usuários com role de corretor, gerente ou admin
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id");

      if (rolesError) throw rolesError;

      const userIds = roles?.map((r: any) => r.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, email, creci" as any)
        .in("id", userIds);

      if (profilesError) throw profilesError;
      return (profiles as unknown as CorretorProfile[]) || [];
    },
  });

  const getCorretorById = (id: string) => corretores?.find((c) => c.id === id) || null;

  return { corretores: corretores || [], isLoading, getCorretorById };
}
