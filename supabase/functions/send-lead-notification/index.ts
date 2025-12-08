import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LeadNotificationRequest {
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  interesse: string;
  bairro?: string;
  area?: number;
  tipologia?: string;
  quartos?: number;
  banheiros?: number;
  suites?: number;
  vagas?: number;
  estimativaMin?: number;
  estimativaMed?: number;
  estimativaMax?: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: LeadNotificationRequest = await req.json();
    console.log("Received lead notification request:", data);

    const formatCurrency = (value: number | undefined) => {
      if (!value) return "N/A";
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    };

    const propertyDetails = `
      <ul style="margin: 0; padding-left: 20px;">
        ${data.bairro ? `<li><strong>Bairro:</strong> ${data.bairro}</li>` : ""}
        ${data.tipologia ? `<li><strong>Tipologia:</strong> ${data.tipologia}</li>` : ""}
        ${data.area ? `<li><strong>Área:</strong> ${data.area} m²</li>` : ""}
        ${data.quartos ? `<li><strong>Quartos:</strong> ${data.quartos}</li>` : ""}
        ${data.suites ? `<li><strong>Suítes:</strong> ${data.suites}</li>` : ""}
        ${data.banheiros ? `<li><strong>Banheiros:</strong> ${data.banheiros}</li>` : ""}
        ${data.vagas ? `<li><strong>Vagas:</strong> ${data.vagas}</li>` : ""}
      </ul>
    `;

    const estimativaDetails = data.estimativaMin && data.estimativaMed && data.estimativaMax ? `
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="margin: 0 0 10px 0; color: #0C2340;">Estimativa Rápida:</h4>
        <p style="margin: 5px 0;"><strong>Mínimo:</strong> ${formatCurrency(data.estimativaMin)}</p>
        <p style="margin: 5px 0;"><strong>Médio:</strong> ${formatCurrency(data.estimativaMed)}</p>
        <p style="margin: 5px 0;"><strong>Máximo:</strong> ${formatCurrency(data.estimativaMax)}</p>
      </div>
    ` : "";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0C2340; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; color: #D4AF37; }
          .content { background: #ffffff; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
          .cta { background: #D4AF37; color: #0C2340; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px; font-weight: bold; }
          .contact-info { background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏠 Godoy Prime Realty</h1>
            <p style="margin: 10px 0 0 0;">Nova Solicitação de Avaliação Completa</p>
          </div>
          
          <div class="content">
            <div class="cta">
              ⚡ NOVO LEAD - AVALIAÇÃO COMPLETA
            </div>
            
            <h3 style="color: #0C2340;">Dados do Cliente:</h3>
            <div class="contact-info">
              <p style="margin: 5px 0;"><strong>Nome:</strong> ${data.leadName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${data.leadEmail}</p>
              <p style="margin: 5px 0;"><strong>Telefone:</strong> ${data.leadPhone}</p>
              <p style="margin: 5px 0;"><strong>Interesse:</strong> ${data.interesse === 'venda' ? 'Vender Imóvel' : 'Comprar Imóvel'}</p>
            </div>
            
            <h3 style="color: #0C2340;">Detalhes do Imóvel:</h3>
            ${propertyDetails}
            
            ${estimativaDetails}
            
            <p style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #D4AF37;">
              <strong>Mensagem do cliente:</strong><br>
              "Quero contato para agendar uma Avaliação Completa"
            </p>
            
            <div class="footer">
              <p>Este email foi enviado automaticamente pelo sistema Godoy Prime Analytics.</p>
              <p>© ${new Date().getFullYear()} Godoy Prime Realty - CRECI 11841</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "Godoy Prime <onboarding@resend.dev>",
      to: ["contato@godoyprime.com.br"],
      subject: `🏠 Nova Solicitação de Avaliação Completa - ${data.leadName}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notificação enviada com sucesso",
        emailId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-lead-notification function:", error);
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
