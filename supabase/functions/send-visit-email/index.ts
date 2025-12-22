import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "agendamento_confirmado" | "visita_realizada" | "lembrete_visita";
  to: string;
  data: {
    nome_visitante: string;
    telefone_visitante?: string;
    email_visitante?: string;
    endereco_imovel: string;
    data_hora?: string;
    nome_corretor?: string;
    codigo_visita?: string;
    feedback_url?: string;
  };
  sendToAgency?: boolean;
}

const AGENCY_EMAIL = "contato@godoyprime.com.br";
const AGENCY_NAME = "Godoy Prime";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAgendamentoConfirmadoClienteHtml(data: EmailRequest["data"]): string {
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
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Sua visita foi confirmada!</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
            Olá <strong>${data.nome_visitante}</strong>,
          </p>
          
          <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
            Seu agendamento de visita foi confirmado com sucesso. Confira os detalhes:
          </p>
          
          <!-- Info Box -->
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">📍 Endereço:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${data.endereco_imovel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">📅 Data e Hora:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${data.data_hora ? formatDate(data.data_hora) : "A confirmar"}</td>
              </tr>
              ${data.nome_corretor ? `
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">👤 Corretor:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${data.nome_corretor}</td>
              </tr>
              ` : ""}
            </table>
          </div>
          
          <p style="color: #666; font-size: 14px; margin: 20px 0;">
            Em caso de dúvidas ou necessidade de reagendamento, entre em contato conosco.
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
            Este é um email automático, não responda.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getAgendamentoConfirmadoAgenciaHtml(data: EmailRequest["data"]): string {
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
          <h1 style="color: #d4af37; margin: 0; font-size: 24px;">Nova Visita Agendada</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
            Um novo agendamento de visita foi registrado:
          </p>
          
          <!-- Info Box -->
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1a1a2e; font-size: 16px;">Dados do Visitante</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Nome:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${data.nome_visitante}</td>
              </tr>
              ${data.telefone_visitante ? `
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Telefone:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${data.telefone_visitante}</td>
              </tr>
              ` : ""}
              ${data.email_visitante ? `
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Email:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${data.email_visitante}</td>
              </tr>
              ` : ""}
            </table>
          </div>
          
          <div style="background-color: #e8f4f8; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #1a1a2e; font-size: 16px;">Dados da Visita</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">📍 Imóvel:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${data.endereco_imovel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">📅 Data/Hora:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${data.data_hora ? formatDate(data.data_hora) : "A confirmar"}</td>
              </tr>
              ${data.nome_corretor ? `
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">👤 Corretor:</td>
                <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${data.nome_corretor}</td>
              </tr>
              ` : ""}
            </table>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            Godoy Prime Analytics - Notificação automática
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getVisitaRealizadaFeedbackHtml(data: EmailRequest["data"]): string {
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
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Como foi sua visita?</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
            Olá <strong>${data.nome_visitante}</strong>,
          </p>
          
          <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
            Obrigado por visitar o imóvel em <strong>${data.endereco_imovel}</strong>.
          </p>
          
          <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
            Sua opinião é muito importante para nós! Por favor, dedique alguns minutos para nos contar como foi sua experiência.
          </p>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.feedback_url}" style="background-color: #d4af37; color: #1a1a2e; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Enviar Meu Feedback
            </a>
          </div>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin: 20px 0;">
            Ou copie e cole este link no seu navegador:<br>
            <a href="${data.feedback_url}" style="color: #d4af37;">${data.feedback_url}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #333; font-size: 14px; margin: 0;">
            Atenciosamente,<br>
            <strong>Equipe Godoy Prime</strong>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            Godoy Prime - Inteligência Imobiliária<br>
            Este é um email automático, não responda.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, data, sendToAgency = true }: EmailRequest = await req.json();

    console.log(`Sending email type: ${type} to: ${to}`);

    const emailsToSend: Array<{
      to: string[];
      subject: string;
      html: string;
    }> = [];

    switch (type) {
      case "agendamento_confirmado":
        // Email para o cliente
        emailsToSend.push({
          to: [to],
          subject: `Visita Confirmada - ${data.endereco_imovel}`,
          html: getAgendamentoConfirmadoClienteHtml(data),
        });

        // Email para a imobiliária
        if (sendToAgency) {
          emailsToSend.push({
            to: [AGENCY_EMAIL],
            subject: `Nova Visita Agendada - ${data.nome_visitante}`,
            html: getAgendamentoConfirmadoAgenciaHtml(data),
          });
        }
        break;

      case "visita_realizada":
        // Email com link de feedback para o cliente
        emailsToSend.push({
          to: [to],
          subject: `Como foi sua visita? - ${data.endereco_imovel}`,
          html: getVisitaRealizadaFeedbackHtml(data),
        });
        break;

      case "lembrete_visita":
        // Email de lembrete (simplificado)
        emailsToSend.push({
          to: [to],
          subject: `Lembrete: Visita amanhã - ${data.endereco_imovel}`,
          html: getAgendamentoConfirmadoClienteHtml({
            ...data,
            nome_visitante: data.nome_visitante,
          }),
        });
        break;

      default:
        throw new Error(`Tipo de email não suportado: ${type}`);
    }

    const results = [];

    for (const email of emailsToSend) {
      console.log(`Sending to: ${email.to.join(", ")}`);
      
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${AGENCY_NAME} <onboarding@resend.dev>`,
          to: email.to,
          subject: email.subject,
          html: email.html,
        }),
      });

      const result = await response.json();
      console.log(`Email sent:`, result);
      results.push(result);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-visit-email function:", error);
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
