import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FeedbackCorretorSection {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackCorretorField {
  id: string;
  section_id: string;
  field_id: string;
  label: string;
  field_type: string; // text | rating | select | checkbox | textarea
  options: any; // JSONB for select options
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useAllFeedbackCorretorConfig() {
  return useQuery({
    queryKey: ["feedback-corretor-config"],
    queryFn: async () => {
      const { data: sections, error: secError } = await supabase
        .from("feedback_corretor_config_sections" as any)
        .select("*")
        .order("display_order");

      if (secError) throw secError;

      const { data: fields, error: fieldError } = await supabase
        .from("feedback_corretor_config_fields" as any)
        .select("*")
        .order("display_order");

      if (fieldError) throw fieldError;

      return {
        sections: sections as unknown as FeedbackCorretorSection[],
        fields: fields as unknown as FeedbackCorretorField[],
      };
    },
  });
}

export function useActiveFeedbackCorretorConfig() {
  return useQuery({
    queryKey: ["feedback-corretor-config-active"],
    queryFn: async () => {
      const { data: sections, error: secError } = await supabase
        .from("feedback_corretor_config_sections" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (secError) throw secError;

      const { data: fields, error: fieldError } = await supabase
        .from("feedback_corretor_config_fields" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (fieldError) throw fieldError;

      return {
        sections: sections as unknown as FeedbackCorretorSection[],
        fields: fields as unknown as FeedbackCorretorField[],
      };
    },
  });
}

// Mutations
export function useCreateSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (section: Omit<FeedbackCorretorSection, "id" | "created_at" | "updated_at" | "organization_id">) => {
      const { data, error } = await supabase
        .from("feedback_corretor_config_sections" as any)
        .insert(section)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-corretor-config"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-corretor-config-active"] });
      toast.success("Seção criada com sucesso");
    },
    onError: (error: Error) => toast.error(`Erro ao criar seção: ${error.message}`),
  });
}

export function useUpdateSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FeedbackCorretorSection> & { id: string }) => {
      const { data, error } = await supabase
        .from("feedback_corretor_config_sections" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-corretor-config"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-corretor-config-active"] });
      toast.success("Seção atualizada");
    },
    onError: (error: Error) => toast.error(`Erro ao atualizar seção: ${error.message}`),
  });
}

export function useDeleteSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("feedback_corretor_config_sections" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-corretor-config"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-corretor-config-active"] });
      toast.success("Seção excluída");
    },
    onError: (error: Error) => toast.error(`Erro ao excluir seção: ${error.message}`),
  });
}

export function useCreateField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (field: Omit<FeedbackCorretorField, "id" | "created_at" | "updated_at" | "organization_id">) => {
      const { data, error } = await supabase
        .from("feedback_corretor_config_fields" as any)
        .insert(field)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-corretor-config"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-corretor-config-active"] });
      toast.success("Campo criado com sucesso");
    },
    onError: (error: Error) => toast.error(`Erro ao criar campo: ${error.message}`),
  });
}

export function useUpdateField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FeedbackCorretorField> & { id: string }) => {
      const { data, error } = await supabase
        .from("feedback_corretor_config_fields" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-corretor-config"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-corretor-config-active"] });
      toast.success("Campo atualizado");
    },
    onError: (error: Error) => toast.error(`Erro ao atualizar campo: ${error.message}`),
  });
}

export function useDeleteField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("feedback_corretor_config_fields" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-corretor-config"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-corretor-config-active"] });
      toast.success("Campo excluído");
    },
    onError: (error: Error) => toast.error(`Erro ao excluir campo: ${error.message}`),
  });
}
