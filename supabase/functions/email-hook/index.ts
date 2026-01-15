import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const AGENCY_NAME = "Godoy Prime";
const SITE_URL = "https://godoy-prime-analytics.lovable.app";

function getRecoveryEmailHtml(userName: string, resetLink: string): string {
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
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Recuperação de Senha</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
            Olá${userName ? ` <strong>${userName}</strong>` : ''},
          </p>
          
          <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
            Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #d4af37; color: #1a1a2e; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              Redefinir Senha
            </a>
          </div>
          
          <p style="color: #999; font-size: 12px; margin: 20px 0;">
            Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.
          </p>
          
          <p style="color: #999; font-size: 12px; margin: 20px 0;">
            Se o botão não funcionar, copie e cole este link no seu navegador:<br>
            <a href="${resetLink}" style="color: #d4af37; word-break: break-all;">${resetLink}</a>
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

function getConfirmationEmailHtml(userName: string, confirmLink: string): string {
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
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Confirme seu Email</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
            Olá${userName ? ` <strong>${userName}</strong>` : ''},
          </p>
          
          <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
            Obrigado por se cadastrar na Godoy Prime! Clique no botão abaixo para confirmar seu email:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmLink}" style="background-color: #d4af37; color: #1a1a2e; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              Confirmar Email
            </a>
          </div>
          
          <p style="color: #999; font-size: 12px; margin: 20px 0;">
            Se você não criou uma conta, ignore este email.
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
    const payload: AuthEmailPayload = await req.json();
    
    console.log("Email hook received:", {
      email: payload.user?.email,
      action: payload.email_data?.email_action_type,
    });

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("RESEND_API_KEY not configured");
    }

    const { user, email_data } = payload;
    const userName = user.user_metadata?.full_name || "";
    const userEmail = user.email;
    const { token_hash, email_action_type, redirect_to } = email_data;

    // Build the verification link
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    let actionLink = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}`;
    
    if (redirect_to) {
      actionLink += `&redirect_to=${encodeURIComponent(redirect_to)}`;
    } else {
      // Default redirect to reset password page
      actionLink += `&redirect_to=${encodeURIComponent(SITE_URL + "/reset-password")}`;
    }

    let subject: string;
    let html: string;

    switch (email_action_type) {
      case "recovery":
        subject = "Redefinição de Senha - Godoy Prime";
        html = getRecoveryEmailHtml(userName, actionLink);
        break;
      case "signup":
      case "email_change":
        subject = "Confirme seu Email - Godoy Prime";
        html = getConfirmationEmailHtml(userName, actionLink);
        break;
      case "magiclink":
        subject = "Seu Link de Acesso - Godoy Prime";
        html = getRecoveryEmailHtml(userName, actionLink);
        break;
      default:
        subject = "Godoy Prime - Ação Necessária";
        html = getRecoveryEmailHtml(userName, actionLink);
    }

    console.log("Sending email via Resend:", { to: userEmail, subject, actionType: email_action_type });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${AGENCY_NAME} <${RESEND_FROM_EMAIL}>`,
        to: [userEmail],
        subject: subject,
        html: html,
      }),
    });

    const result = await response.json();
    console.log("Resend response:", result);

    if (!response.ok) {
      console.error("Resend error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in email-hook function:", error);
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
