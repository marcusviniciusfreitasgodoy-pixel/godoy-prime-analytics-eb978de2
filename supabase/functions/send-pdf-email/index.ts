import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendPdfEmailRequest {
  to: string;
  subject: string;
  recipientName: string;
  pdfBase64: string;
  pdfFilename: string;
  documentType: 'ficha_visita' | 'avaliacao' | 'vistoria' | 'checklist';
  customMessage?: string;
}

const AGENCY_NAME = "Godoy Prime";

function getEmailHtml(recipientName: string, documentType: string, customMessage?: string): string {
  const documentLabels: Record<string, string> = {
    ficha_visita: 'Ficha de Visita Técnica',
    avaliacao: 'Relatório de Avaliação Imobiliária',
    vistoria: 'Relatório de Vistoria Digital',
    checklist: 'Checklist de Documentação',
  };

  const docLabel = documentLabels[documentType] || 'Documento';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background-color: #1a1a2e; padding: 30px; text-align: center;">
          <h1 style="color: #d4af37; margin: 0; font-size: 24px;">Godoy Prime</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">${docLabel}</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
            Olá <strong>${recipientName}</strong>,
          </p>
          
          <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
            Segue em anexo o documento <strong>${docLabel}</strong> conforme solicitado.
          </p>
          
          ${customMessage ? `
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #d4af37;">
            <p style="color: #666; font-size: 14px; margin: 0; font-style: italic;">
              ${customMessage}
            </p>
          </div>
          ` : ''}
          
          <p style="color: #666; font-size: 14px; margin: 20px 0;">
            Em caso de dúvidas, não hesite em entrar em contato conosco.
          </p>
          
          <p style="color: #333; font-size: 14px; margin: 20px 0 0 0;">
            Atenciosamente,<br>
            <strong>Equipe Godoy Prime</strong>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            Godoy Prime - Inteligência Imobiliária<br>
            Tel: (21) 96407-5124 | www.godoyprime.com.br
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, recipientName, pdfBase64, pdfFilename, documentType, customMessage }: SendPdfEmailRequest = await req.json();

    console.log(`Sending PDF email to: ${to}, document type: ${documentType}`);

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${AGENCY_NAME} <onboarding@resend.dev>`,
        to: [to],
        subject: subject,
        html: getEmailHtml(recipientName, documentType, customMessage),
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBase64,
          },
        ],
      }),
    });

    const result = await response.json();
    console.log("Email sent:", result);

    if (!response.ok) {
      throw new Error(result.message || "Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-pdf-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
