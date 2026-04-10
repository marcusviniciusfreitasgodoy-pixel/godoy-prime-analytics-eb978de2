import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AGENCY_EMAIL = "contato@godoyprime.com.br";

interface NotifyPropostaRequest {
  ficha_visita_id: string;
  nome_proponente: string;
  telefone_proponente: string;
  email_proponente?: string;
  endereco_imovel: string;
  valor_ofertado: number | null;
  codigo_proposta: string;
  sinal_entrada?: string;
  parcelas?: string;
  financiamento?: string;
  outras_condicoes?: string;
}

function formatarTelefone(telefone: string): string {
  let numero = telefone.replace(/\D/g, '');
  if (numero.startsWith('0')) numero = numero.substring(1);
  if (!numero.startsWith('55')) numero = '55' + numero;
  return numero;
}

function formatarValor(valor: number | null): string {
  if (!valor) return "Não informado";
  return `R$ ${valor.toLocaleString("pt-BR")}`;
}

function gerarEmailHtml(data: NotifyPropostaRequest, nomeCorretor: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background-color: #1a1a2e; padding: 30px; text-align: center;">
      <h1 style="color: #d4af37; margin: 0; font-size: 24px;">📋 Nova Proposta de Compra!</h1>
      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Uma proposta foi registrada para um de seus imóveis</p>
    </div>
    <div style="padding: 30px;">
      <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
        Olá <strong>${nomeCorretor}</strong>,
      </p>
      <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
        Você recebeu uma nova proposta de compra. Confira os detalhes:
      </p>
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #1a1a2e; font-size: 16px;">Dados do Proponente</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">👤 Nome:</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${data.nome_proponente}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">📞 Telefone:</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${data.telefone_proponente}</td>
          </tr>
          ${data.email_proponente ? `<tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">✉️ Email:</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${data.email_proponente}</td>
          </tr>` : ""}
        </table>
      </div>
      <div style="background-color: #e8f4f8; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #1a1a2e; font-size: 16px;">Dados da Proposta</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">📍 Imóvel:</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${data.endereco_imovel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">💰 Valor Ofertado:</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${formatarValor(data.valor_ofertado)}</td>
          </tr>
          ${data.sinal_entrada ? `<tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">💵 Sinal/Entrada:</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.sinal_entrada}</td>
          </tr>` : ""}
          ${data.financiamento ? `<tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">🏦 Financiamento:</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.financiamento}</td>
          </tr>` : ""}
          ${data.parcelas ? `<tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">📊 Parcelas:</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.parcelas}</td>
          </tr>` : ""}
          ${data.outras_condicoes ? `<tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">📝 Outras condições:</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.outras_condicoes}</td>
          </tr>` : ""}
        </table>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://godoy-prime-analytics.lovable.app/visitas" style="background-color: #d4af37; color: #1a1a2e; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
          Ver no Painel
        </a>
      </div>
      <p style="color: #333; font-size: 14px; margin: 20px 0 0 0;">
        Atenciosamente,<br><strong>Equipe Godoy Prime</strong>
      </p>
    </div>
    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px; margin: 0;">
        Godoy Prime - Inteligência Imobiliária<br>Código da proposta: ${data.codigo_proposta}<br>Este é um email automático, não responda.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function gerarMensagemWhatsApp(data: NotifyPropostaRequest): string {
  return `📋 *Nova Proposta de Compra!*

Você recebeu uma proposta para o imóvel:

📍 *Imóvel:* ${data.endereco_imovel}
💰 *Valor Ofertado:* ${formatarValor(data.valor_ofertado)}
👤 *Proponente:* ${data.nome_proponente}
📞 *Telefone:* ${data.telefone_proponente}
${data.email_proponente ? `✉️ *Email:* ${data.email_proponente}` : ""}
${data.sinal_entrada ? `💵 *Sinal:* ${data.sinal_entrada}` : ""}

Acesse o painel para mais detalhes.

_Godoy Prime Analytics_`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotifyPropostaRequest = await req.json();

    if (!payload.ficha_visita_id || !payload.nome_proponente || !payload.codigo_proposta) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campos obrigatórios: ficha_visita_id, nome_proponente, codigo_proposta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting via DB function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: rateCheck } = await supabase.rpc('check_rate_limit', {
      p_identifier: payload.ficha_visita_id,
      p_function_name: 'notify-proposta',
      p_window_seconds: 300,
      p_max_requests: 3,
    });

    if (rateCheck && rateCheck.length > 0 && !rateCheck[0].allowed) {
      console.warn('Rate limit exceeded for ficha:', payload.ficha_visita_id);
      return new Response(
        JSON.stringify({ success: false, error: 'Muitas notificações enviadas. Tente novamente mais tarde.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch corretor data from ficha_visita -> profiles
    const { data: ficha, error: fichaError } = await supabase
      .from('fichas_visita')
      .select('corretor_id, nome_corretor')
      .eq('id', payload.ficha_visita_id)
      .single();

    if (fichaError || !ficha) {
      console.error('Ficha não encontrada:', fichaError);
      return new Response(
        JSON.stringify({ success: false, error: 'Ficha de visita não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let corretorEmail: string | null = null;
    let corretorPhone: string | null = null;
    const nomeCorretor = ficha.nome_corretor || 'Corretor';

    if (ficha.corretor_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, phone')
        .eq('id', ficha.corretor_id)
        .single();

      if (profile) {
        corretorEmail = profile.email;
        corretorPhone = profile.phone;
      }
    }

    console.log(`Notificando corretor: ${nomeCorretor} (email: ${corretorEmail}, phone: ${corretorPhone})`);

    const results = { email_corretor: false, email_agencia: false, whatsapp: false };

    // ========== SEND EMAILS VIA RESEND ==========
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY) {
      const emailHtml = gerarEmailHtml(payload, nomeCorretor);
      const emailRecipients: string[] = [];
      if (corretorEmail) emailRecipients.push(corretorEmail);

      // Send to corretor
      if (emailRecipients.length > 0) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: 'Godoy Prime <noreply@godoyprime.com.br>',
              to: emailRecipients,
              subject: `📋 Nova Proposta de Compra - ${payload.endereco_imovel}`,
              html: emailHtml,
            }),
          });
          const resData = await res.text();
          console.log('Email corretor:', res.status, resData);
          results.email_corretor = res.ok;
        } catch (e) {
          console.error('Erro email corretor:', e);
        }
      }

      // Send copy to agency
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Godoy Prime <noreply@godoyprime.com.br>',
            to: [AGENCY_EMAIL],
            subject: `📋 Nova Proposta de Compra - ${payload.endereco_imovel}`,
            html: emailHtml,
          }),
        });
        const resData = await res.text();
        console.log('Email agência:', res.status, resData);
        results.email_agencia = res.ok;
      } catch (e) {
        console.error('Erro email agência:', e);
      }
    }

    // ========== SEND WHATSAPP VIA Z-API ==========
    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');

    if (ZAPI_INSTANCE_ID && ZAPI_TOKEN && corretorPhone) {
      try {
        const numero = formatarTelefone(corretorPhone);
        const mensagem = gerarMensagemWhatsApp(payload);

        const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
        const res = await fetch(zapiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
          body: JSON.stringify({ phone: numero, message: mensagem }),
        });
        const resData = await res.text();
        console.log('WhatsApp corretor:', res.status, resData);
        results.whatsapp = res.ok;
      } catch (e) {
        console.error('Erro WhatsApp:', e);
      }
    } else {
      console.log('WhatsApp não enviado: Z-API não configurada ou telefone do corretor não disponível');
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro notify-proposta:', error);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
