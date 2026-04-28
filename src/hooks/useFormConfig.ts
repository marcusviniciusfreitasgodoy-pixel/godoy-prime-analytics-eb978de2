import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TipoFormulario =
  | "ficha_visita"
  | "feedback_cliente"
  | "feedback_corretor"
  | "proposta_compra";

export interface FormConfigSection {
  id: string;
  tipo_formulario: TipoFormulario;
  section_id: string;
  title: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormConfigField {
  id: string;
  tipo_formulario: TipoFormulario;
  section_id: string;
  field_id: string;
  label: string;
  field_type: string;
  placeholder: string | null;
  help_text: string | null;
  options: any;
  is_required: boolean;
  is_locked: boolean;
  display_order: number;
  is_active: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  modelos: string[] | null;
}

export function useFormConfig(tipoFormulario: TipoFormulario) {
  const queryClient = useQueryClient();
  const queryKey = ["form-config", tipoFormulario];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: sections, error: secError } = await supabase
        .from("form_config_sections" as any)
        .select("*")
        .eq("tipo_formulario", tipoFormulario)
        .order("display_order");
      if (secError) throw secError;

      const { data: fields, error: fieldError } = await supabase
        .from("form_config_fields" as any)
        .select("*")
        .eq("tipo_formulario", tipoFormulario)
        .order("display_order");
      if (fieldError) throw fieldError;

      return {
        sections: sections as unknown as FormConfigSection[],
        fields: fields as unknown as FormConfigField[],
      };
    },
  });

  const activeConfig = useQuery({
    queryKey: [...queryKey, "active"],
    queryFn: async () => {
      const { data: sections, error: secError } = await supabase
        .from("form_config_sections" as any)
        .select("*")
        .eq("tipo_formulario", tipoFormulario)
        .eq("is_active", true)
        .order("display_order");
      if (secError) throw secError;

      const { data: fields, error: fieldError } = await supabase
        .from("form_config_fields" as any)
        .select("*")
        .eq("tipo_formulario", tipoFormulario)
        .eq("is_active", true)
        .order("display_order");
      if (fieldError) throw fieldError;

      return {
        sections: sections as unknown as FormConfigSection[],
        fields: fields as unknown as FormConfigField[],
      };
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const createSection = useMutation({
    mutationFn: async (section: { section_id: string; title: string; description?: string | null; display_order: number; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("form_config_sections" as any)
        .insert({ ...section, tipo_formulario: tipoFormulario })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Seção criada"); },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FormConfigSection> & { id: string }) => {
      const { data, error } = await supabase
        .from("form_config_sections" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Seção atualizada"); },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("form_config_sections" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Seção excluída"); },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const createField = useMutation({
    mutationFn: async (field: Omit<FormConfigField, "id" | "created_at" | "updated_at" | "organization_id" | "tipo_formulario">) => {
      const { data, error } = await supabase
        .from("form_config_fields" as any)
        .insert({ ...field, tipo_formulario: tipoFormulario })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Campo criado"); },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const updateField = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FormConfigField> & { id: string }) => {
      const { data, error } = await supabase
        .from("form_config_fields" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Campo atualizado"); },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const deleteField = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("form_config_fields" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Campo excluído"); },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  return {
    data,
    isLoading,
    activeConfig: activeConfig.data,
    activeConfigLoading: activeConfig.isLoading,
    createSection,
    updateSection,
    deleteSection,
    createField,
    updateField,
    deleteField,
  };
}
