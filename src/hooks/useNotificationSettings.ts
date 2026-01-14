import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface NotificationSettings {
  id: string;
  user_id: string;
  whatsapp_confirmacao: boolean;
  whatsapp_lembrete: boolean;
  whatsapp_cancelamento: boolean;
  whatsapp_reagendamento: boolean;
  lembrete_horas_antes: number;
  created_at: string;
  updated_at: string;
}

const defaultSettings: Omit<NotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  whatsapp_confirmacao: true,
  whatsapp_lembrete: true,
  whatsapp_cancelamento: true,
  whatsapp_reagendamento: true,
  lembrete_horas_antes: 24,
};

export function useNotificationSettings() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["notification-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("notification_settings" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar configurações:", error);
        return null;
      }

      return data as unknown as NotificationSettings | null;
    },
    enabled: !!user?.id,
  });

  const upsertSettings = useMutation({
    mutationFn: async (newSettings: Partial<NotificationSettings>) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data: existing } = await supabase
        .from("notification_settings" as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from("notification_settings" as any)
          .update(newSettings)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;
        return data as unknown as NotificationSettings;
      } else {
        // Insert
        const { data, error } = await supabase
          .from("notification_settings" as any)
          .insert({ ...defaultSettings, ...newSettings, user_id: user.id })
          .select()
          .single();

        if (error) throw error;
        return data as unknown as NotificationSettings;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Configurações salvas!");
    },
    onError: (error) => {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
    },
  });

  // Retorna as configurações ou os valores padrão
  const currentSettings = settings || {
    ...defaultSettings,
    id: '',
    user_id: user?.id || '',
    created_at: '',
    updated_at: '',
  };

  return {
    settings: currentSettings,
    isLoading,
    updateSettings: upsertSettings.mutate,
    isUpdating: upsertSettings.isPending,
  };
}

// Função para buscar configurações (para uso em services)
export async function fetchNotificationSettings(): Promise<NotificationSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("notification_settings" as any)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as NotificationSettings;
}
