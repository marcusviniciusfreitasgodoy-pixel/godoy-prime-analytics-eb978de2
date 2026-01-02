import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

export type DocumentType = 'ficha_visita' | 'avaliacao' | 'vistoria' | 'checklist';

interface SendPdfEmailParams {
  to: string;
  recipientName: string;
  subject: string;
  pdfDoc: jsPDF;
  pdfFilename: string;
  documentType: DocumentType;
  customMessage?: string;
}

export async function sendPdfByEmail({
  to,
  recipientName,
  subject,
  pdfDoc,
  pdfFilename,
  documentType,
  customMessage,
}: SendPdfEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Convert PDF to base64
    const pdfBase64 = pdfDoc.output('datauristring').split(',')[1];

    const { data, error } = await supabase.functions.invoke("send-pdf-email", {
      body: {
        to,
        recipientName,
        subject,
        pdfBase64,
        pdfFilename,
        documentType,
        customMessage,
      },
    });

    if (error) {
      console.error("Error sending PDF email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error invoking send-pdf-email function:", err);
    return { success: false, error: err.message };
  }
}

// Helper to generate PDF without saving and get it for email
export async function generatePdfForEmail(
  generatePdfFn: () => Promise<jsPDF> | jsPDF
): Promise<jsPDF> {
  return await generatePdfFn();
}
