import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://analytics.godoyprime.com.br";

function genToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fmtBRL(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function emailHtml(aut: any, link: string): string {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
      <div style="background:#0C2340;padding:30px;text-align:center;">
        <h1 style="color:#D4AF37;margin:0;font-size:24px;">Godoy Prime</h1>
        <p style="color:#fff;margin:10px 0 0;font-size:14px;">Autorização de Captação para Assinatura</p>
      </div>
      <div style="padding:30px;">
        <p style="color:#333;font-size:16px;">Olá <strong>${aut.proprietario_nome}</strong>,</p>
        <p style="color:#666;font-size:14px;">Você recebeu uma <strong>Autorização de Captação</strong> referente ao imóvel:</p>
        <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;">
          <p style="margin:0 0 8px;color:#333;"><strong>📍 ${aut.endereco}${aut.numero ? ", " + aut.numero : ""}</strong></p>
          <p style="margin:0 0 8px;color:#666;font-size:14px;">${aut.bairro} — ${aut.cidade}</p>
          <p style="margin:8px 0 0;color:#0C2340;font-size:16px;"><strong>Valor de Venda Autorizado:</strong> ${fmtBRL(Number(aut.valor_venda))}</p>
        </div>
        <p style="color:#666;font-size:14px;">Para revisar e assinar digitalmente o documento, clique no botão abaixo:</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${link}" style="background:#D4AF37;color:#0C2340;padding:15px 40px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Revisar e Assinar</a>
        </div>
        <p style="color:#999;font-size:12px;">Código: ${aut.codigo}</p>
      </div>
      <div style="background:#f8f9fa;padding:20px;text-align:center;border-top:1px solid #eee;">
        <p style="color:#999;font-size:12px;margin:0;">Godoy Prime — Inteligência Imobiliária</p>
      </div>
    </div></body></html>`;
}

function whatsAppMsg(aut: any, link: string): string {
  return `📋 *Autorização de Captação — Godoy Prime*

Olá *${aut.proprietario_nome}*! 👋

Você recebeu uma Autorização de Captação para assinatura digital.

📍 *Imóvel:* ${aut.endereco}${aut.numero ? ", " + aut.numero : ""}
🏘️ *Bairro:* ${aut.bairro}
💰 *Valor de Venda:* ${fmtBRL(Number(aut.valor_venda))}

📝 *Revisar e assinar:*
${link}

Código: ${aut.codigo}

_Godoy Prime Analytics_`;
}

function fmtPhone(t: string): string {
  let n = (t || "").replace(/\D/g, "");
  if (n.startsWith("0")) n = n.substring(1);
  if (!n.startsWith("55")) n = "55" + n;
  return n;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { autorizacao_id } = await req.json();
    if (!autorizacao_id) {
      return new Response(JSON.stringify({ error: "autorizacao_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: aut, error: autErr } = await admin
      .from("autorizacoes_captacao")
      .select("*")
      .eq("id", autorizacao_id)
      .maybeSingle();
    if (autErr || !aut) {
      return new Response(JSON.stringify({ error: "Autorização não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aut.status === "assinada" || aut.status === "recusada") {
      return new Response(JSON.stringify({ error: "Autorização já finalizada" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate limit: bloquear reenvio em menos de 60s
    if (aut.data_envio) {
      const last = new Date(aut.data_envio).getTime();
      const diff = Date.now() - last;
      if (diff < 60_000) {
        return new Response(
          JSON.stringify({ error: `Aguarde ${Math.ceil((60_000 - diff) / 1000)}s antes de reenviar` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const isResend = !!aut.token_acesso;
    const token = genToken();
    const link = `${APP_URL}/autorizacao/${token}`;

    const { error: updErr } = await admin
      .from("autorizacoes_captacao")
      .update({
        token_acesso: token,
        status: "enviada",
        data_envio: new Date().toISOString(),
      })
      .eq("id", autorizacao_id);
    if (updErr) throw updErr;

    await admin.from("autorizacoes_captacao_eventos").insert({
      autorizacao_id,
      tipo: isResend ? "reenviada" : "enviada",
      metadata: { link },
    });

    const results: Record<string, unknown> = { email: false, whatsapp: false };

    // EMAIL via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && aut.proprietario_email) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "Godoy Prime <noreply@godoyprime.com.br>",
            to: [aut.proprietario_email],
            subject: `Autorização de Captação — ${aut.codigo}`,
            html: emailHtml(aut, link),
          }),
        });
        results.email = r.ok;
        if (!r.ok) console.error("Resend error:", await r.text());
      } catch (e) {
        console.error("Email exception:", e);
      }
    }

    // WHATSAPP via Z-API
    const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
    const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN");
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    if (ZAPI_INSTANCE_ID && ZAPI_TOKEN && aut.proprietario_telefone) {
      try {
        const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
        const r = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(ZAPI_CLIENT_TOKEN ? { "Client-Token": ZAPI_CLIENT_TOKEN } : {}),
          },
          body: JSON.stringify({
            phone: fmtPhone(aut.proprietario_telefone),
            message: whatsAppMsg(aut, link),
          }),
        });
        results.whatsapp = r.ok;
        if (!r.ok) console.error("Z-API error:", await r.text());
      } catch (e) {
        console.error("WhatsApp exception:", e);
      }
    }

    return new Response(JSON.stringify({ success: true, link, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("enviar-autorizacao error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});