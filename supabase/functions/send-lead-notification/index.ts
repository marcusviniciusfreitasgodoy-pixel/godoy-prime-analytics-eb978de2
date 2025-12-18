import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LeadNotificationRequest {
  type: "initial" | "complete";
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  interesse: string;
  objetivo?: string;
  urgencia?: string;
  preferencia_contato?: string;
  bairro?: string;
  area?: number;
  tipologia?: string;
  quartos?: number;
  banheiros?: number;
  suites?: number;
  vagas?: number;
  diferenciais?: string;
  estimativaMin?: number;
  estimativaMed?: number;
  estimativaMax?: number;
  enderecoImovelAnalise?: string;
  valorPedidoVendedor?: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== send-lead-notification START ===");
  console.log("Method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: LeadNotificationRequest = await req.json();
    console.log("Received notification request:", JSON.stringify(data, null, 2));
    
    // Validate required fields
    if (!data.leadName || !data.leadEmail || !data.leadPhone) {
      console.error("Missing required fields:", { name: data.leadName, email: data.leadEmail, phone: data.leadPhone });
      return new Response(
        JSON.stringify({ error: "Missing required fields: leadName, leadEmail, leadPhone" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formatCurrency = (value: number | undefined) => {
      if (!value) return "N/A";
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    };

    const isCompra = data.interesse === "compra";
    const notificationType = data.type || "initial";

    console.log("Processing notification type:", notificationType, "interesse:", data.interesse);

    // Determine service type based on interest
    const serviceType = isCompra 
      ? "Personal Shopper Imobiliário" 
      : "Captação de Imóveis";
    
    const serviceDescription = isCompra
      ? "O cliente está buscando um imóvel para compra. Oportunidade para oferecer os serviços de Personal Shopper Imobiliário da Godoy Prime Realty."
      : "O cliente deseja vender um imóvel. Oportunidade para oferecer os serviços de Captação de Imóveis da Godoy Prime Realty.";

    const propertyDetails = `
      <ul style="margin: 0; padding-left: 20px;">
        ${data.bairro ? `<li><strong>Bairro:</strong> ${data.bairro}</li>` : ""}
        ${data.tipologia ? `<li><strong>Tipologia:</strong> ${data.tipologia}</li>` : ""}
        ${data.area ? `<li><strong>Área:</strong> ${data.area} m²</li>` : ""}
        ${data.quartos ? `<li><strong>Quartos:</strong> ${data.quartos}</li>` : ""}
        ${data.suites ? `<li><strong>Suítes:</strong> ${data.suites}</li>` : ""}
        ${data.banheiros ? `<li><strong>Banheiros:</strong> ${data.banheiros}</li>` : ""}
        ${data.vagas ? `<li><strong>Vagas:</strong> ${data.vagas}</li>` : ""}
        ${data.diferenciais ? `<li><strong>Diferenciais:</strong> ${data.diferenciais}</li>` : ""}
        ${data.enderecoImovelAnalise ? `<li><strong>Endereço Analisado:</strong> ${data.enderecoImovelAnalise}</li>` : ""}
        ${data.valorPedidoVendedor ? `<li><strong>Valor Pedido pelo Vendedor:</strong> ${formatCurrency(data.valorPedidoVendedor)}</li>` : ""}
      </ul>
    `;

    const estimativaDetails = data.estimativaMin && data.estimativaMed && data.estimativaMax ? `
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="margin: 0 0 10px 0; color: #0C2340;">Estimativa Preliminar:</h4>
        <p style="margin: 5px 0;"><strong>Mínimo:</strong> ${formatCurrency(data.estimativaMin)}</p>
        <p style="margin: 5px 0;"><strong>Médio:</strong> ${formatCurrency(data.estimativaMed)}</p>
        <p style="margin: 5px 0;"><strong>Máximo:</strong> ${formatCurrency(data.estimativaMax)}</p>
      </div>
    ` : "";

    const additionalInfo = data.objetivo || data.urgencia || data.preferencia_contato ? `
      <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h4 style="margin: 0 0 10px 0; color: #0C2340;">Informações Adicionais:</h4>
        ${data.objetivo ? `<p style="margin: 5px 0;"><strong>Objetivo:</strong> ${data.objetivo}</p>` : ""}
        ${data.urgencia ? `<p style="margin: 5px 0;"><strong>Urgência:</strong> ${data.urgencia}</p>` : ""}
        ${data.preferencia_contato ? `<p style="margin: 5px 0;"><strong>Preferência de Contato:</strong> ${data.preferencia_contato}</p>` : ""}
      </div>
    ` : "";

    // Different email content based on notification type
    const emailSubject = notificationType === "initial"
      ? `🆕 Novo Lead - ${serviceType} - ${data.leadName}`
      : `🏠 Solicitação Parecer Técnico - ${data.leadName}`;

    const ctaTitle = notificationType === "initial"
      ? `🆕 NOVO LEAD - ${serviceType.toUpperCase()}`
      : `⚡ SOLICITAÇÃO DE PARECER TÉCNICO GODOY PRIME`;

    const actionMessage = notificationType === "initial"
      ? serviceDescription
      : `O cliente realizou uma consulta preliminar e SOLICITOU o Parecer Técnico completo. PRIORIDADE ALTA - entrar em contato imediatamente.`;

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
          .cta { background: ${notificationType === 'complete' ? '#D4AF37' : '#0C2340'}; color: ${notificationType === 'complete' ? '#0C2340' : '#D4AF37'}; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px; font-weight: bold; }
          .contact-info { background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .service-box { background: ${isCompra ? '#e8f4e8' : '#fff3e8'}; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${isCompra ? '#22c55e' : '#f59e0b'}; }
          .priority { background: #fef2f2; border: 2px solid #ef4444; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏠 Godoy Prime Realty</h1>
            <p style="margin: 10px 0 0 0;">${notificationType === 'initial' ? 'Novo Lead Capturado' : 'Solicitação de Parecer Técnico'}</p>
          </div>
          
          <div class="content">
            <div class="cta">
              ${ctaTitle}
            </div>

            ${notificationType === 'complete' ? `
              <div class="priority">
                <h4 style="margin: 0 0 10px 0; color: #dc2626;">🚨 AÇÃO IMEDIATA NECESSÁRIA</h4>
                <p style="margin: 0; font-size: 14px;">Este lead solicitou ativamente o Parecer Técnico. Entre em contato nas próximas 2 horas para máxima conversão.</p>
              </div>
            ` : ''}

            <div class="service-box">
              <h4 style="margin: 0 0 10px 0; color: #0C2340;">💼 Serviço Recomendado: ${serviceType}</h4>
              <p style="margin: 0; font-size: 14px;">${actionMessage}</p>
            </div>
            
            <h3 style="color: #0C2340;">Dados do Cliente:</h3>
            <div class="contact-info">
              <p style="margin: 5px 0;"><strong>Nome:</strong> ${data.leadName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${data.leadEmail}</p>
              <p style="margin: 5px 0;"><strong>Telefone:</strong> ${data.leadPhone}</p>
              <p style="margin: 5px 0;"><strong>Interesse:</strong> ${isCompra ? '🏠 Comprar Imóvel' : '💰 Vender Imóvel'}</p>
            </div>

            ${additionalInfo}
            
            <h3 style="color: #0C2340;">Detalhes do Imóvel:</h3>
            ${propertyDetails}
            
            ${estimativaDetails}
            
            <div class="footer">
              <p>Este email foi enviado automaticamente pelo sistema Godoy Prime Analytics.</p>
              <p>© ${new Date().getFullYear()} Godoy Prime Realty - CRECI 11841</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log("Sending email to contato@godoyprime.com.br...");
    
    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "Godoy Prime <marcus@godoyprime.com.br>",
      to: ["contato@godoyprime.com.br"],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Resend API response:", JSON.stringify(emailResponse, null, 2));

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailResponse.error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully! ID:", emailResponse.data?.id);
    console.log("=== send-lead-notification END (SUCCESS) ===");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notificação enviada com sucesso",
        emailId: emailResponse.data?.id,
        serviceType,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("=== send-lead-notification ERROR ===");
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
