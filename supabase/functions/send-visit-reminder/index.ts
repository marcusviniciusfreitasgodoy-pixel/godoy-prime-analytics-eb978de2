import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting visit reminder check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate time window: visits in the next 24-25 hours
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    console.log(`Checking visits between ${in24Hours.toISOString()} and ${in25Hours.toISOString()}`);

    // Get scheduled visits in the next 24-25 hours that haven't been reminded yet
    const { data: agendamentos, error: fetchError } = await supabase
      .from("agendamentos_visita")
      .select("*")
      .in("status", ["agendada", "confirmada"])
      .gte("data_hora", in24Hours.toISOString())
      .lt("data_hora", in25Hours.toISOString());

    if (fetchError) {
      console.error("Error fetching agendamentos:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${agendamentos?.length || 0} visits to remind`);

    if (!agendamentos || agendamentos.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No visits to remind", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results = [];

    for (const agendamento of agendamentos) {
      if (!agendamento.email_visitante) {
        console.log(`Skipping visit ${agendamento.id} - no email`);
        continue;
      }

      const dataVisita = new Date(agendamento.data_hora);
      const dataFormatada = dataVisita.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const horaFormatada = dataVisita.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const tipoServicoMap: Record<string, string> = {
        visita: "Visita",
        avaliacao: "Avaliação",
        consultoria: "Consultoria",
        fotografia: "Fotografia",
      };
      const tipoServico = tipoServicoMap[agendamento.tipo_servico as string] || "Visita";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #d4af37 0%, #c5a028 100%); padding: 32px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0 0; }
            .content { padding: 32px; }
            .alert-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #d4af37; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
            .alert-box h2 { color: #92400e; margin: 0 0 8px 0; font-size: 18px; }
            .alert-box p { color: #78350f; margin: 0; }
            .info-card { background: #f8fafc; padding: 20px; border-radius: 12px; margin: 16px 0; }
            .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .info-row:last-child { border-bottom: none; }
            .info-label { color: #64748b; font-size: 14px; width: 120px; }
            .info-value { color: #1e293b; font-weight: 600; }
            .footer { background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
            .footer p { color: #64748b; margin: 4px 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Lembrete de Visita</h1>
              <p>Sua visita é amanhã!</p>
            </div>
            <div class="content">
              <div class="alert-box">
                <h2>Não esqueça!</h2>
                <p>Sua ${tipoServico.toLowerCase()} está agendada para amanhã. Confira os detalhes abaixo.</p>
              </div>
              
              <div class="info-card">
                <div class="info-row">
                  <span class="info-label">📅 Data</span>
                  <span class="info-value">${dataFormatada}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">🕐 Horário</span>
                  <span class="info-value">${horaFormatada}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">📍 Endereço</span>
                  <span class="info-value">${agendamento.endereco_imovel}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">🏷️ Tipo</span>
                  <span class="info-value">${tipoServico}</span>
                </div>
                ${agendamento.codigo_imovel ? `
                <div class="info-row">
                  <span class="info-label">🔑 Código</span>
                  <span class="info-value">${agendamento.codigo_imovel}</span>
                </div>
                ` : ""}
              </div>
              
              <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
                Em caso de imprevisto ou necessidade de reagendamento, entre em contato conosco o mais breve possível.
              </p>
            </div>
            <div class="footer">
              <p><strong>Godoy Prime Analytics</strong></p>
              <p>Inteligência Imobiliária na Barra da Tijuca</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: "Godoy Prime <onboarding@resend.dev>",
          to: [agendamento.email_visitante],
          subject: `⏰ Lembrete: Sua ${tipoServico} é amanhã - ${horaFormatada}`,
          html: htmlContent,
        });

        console.log(`Reminder sent to ${agendamento.email_visitante}:`, emailResponse);
        results.push({ id: agendamento.id, email: agendamento.email_visitante, success: true });
      } catch (emailError: any) {
        console.error(`Error sending reminder to ${agendamento.email_visitante}:`, emailError);
        results.push({ id: agendamento.id, email: agendamento.email_visitante, success: false, error: emailError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Reminder job completed: ${successCount}/${results.length} emails sent`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${successCount} reminders`, 
        count: successCount,
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-visit-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
