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
      const { data, error } = await supabase.functions.invoke("public-submit", {
        body: { action: "proposta", payload: proposta },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.data ?? data;
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
    // Convert file to base64 and upload via secure edge function
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g. "data:image/jpeg;base64,")
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const { data, error } = await supabase.functions.invoke("public-submit", {
      body: {
        action: "upload-cnh",
        payload: {
          codigo,
          fileData: base64,
          fileName: file.name,
          contentType: file.type,
        },
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.path;
  };

  const getSignedCNHUrl = async (path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from("documentos-proposta")
      .createSignedUrl(path, 3600); // 60 minutos
    if (error || !data?.signedUrl) throw error || new Error("Falha ao gerar URL assinada");
    return data.signedUrl;
  };

  return {
    propostas: propostas.data,
    isLoading: propostas.isLoading,
    createProposta,
    getPropostasByFicha,
    uploadCNH,
    getSignedCNHUrl,
  };
}
