import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CorretorProfileData {
  full_name: string;
  phone: string | null;
  email: string | null;
  creci: string | null;
}

export function useCorretorProfile() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["corretor-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, email, creci" as any)
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data as unknown as CorretorProfileData;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<CorretorProfileData>) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("profiles")
        .update(updates as any)
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corretor-profile"] });
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar perfil");
    },
  });

  return { profile, isLoading, updateProfile };
}
