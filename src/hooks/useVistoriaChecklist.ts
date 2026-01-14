import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VistoriaCategory {
  id: string;
  category_id: string;
  title: string;
  weight: number;
  applies_to: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VistoriaItem {
  id: string;
  category_id: string;
  item_id: string;
  label: string;
  tooltip: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithItems extends VistoriaCategory {
  items: VistoriaItem[];
}

export function useVistoriaCategories(appliesTo?: 'casa' | 'apartamento') {
  return useQuery({
    queryKey: ['vistoria-categories', appliesTo],
    queryFn: async () => {
      let query = supabase
        .from('vistoria_checklist_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (appliesTo) {
        query = query.eq('applies_to', appliesTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VistoriaCategory[];
    },
  });
}

export function useVistoriaItems(categoryId?: string) {
  return useQuery({
    queryKey: ['vistoria-items', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('vistoria_checklist_items')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VistoriaItem[];
    },
    enabled: categoryId !== undefined,
  });
}

export function useVistoriaChecklistFull(appliesTo: 'casa' | 'apartamento') {
  return useQuery({
    queryKey: ['vistoria-checklist-full', appliesTo],
    queryFn: async () => {
      const { data: categories, error: catError } = await supabase
        .from('vistoria_checklist_categories')
        .select('*')
        .eq('applies_to', appliesTo)
        .eq('is_active', true)
        .order('display_order');

      if (catError) throw catError;

      const { data: items, error: itemError } = await supabase
        .from('vistoria_checklist_items')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (itemError) throw itemError;

      const categoriesWithItems: CategoryWithItems[] = (categories || []).map(cat => ({
        ...cat,
        items: (items || []).filter(item => item.category_id === cat.id),
      }));

      return categoriesWithItems;
    },
  });
}

export function useAllVistoriaData() {
  return useQuery({
    queryKey: ['vistoria-all-data'],
    queryFn: async () => {
      const { data: categories, error: catError } = await supabase
        .from('vistoria_checklist_categories')
        .select('*')
        .order('applies_to')
        .order('display_order');

      if (catError) throw catError;

      const { data: items, error: itemError } = await supabase
        .from('vistoria_checklist_items')
        .select('*')
        .order('display_order');

      if (itemError) throw itemError;

      return { categories: categories as VistoriaCategory[], items: items as VistoriaItem[] };
    },
  });
}

// Mutations
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (category: Omit<VistoriaCategory, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('vistoria_checklist_categories')
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vistoria-categories'] });
      queryClient.invalidateQueries({ queryKey: ['vistoria-all-data'] });
      toast({ title: "Categoria criada com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar categoria", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VistoriaCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('vistoria_checklist_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vistoria-categories'] });
      queryClient.invalidateQueries({ queryKey: ['vistoria-all-data'] });
      toast({ title: "Categoria atualizada" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar categoria", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vistoria_checklist_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vistoria-categories'] });
      queryClient.invalidateQueries({ queryKey: ['vistoria-all-data'] });
      toast({ title: "Categoria excluída" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir categoria", description: error.message, variant: "destructive" });
    },
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Omit<VistoriaItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('vistoria_checklist_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vistoria-items'] });
      queryClient.invalidateQueries({ queryKey: ['vistoria-all-data'] });
      toast({ title: "Item criado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar item", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VistoriaItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('vistoria_checklist_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vistoria-items'] });
      queryClient.invalidateQueries({ queryKey: ['vistoria-all-data'] });
      toast({ title: "Item atualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar item", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vistoria_checklist_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vistoria-items'] });
      queryClient.invalidateQueries({ queryKey: ['vistoria-all-data'] });
      toast({ title: "Item excluído" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir item", description: error.message, variant: "destructive" });
    },
  });
}
