import { supabase } from "@/integrations/supabase/client";
import type jsPDF from "jspdf";

/**
 * Faz upload do PDF de uma avaliação para o bucket público `avaliacoes-publicas`
 * e retorna uma URL pública compartilhável (sem login, sem `blob:`).
 *
 * O arquivo é gravado em `<organization_id>/<valuation_id>/<timestamp>.pdf`,
 * respeitando as policies de storage por organização.
 */
export async function uploadValuationPdfPublic(
  pdfDoc: jsPDF,
  valuationId: string,
  filename: string,
): Promise<string> {
  // Obter organization_id do usuário logado
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (profileErr || !profile?.organization_id) {
    throw new Error("Organização não encontrada para o usuário.");
  }

  const orgId = profile.organization_id;
  const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const path = `${orgId}/${valuationId}/${Date.now()}_${safeName}`;

  const pdfBlob = pdfDoc.output("blob");

  const { error: uploadErr } = await supabase.storage
    .from("avaliacoes-publicas")
    .upload(path, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadErr) {
    console.error("Erro ao subir PDF para storage:", uploadErr);
    throw new Error(uploadErr.message || "Falha ao publicar o PDF.");
  }

  const { data: publicData } = supabase.storage
    .from("avaliacoes-publicas")
    .getPublicUrl(path);

  const publicUrl = publicData?.publicUrl;
  if (!publicUrl) {
    throw new Error("Não foi possível obter URL pública do PDF.");
  }

  // Persiste a URL na avaliação para reutilização posterior
  await supabase
    .from("valuations")
    .update({ public_pdf_url: publicUrl })
    .eq("id", valuationId);

  return publicUrl;
}