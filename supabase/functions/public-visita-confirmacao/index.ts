import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    null
  );
}

function summarizeFirstName(full?: string | null): string {
  if (!full) return "";
  return full.trim().split(/\s+/)[0];
}

function publicAgendamentoView(a: any) {
  return {
    id: a.id,
    endereco_imovel: a.endereco_imovel,
    codigo_imovel: a.codigo_imovel,
    data_hora: a.data_hora,
    tipo_servico: a.tipo_servico,
    status: a.status,
    nome_visitante: summarizeFirstName(a.nome_visitante),
    corretor_id: a.corretor_id,
    organization_id: a.organization_id,
    acao_cliente: a.acao_cliente,
    reagendado_para_id: a.reagendado_para_id,
    token_expira_em: a.token_expira_em,
  };
}

async function loadAgendamentoByToken(supabase: any, token: string) {
  const { data, error } = await supabase
    .from("agendamentos_visita")
    .select("*")
    .eq("token_confirmacao", token)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadCorretorNome(supabase: any, corretorId: string | null) {
  if (!corretorId) return null;
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", corretorId)
    .maybeSingle();
  return data?.full_name ? summarizeFirstName(data.full_name) : null;
}

async function logEvento(
  supabase: any,
  agendamentoId: string,
  tipo: string,
  req: Request,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("visita_confirmacao_eventos").insert({
    agendamento_id: agendamentoId,
    tipo,
    ip: getIp(req),
    user_agent: req.headers.get("user-agent"),
    metadata,
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const action: string =
      body?.action || url.searchParams.get("action") || "info";
    const token: string | undefined =
      body?.token || url.searchParams.get("token") || undefined;

    if (action === "horarios") {
      const corretorId = body?.corretor_id || url.searchParams.get("corretor_id");
      const data = body?.data || url.searchParams.get("data");
      if (!corretorId || !data) {
        return jsonRes({ error: "corretor_id e data são obrigatórios" }, 400);
      }
      const { data: disp, error } = await supabase
        .from("disponibilidade_corretor")
        .select("horarios_disponiveis")
        .eq("corretor_id", corretorId)
        .eq("data", data)
        .eq("ativo", true);
      if (error) throw error;
      const horarios = [
        ...new Set(
          (disp || []).flatMap((d: any) => d.horarios_disponiveis || []),
        ),
      ].sort();

      // Exclude slots already taken by active appointments for this corretor on this date
      const start = `${data}T00:00:00.000Z`;
      const end = `${data}T23:59:59.999Z`;
      const { data: ocupados } = await supabase
        .from("agendamentos_visita")
        .select("data_hora,status")
        .eq("corretor_id", corretorId)
        .in("status", ["agendada", "confirmada"])
        .gte("data_hora", start)
        .lte("data_hora", end);
      const taken = new Set(
        (ocupados || []).map((o: any) => {
          const dt = new Date(o.data_hora);
          // Format as HH:mm in BRT
          const fmt = new Intl.DateTimeFormat("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo",
          }).format(dt);
          return fmt;
        }),
      );
      const livres = horarios.filter((h) => !taken.has(h));
      return jsonRes({ horarios: livres });
    }

    if (!token || typeof token !== "string" || token.length < 16) {
      return jsonRes({ error: "Token inválido" }, 400);
    }

    const ag = await loadAgendamentoByToken(supabase, token);
    if (!ag) {
      return jsonRes({ error: "Link não encontrado" }, 404);
    }

    const now = new Date();
    const expired =
      ag.token_expira_em && new Date(ag.token_expira_em).getTime() < now.getTime();

    if (action === "info") {
      await logEvento(supabase, ag.id, "visualizou", req).catch(() => {});
      const corretorNome = await loadCorretorNome(supabase, ag.corretor_id);
      return jsonRes({
        agendamento: publicAgendamentoView(ag),
        corretor_nome: corretorNome,
        expirado: !!expired,
      });
    }

    if (expired) {
      return jsonRes(
        { error: "Este link já não está mais ativo. Entre em contato com o corretor." },
        410,
      );
    }

    if (ag.status === "realizada") {
      return jsonRes({ error: "Esta visita já foi realizada." }, 409);
    }

    if (action === "confirmar") {
      if (ag.status === "cancelada") {
        return jsonRes({ error: "Esta visita está cancelada." }, 409);
      }
      const { error: upErr } = await supabase
        .from("agendamentos_visita")
        .update({
          status: "confirmada",
          acao_cliente: "confirmou",
          confirmada_pelo_cliente_at: new Date().toISOString(),
          confirmada_pelo_cliente_ip: getIp(req),
        })
        .eq("id", ag.id);
      if (upErr) throw upErr;
      await logEvento(supabase, ag.id, "confirmou", req);
      return jsonRes({ ok: true, status: "confirmada" });
    }

    if (action === "cancelar") {
      const motivo = (body?.motivo as string | undefined)?.slice(0, 500) || null;
      const { error: upErr } = await supabase
        .from("agendamentos_visita")
        .update({
          status: "cancelada",
          acao_cliente: "cancelou",
          motivo_cancelamento_cliente: motivo,
        })
        .eq("id", ag.id);
      if (upErr) throw upErr;
      await logEvento(supabase, ag.id, "cancelou", req, { motivo });
      return jsonRes({ ok: true, status: "cancelada" });
    }

    if (action === "reagendar") {
      const nova: string | undefined = body?.nova_data_hora;
      if (!nova || isNaN(Date.parse(nova))) {
        return jsonRes({ error: "Nova data/hora inválida" }, 400);
      }
      const novaDate = new Date(nova);
      if (novaDate.getTime() <= now.getTime()) {
        return jsonRes({ error: "Data deve ser futura" }, 400);
      }

      // Validate slot still in corretor availability
      const dataKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(novaDate);
      const horaKey = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      }).format(novaDate);

      if (ag.corretor_id) {
        const { data: disp } = await supabase
          .from("disponibilidade_corretor")
          .select("horarios_disponiveis")
          .eq("corretor_id", ag.corretor_id)
          .eq("data", dataKey)
          .eq("ativo", true);
        const horarios = new Set(
          (disp || []).flatMap((d: any) => d.horarios_disponiveis || []),
        );
        if (horarios.size > 0 && !horarios.has(horaKey)) {
          return jsonRes({ error: "Horário não está mais disponível" }, 409);
        }

        // Check slot is not double-booked
        const { data: conflict } = await supabase
          .from("agendamentos_visita")
          .select("id")
          .eq("corretor_id", ag.corretor_id)
          .in("status", ["agendada", "confirmada"])
          .eq("data_hora", novaDate.toISOString());
        if (conflict && conflict.length > 0) {
          return jsonRes({ error: "Horário acabou de ser ocupado" }, 409);
        }
      }

      // Create new appointment (token auto-generated by trigger)
      const { data: novoAg, error: insErr } = await supabase
        .from("agendamentos_visita")
        .insert({
          lead_id: ag.lead_id,
          nome_visitante: ag.nome_visitante,
          telefone_visitante: ag.telefone_visitante,
          email_visitante: ag.email_visitante,
          endereco_imovel: ag.endereco_imovel,
          codigo_imovel: ag.codigo_imovel,
          corretor_id: ag.corretor_id,
          tipo_servico: ag.tipo_servico,
          data_hora: novaDate.toISOString(),
          status: "agendada",
          origem: ag.origem,
          notas: ag.notas,
          organization_id: ag.organization_id,
        })
        .select("*")
        .single();
      if (insErr) throw insErr;

      // Update old one
      await supabase
        .from("agendamentos_visita")
        .update({
          status: "cancelada",
          acao_cliente: "reagendou",
          reagendado_para_id: novoAg.id,
        })
        .eq("id", ag.id);

      await logEvento(supabase, ag.id, "reagendou", req, {
        novo_agendamento_id: novoAg.id,
        nova_data_hora: novoAg.data_hora,
      });

      return jsonRes({
        ok: true,
        status: "reagendada",
        novo_agendamento: publicAgendamentoView(novoAg),
      });
    }

    return jsonRes({ error: "Ação não suportada" }, 400);
  } catch (e: any) {
    console.error("public-visita-confirmacao error:", e);
    return jsonRes({ error: e?.message || "Erro interno" }, 500);
  }
});
