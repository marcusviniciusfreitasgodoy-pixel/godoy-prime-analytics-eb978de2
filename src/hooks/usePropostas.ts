import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePropostas() {
  const queryClient = useQueryClient();

  const propostas = useQuery({
    queryKey: ["propostas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("propostas_compra" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const createProposta = useMutation({
    mutationFn: async (proposta: Record<string, any>) => {
      const { data, error } = await supabase
        .from("propostas_compra" as any)
        .insert(proposta as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["propostas"] });
      toast.success("Proposta enviada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao criar proposta:", error);
      toast.error("Erro ao enviar proposta");
    },
  });

  const getPropostasByFicha = async (fichaVisitaId: string) => {
    const { data, error } = await supabase
      .from("propostas_compra" as any)
      .select("*")
      .eq("ficha_visita_id", fichaVisitaId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  };

  const uploadCNH = async (file: File, codigo: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${codigo}/cnh-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("documentos-proposta")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from("documentos-proposta")
      .getPublicUrl(path);
    return urlData.publicUrl;
  };

  return {
    propostas: propostas.data,
    isLoading: propostas.isLoading,
    createProposta,
    getPropostasByFicha,
    uploadCNH,
  };
}
