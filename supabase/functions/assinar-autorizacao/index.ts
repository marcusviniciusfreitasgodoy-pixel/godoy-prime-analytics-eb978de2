import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignBody {
  token: string;
  acao: "assinar" | "recusar";
  assinatura?: string; // base64 PNG
  motivo_recusa?: string;
  pdf_base64?: string; // optional signed PDF
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as SignBody;
    if (!body?.token || !body?.acao) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios ausentes" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: aut, error: findErr } = await admin
      .from("autorizacoes_captacao")
      .select("id, status, codigo, organization_id, prazo_dias")
      .eq("token_acesso", body.token)
      .maybeSingle();

    if (findErr || !aut) {
      return new Response(JSON.stringify({ error: "Autorização não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aut.status === "assinada" || aut.status === "recusada" || aut.status === "expirada") {
      return new Response(JSON.stringify({ error: `Autorização já finalizada (${aut.status})` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ipRaw = req.headers.get("x-forwarded-for") || "";
    const ip = ipRaw.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;

    if (body.acao === "recusar") {
      await admin
        .from("autorizacoes_captacao")
        .update({
          status: "recusada",
          motivo_recusa: body.motivo_recusa || null,
          data_recusa: new Date().toISOString(),
          token_acesso: null,
        })
        .eq("id", aut.id);
      await admin.from("autorizacoes_captacao_eventos").insert({
        autorizacao_id: aut.id,
        tipo: "recusada",
        ip,
        user_agent: ua,
        metadata: { motivo: body.motivo_recusa || null },
      });
      return new Response(JSON.stringify({ success: true, status: "recusada" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // assinar
    if (!body.assinatura) {
      return new Response(JSON.stringify({ error: "Assinatura obrigatória" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const venc = new Date(now.getTime() + (aut.prazo_dias || 90) * 86400000).toISOString();

    // Upload PDF (if provided) to private bucket
    let pdf_url: string | null = null;
    if (body.pdf_base64) {
      try {
        const cleaned = body.pdf_base64.replace(/^data:application\/pdf;base64,/, "");
        const bin = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
        const path = `${aut.organization_id}/${aut.id}.pdf`;
        const { error: upErr } = await admin.storage
          .from("autorizacoes-captacao")
          .upload(path, bin, { contentType: "application/pdf", upsert: true });
        if (!upErr) pdf_url = path;
        else console.error("Upload PDF error:", upErr);
      } catch (e) {
        console.error("PDF decode error:", e);
      }
    }

    await admin
      .from("autorizacoes_captacao")
      .update({
        status: "assinada",
        assinatura_proprietario: body.assinatura,
        ip_assinatura_proprietario: ip,
        data_assinatura_proprietario: now.toISOString(),
        data_vencimento: venc,
        pdf_url,
        token_acesso: null, // invalidate after sign
      })
      .eq("id", aut.id);

    await admin.from("autorizacoes_captacao_eventos").insert({
      autorizacao_id: aut.id,
      tipo: "assinada",
      ip,
      user_agent: ua,
    });

    return new Response(JSON.stringify({ success: true, status: "assinada", codigo: aut.codigo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("assinar-autorizacao error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});