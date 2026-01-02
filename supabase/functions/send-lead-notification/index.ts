import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const LeadNotificationSchema = z.object({
  type: z.enum(["initial", "returning", "complete"]).default("initial"),
  leadId: z.string().uuid().optional(),
  leadName: z.string().min(2).max(100).transform(s => s.trim()),
  leadEmail: z.string().email().max(255).transform(s => s.trim().toLowerCase()),
  leadPhone: z.string().min(10).max(20).transform(s => s.replace(/\D/g, '')),
  interesse: z.string().max(50).optional(),
  objetivo: z.string().max(100).optional(),
  urgencia: z.string().max(50).optional(),
  preferencia_contato: z.string().max(50).optional(),
  bairro: z.string().max(100).optional(),
  area: z.number().positive().max(50000).optional(),
  tipologia: z.string().max(50).optional(),
  quartos: z.number().int().min(0).max(20).optional(),
  banheiros: z.number().int().min(0).max(20).optional(),
  suites: z.number().int().min(0).max(20).optional(),
  vagas: z.number().int().min(0).max(50).optional(),
  diferenciais: z.string().max(500).optional(),
  estimativaMin: z.number().positive().max(1000000000).optional(),
  estimativaMed: z.number().positive().max(1000000000).optional(),
  estimativaMax: z.number().positive().max(1000000000).optional(),
  enderecoImovelAnalise: z.string().max(300).optional(),
  valorPedidoVendedor: z.number().positive().max(1000000000).optional(),
  evaluationNumber: z.number().int().positive().max(1000).optional(),
});

// Sanitize HTML to prevent injection
function sanitizeHtml(input: string | undefined): string {
  if (!input) return "";
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== send-lead-notification START ===");
  console.log("Method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  // Request size limit (100KB)
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 100 * 1024) {
    return new Response(
      JSON.stringify({ error: "Request too large" }),
      { status: 413, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const rawData = await req.json();
    
    // Validate input with Zod
    const parseResult = LeadNotificationSchema.safeParse(rawData);
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error.flatten());
      return new Response(
        JSON.stringify({ 
          error: "Invalid request data", 
          details: parseResult.error.flatten().fieldErrors 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const data = parseResult.data;
    console.log("Validated notification request for:", data.leadEmail);

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

    // Sanitize all user inputs before including in HTML
    const propertyDetails = `
      <ul style="margin: 0; padding-left: 20px;">
        ${data.bairro ? `<li><strong>Bairro:</strong> ${sanitizeHtml(data.bairro)}</li>` : ""}
        ${data.tipologia ? `<li><strong>Tipologia:</strong> ${sanitizeHtml(data.tipologia)}</li>` : ""}
        ${data.area ? `<li><strong>Área:</strong> ${data.area} m²</li>` : ""}
        ${data.quartos ? `<li><strong>Quartos:</strong> ${data.quartos}</li>` : ""}
        ${data.suites ? `<li><strong>Suítes:</strong> ${data.suites}</li>` : ""}
        ${data.banheiros ? `<li><strong>Banheiros:</strong> ${data.banheiros}</li>` : ""}
        ${data.vagas ? `<li><strong>Vagas:</strong> ${data.vagas}</li>` : ""}
        ${data.diferenciais ? `<li><strong>Diferenciais:</strong> ${sanitizeHtml(data.diferenciais)}</li>` : ""}
        ${data.enderecoImovelAnalise ? `<li><strong>Endereço Analisado:</strong> ${sanitizeHtml(data.enderecoImovelAnalise)}</li>` : ""}
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
        ${data.objetivo ? `<p style="margin: 5px 0;"><strong>Objetivo:</strong> ${sanitizeHtml(data.objetivo)}</p>` : ""}
        ${data.urgencia ? `<p style="margin: 5px 0;"><strong>Urgência:</strong> ${sanitizeHtml(data.urgencia)}</p>` : ""}
        ${data.preferencia_contato ? `<p style="margin: 5px 0;"><strong>Preferência de Contato:</strong> ${sanitizeHtml(data.preferencia_contato)}</p>` : ""}
      </div>
    ` : "";

    // Different email content based on notification type
    let emailSubject: string;
    let ctaTitle: string;
    let actionMessage: string;
    
    if (notificationType === "initial") {
      emailSubject = `🆕 Novo Lead - ${serviceType} - ${sanitizeHtml(data.leadName)}`;
      ctaTitle = `🆕 NOVO LEAD - ${serviceType.toUpperCase()}`;
      actionMessage = serviceDescription;
    } else if (notificationType === "returning") {
      const evalNum = data.evaluationNumber || 2;
      emailSubject = `🔄 Lead Retornou (${evalNum}ª consulta) - ${sanitizeHtml(data.leadName)}`;
      ctaTitle = `🔄 LEAD RETORNOU - ${evalNum}ª CONSULTA`;
      actionMessage = `O cliente já tinha feito consultas anteriores e VOLTOU para fazer nova análise. Isso demonstra alto interesse. ${serviceDescription}`;
    } else {
      emailSubject = `🏠 Solicitação Parecer Técnico - ${sanitizeHtml(data.leadName)}`;
      ctaTitle = `⚡ SOLICITAÇÃO DE PARECER TÉCNICO GODOY PRIME`;
      actionMessage = `O cliente realizou uma consulta preliminar e SOLICITOU o Parecer Técnico completo. PRIORIDADE ALTA - entrar em contato imediatamente.`;
    }

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
              <p style="margin: 5px 0;"><strong>Nome:</strong> ${sanitizeHtml(data.leadName)}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${sanitizeHtml(data.leadEmail)}</p>
              <p style="margin: 5px 0;"><strong>Telefone:</strong> ${sanitizeHtml(data.leadPhone)}</p>
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
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);