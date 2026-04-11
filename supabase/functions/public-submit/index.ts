import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Rate-limit config per action ──────────────────────────────────────
const LIMITS: Record<string, { window: number; max: number }> = {
  feedback: { window: 300, max: 2 },
  proposta: { window: 300, max: 3 },
  assinatura: { window: 300, max: 3 },
  "upload-cnh": { window: 300, max: 5 },
};

// ── Validation helpers (lightweight, no external deps) ────────────────
function requireString(obj: Record<string, unknown>, key: string, label: string): string {
  const v = obj[key];
  if (typeof v !== "string" || v.trim().length === 0) throw new Error(`${label} é obrigatório`);
  return v.trim();
}

function requireUUID(obj: Record<string, unknown>, key: string, label: string): string {
  const v = requireString(obj, key, label);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    throw new Error(`${label} inválido`);
  return v;
}

// ── Direct WhatsApp helper (bypasses auth-gated send-whatsapp) ────────
async function sendDirectWhatsApp(telefone: string, message: string) {
  const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
  const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN");
  const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) return;

  let numero = telefone.replace(/\D/g, "");
  if (numero.startsWith("0")) numero = numero.substring(1);
  if (!numero.startsWith("55")) numero = "55" + numero;

  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ZAPI_CLIENT_TOKEN ? { "Client-Token": ZAPI_CLIENT_TOKEN } : {}),
    },
    body: JSON.stringify({ phone: numero, message }),
  });
}

// ── Handlers ──────────────────────────────────────────────────────────
async function handleFeedback(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
) {
  const fichaVisitaId = requireUUID(payload, "ficha_visita_id", "ficha_visita_id");

  // Rate-limit by ficha_visita_id
  const { data: rl, error: rlErr } = await supabase.rpc("check_rate_limit", {
    p_identifier: fichaVisitaId,
    p_function_name: "public-submit-feedback",
    p_window_seconds: LIMITS.feedback.window,
    p_max_requests: LIMITS.feedback.max,
  });
  if (rlErr) throw rlErr;
  if (!rl?.[0]?.allowed) {
    return new Response(
      JSON.stringify({ error: "Limite de envios excedido. Tente novamente em alguns minutos." }),
      { status: 429, headers: { ...corsHeaders, "Retry-After": "300", "Content-Type": "application/json" } },
    );
  }

  // Check duplicate
  const { data: existing } = await supabase
    .from("feedbacks_visita")
    .select("id")
    .eq("ficha_visita_id", fichaVisitaId)
    .maybeSingle();
  if (existing) {
    return new Response(
      JSON.stringify({ error: "Feedback já enviado para esta visita." }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Build safe insert object — only allow known columns
  const allowed: Record<string, unknown> = { ficha_visita_id: fichaVisitaId };
  const optionalFields = [
    "avaliacao_geral", "nivel_interesse", "percepcao_valor",
    "pontos_positivos", "pontos_negativos", "o_que_mais_gostou",
    "o_que_menos_gostou", "o_que_alteraria", "sugestoes_melhoria",
    "compraria_imovel", "atende_necessidades", "gostaria_fazer_proposta",
    "valor_ofertaria", "forma_pagamento", "sinal_entrada", "valor_financiado",
    "conexao_imovel", "efeito_uau", "efeito_uau_detalhe",
    "ponto_resistencia", "campos_customizados",
  ];
  for (const f of optionalFields) {
    if (payload[f] !== undefined) allowed[f] = payload[f];
  }

  const { error } = await supabase.from("feedbacks_visita").insert(allowed);
  if (error) throw error;

  // Notify broker via WhatsApp
  try {
    const { data: fichaData } = await supabase
      .from("fichas_visita")
      .select("codigo, endereco_imovel, nome_visitante, corretor_id, nome_corretor")
      .eq("id", fichaVisitaId)
      .single();

    if (fichaData?.corretor_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, full_name")
        .eq("id", fichaData.corretor_id)
        .single();

      if (profile?.phone) {
        await sendDirectWhatsApp(profile.phone,
          `📩 *Novo Feedback Recebido!*\n\nOlá *${profile.full_name || fichaData.nome_corretor}*! 👋\n\nO visitante *${fichaData.nome_visitante}* enviou um feedback sobre o imóvel:\n\n📍 *Endereço:* ${fichaData.endereco_imovel}\n🔑 *Código:* ${fichaData.codigo}\n\nAcesse a plataforma para conferir os detalhes.\n\n_Godoy Prime Analytics_`
        );
      }
    }
  } catch (notifyErr) {
    console.error("Erro ao notificar corretor sobre feedback:", notifyErr);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleProposta(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
) {
  // Validate required fields
  const codigo = requireString(payload, "codigo", "codigo");
  requireString(payload, "cpf_cnpj", "cpf_cnpj");
  requireString(payload, "nome_completo", "nome_completo");
  requireString(payload, "telefone", "telefone");
  requireString(payload, "endereco_resumido", "endereco_resumido");
  requireString(payload, "modelo", "modelo");

  // Rate-limit — use ficha_visita_id if present, otherwise codigo
  const identifier = (typeof payload.ficha_visita_id === "string" && payload.ficha_visita_id) || codigo;
  const { data: rl, error: rlErr } = await supabase.rpc("check_rate_limit", {
    p_identifier: identifier,
    p_function_name: "public-submit-proposta",
    p_window_seconds: LIMITS.proposta.window,
    p_max_requests: LIMITS.proposta.max,
  });
  if (rlErr) throw rlErr;
  if (!rl?.[0]?.allowed) {
    return new Response(
      JSON.stringify({ error: "Limite de propostas excedido. Tente novamente em alguns minutos." }),
      { status: 429, headers: { ...corsHeaders, "Retry-After": "300", "Content-Type": "application/json" } },
    );
  }

  // Build safe insert object — exclude organization_id from client payload
  const allowedFields = [
    "codigo", "cpf_cnpj", "nome_completo", "telefone", "email",
    "endereco_resumido", "modelo", "ficha_visita_id", "valor_ofertado",
    "sinal_entrada", "parcelas", "financiamento", "outras_condicoes",
    "assinatura_proponente", "cnh_url", "unidade", "matricula",
    "cidade_uf", "data_hora", "validade_proposta", "moeda",
    "numero_proposta",
  ];
  const insert: Record<string, unknown> = {};
  for (const f of allowedFields) {
    if (payload[f] !== undefined) insert[f] = payload[f];
  }

  // Resolve organization_id server-side from ficha_visita
  if (insert.ficha_visita_id) {
    const { data: fichaOrg } = await supabase
      .from("fichas_visita")
      .select("organization_id")
      .eq("id", insert.ficha_visita_id)
      .single();
    if (fichaOrg?.organization_id) {
      insert.organization_id = fichaOrg.organization_id;
    }
  }

  const { data, error } = await supabase.from("propostas_compra").insert(insert).select().single();
  if (error) throw error;

  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleAssinatura(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
) {
  const codigo = requireString(payload, "codigo", "codigo");
  const tipo = requireString(payload, "tipo", "tipo");
  if (tipo !== "visitante" && tipo !== "corretor") throw new Error("tipo deve ser 'visitante' ou 'corretor'");
  const signatureData = requireString(payload, "signatureData", "signatureData");

  // Rate-limit
  const { data: rl, error: rlErr } = await supabase.rpc("check_rate_limit", {
    p_identifier: `${codigo}:${tipo}`,
    p_function_name: "public-submit-assinatura",
    p_window_seconds: LIMITS.assinatura.window,
    p_max_requests: LIMITS.assinatura.max,
  });
  if (rlErr) throw rlErr;
  if (!rl?.[0]?.allowed) {
    return new Response(
      JSON.stringify({ error: "Limite de tentativas excedido. Tente novamente em alguns minutos." }),
      { status: 429, headers: { ...corsHeaders, "Retry-After": "300", "Content-Type": "application/json" } },
    );
  }

  const field = tipo === "visitante" ? "assinatura_visitante" : "assinatura_corretor";

  // Fetch ficha by codigo (non-cancelled)
  const { data: ficha, error: fetchErr } = await supabase
    .from("fichas_visita")
    .select("id")
    .eq("codigo", codigo)
    .neq("status", "cancelada")
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!ficha) {
    return new Response(
      JSON.stringify({ error: "Ficha de visita não encontrada." }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { error } = await supabase
    .from("fichas_visita")
    .update({ [field]: signatureData })
    .eq("id", ficha.id);
  if (error) throw error;

  // Notify broker via WhatsApp about signature
  try {
    const { data: fichaCompleta } = await supabase
      .from("fichas_visita")
      .select("codigo, endereco_imovel, nome_visitante, corretor_id, nome_corretor")
      .eq("id", ficha.id)
      .single();

    if (fichaCompleta?.corretor_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, full_name")
        .eq("id", fichaCompleta.corretor_id)
        .single();

      const tipoLabel = tipo === "visitante" ? "do visitante" : "do corretor";
      if (profile?.phone) {
        await sendDirectWhatsApp(profile.phone,
          `✍️ *Assinatura Registrada!*\n\nOlá *${profile.full_name || fichaCompleta.nome_corretor}*! 👋\n\nA assinatura *${tipoLabel}* foi registrada na ficha de visita:\n\n📍 *Endereço:* ${fichaCompleta.endereco_imovel}\n👤 *Visitante:* ${fichaCompleta.nome_visitante}\n🔑 *Código:* ${fichaCompleta.codigo}\n\n_Godoy Prime Analytics_`
        );
      }
    }
  } catch (notifyErr) {
    console.error("Erro ao notificar corretor sobre assinatura:", notifyErr);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Upload CNH handler ────────────────────────────────────────────────
async function handleUploadCNH(
  supabase: ReturnType<typeof createClient>,
  codigo: string,
  fileData: string,
  fileName: string,
  contentType: string,
) {
  // Rate-limit
  const { data: rl, error: rlErr } = await supabase.rpc("check_rate_limit", {
    p_identifier: codigo,
    p_function_name: "public-submit-upload-cnh",
    p_window_seconds: LIMITS["upload-cnh"].window,
    p_max_requests: LIMITS["upload-cnh"].max,
  });
  if (rlErr) throw rlErr;
  if (!rl?.[0]?.allowed) {
    return new Response(
      JSON.stringify({ error: "Limite de uploads excedido. Tente novamente em alguns minutos." }),
      { status: 429, headers: { ...corsHeaders, "Retry-After": "300", "Content-Type": "application/json" } },
    );
  }

  // Validate content type
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  if (!allowedTypes.includes(contentType)) {
    return new Response(
      JSON.stringify({ error: "Formato inválido. Envie JPG, PNG ou PDF." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Decode base64 file
  const binaryString = atob(fileData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Max 5MB
  if (bytes.length > 5 * 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: "Arquivo muito grande. Máximo: 5MB." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const ext = fileName.split(".").pop() || "jpg";
  const path = `${codigo}/cnh-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("documentos-proposta")
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;

  return new Response(JSON.stringify({ success: true, path }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Main handler ──────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Service-role client for privileged operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, payload } = await req.json();

    if (!action || !payload || typeof payload !== "object") {
      return new Response(
        JSON.stringify({ error: "Campos 'action' e 'payload' são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!LIMITS[action]) {
      return new Response(
        JSON.stringify({ error: `Ação '${action}' não suportada.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    switch (action) {
      case "feedback":
        return await handleFeedback(supabase, payload as Record<string, unknown>);
      case "proposta":
        return await handleProposta(supabase, payload as Record<string, unknown>);
      case "assinatura":
        return await handleAssinatura(supabase, payload as Record<string, unknown>);
      case "upload-cnh":
        return await handleUploadCNH(
          supabase,
          requireString(payload as Record<string, unknown>, "codigo", "codigo"),
          requireString(payload as Record<string, unknown>, "fileData", "fileData"),
          requireString(payload as Record<string, unknown>, "fileName", "fileName"),
          requireString(payload as Record<string, unknown>, "contentType", "contentType"),
        );
      default:
        return new Response(
          JSON.stringify({ error: "Ação não suportada." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
  } catch (err) {
    console.error("public-submit error:", err);
    const message = err instanceof Error ? err.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
