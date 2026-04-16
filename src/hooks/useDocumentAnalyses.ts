import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DocumentAnalysisRecord {
  id: string;
  organization_id: string | null;
  user_id: string;
  file_name: string;
  file_path: string | null;
  file_mime_type: string | null;
  file_size_bytes: number | null;
  tipo_documento: string | null;
  status: string | null;
  status_motivo: string | null;
  dados_extraidos: Record<string, any>;
  alertas: string[];
  validade: string | null;
  checklist_item: string | null;
  proximos_passos: string[];
  confianca: string | null;
  raw_response: string | null;
  ficha_visita_id: string | null;
  created_at: string;
  updated_at: string;
  file_expires_at: string | null;
  expires_at: string | null;
}

export const FILE_RETENTION_DAYS = 30;
export const ANALYSIS_RETENTION_DAYS = 180;

export function useDocumentAnalyses() {
  return useQuery({
    queryKey: ["document-analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as DocumentAnalysisRecord[];
    },
  });
}

export function useDeleteDocumentAnalysis() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (record: DocumentAnalysisRecord) => {
      if (record.file_path) {
        await supabase.storage.from("document-analyses").remove([record.file_path]);
      }
      const { error } = await supabase
        .from("document_analyses")
        .delete()
        .eq("id", record.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-analyses"] });
      toast({ title: "Análise removida" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    },
  });
}

export async function getDocumentFileUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("document-analyses")
    .createSignedUrl(filePath, 3600);
  if (error) return null;
  return data.signedUrl;
}

/** Dias restantes (arredondado p/ baixo). Negativo = já expirou. */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
