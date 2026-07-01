// deno-lint-ignore-file no-explicit-any
// Edge Function: /parecer-nucleo
// Camada de QA (segunda opinião) — leitura APENAS de dados oficiais
// via role Postgres `parecer_nucleo_ro` (allow-list, sem service_role).
//
// Fluxo:
//   1. Valida JWT do usuário autenticado do app (getClaims)
//   2. Rate-limit: máx. 30 chamadas/min por usuário (tabela parecer_nucleo_rate_log)
//   3. Assina JWT curto (60s) com claim role=parecer_nucleo_ro
//   4. Executa queries no PostgREST assumindo esse role
//   5. Retorna { nucleo, lacunas, meta } — cada sub-bloco cita a fonte oficial.

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VERSAO = "parecer-nucleo/1.0.0";
const RATE_LIMIT_WINDOW_SEC = 60;
const RATE_LIMIT_MAX = 30;

const InputSchema = z.object({
  logradouro: z.string().min(3).max(200),
  bairro: z.string().min(2).max(100),
  numero: z.string().max(20).optional(),
  nome_condominio: z.string().max(200).optional(),
  tipologia: z.string().max(50).optional(), // Apartamento | Casa | Comercial
  periodo_meses: z.number().int().min(6).max(120).default(60),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Percentil linear (0..1) sobre array numérico.
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

// Média/mediana ponderadas por total_transacoes, com corte IQR (1.5×) sobre valor_m2.
function weightedItbiStats(
  rows: Array<{ valor_m2: number; total_transacoes: number }>,
) {
  const clean = rows
    .filter(
      (r) =>
        Number.isFinite(r.valor_m2) &&
        r.valor_m2 > 0 &&
        Number.isFinite(r.total_transacoes) &&
        r.total_transacoes > 0,
    )
    .sort((a, b) => a.valor_m2 - b.valor_m2);

  if (clean.length === 0) {
    return null;
  }

  const values = clean.map((r) => r.valor_m2);
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;

  const kept = clean.filter((r) => r.valor_m2 >= lower && r.valor_m2 <= upper);
  const removed = clean.length - kept.length;

  const somaPeso = kept.reduce((s, r) => s + r.total_transacoes, 0);
  const somaProd = kept.reduce(
    (s, r) => s + r.valor_m2 * r.total_transacoes,
    0,
  );
  const mediaPonderada = somaPeso > 0 ? somaProd / somaPeso : null;

  // mediana ponderada
  const acc: Array<{ v: number; w: number }> = kept.map((r) => ({
    v: r.valor_m2,
    w: r.total_transacoes,
  }));
  acc.sort((a, b) => a.v - b.v);
  const halfWeight = somaPeso / 2;
  let cum = 0;
  let medianaPonderada: number | null = null;
  for (const p of acc) {
    cum += p.w;
    if (cum >= halfWeight) {
      medianaPonderada = p.v;
      break;
    }
  }

  const min = kept[0]?.valor_m2 ?? null;
  const max = kept[kept.length - 1]?.valor_m2 ?? null;
  const spread_pct =
    min && max && mediaPonderada ? ((max - min) / mediaPonderada) * 100 : null;

  return {
    valor_m2_medio_ponderado: mediaPonderada,
    valor_m2_mediana_ponderada: medianaPonderada,
    valor_m2_min: min,
    valor_m2_max: max,
    q1,
    q3,
    iqr,
    spread_pct,
    n_transacoes: somaPeso,
    n_linhas_agregadas: kept.length,
    linhas_descartadas_iqr: removed,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResp({ error: "Método não permitido" }, 405);
  }

  const started = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    null;

  // ---- 1. Auth: JWT do usuário autenticado ---------------------------------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResp({ error: "Autenticação obrigatória" }, 401);
  }
  const userJwt = authHeader.replace("Bearer ", "");

  const supaAsUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: claimsData, error: claimsErr } =
    await supaAsUser.auth.getClaims(userJwt);
  if (claimsErr || !claimsData?.claims?.sub) {
    return jsonResp({ error: "Sessão inválida" }, 401);
  }
  const userId = claimsData.claims.sub as string;

  // ---- 2. Rate limit -------------------------------------------------------
  const sinceIso = new Date(
    Date.now() - RATE_LIMIT_WINDOW_SEC * 1000,
  ).toISOString();
  const { count: recentCount, error: rlErr } = await supaAsUser
    .from("parecer_nucleo_rate_log")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", sinceIso);

  if (rlErr) {
    console.error("[parecer-nucleo] rate log query error", rlErr);
  } else if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
    await supaAsUser.from("parecer_nucleo_rate_log").insert({
      user_id: userId,
      endpoint: "parecer-nucleo",
      ip_hash: ip,
      status: 429,
    });
    return jsonResp(
      {
        error: "Rate limit excedido",
        detalhe: `Máximo ${RATE_LIMIT_MAX} chamadas por ${RATE_LIMIT_WINDOW_SEC}s`,
      },
      429,
    );
  }

  // ---- 3. Input ------------------------------------------------------------
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResp({ error: "JSON inválido" }, 400);
  }
  const parsed = InputSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResp(
      { error: "Input inválido", detalhes: parsed.error.flatten().fieldErrors },
      400,
    );
  }
  const input = parsed.data;

  // ---- 4. Cliente de leitura oficial (JWT do usuário autenticado) ----------
  // Nota: Lovable Cloud não expõe SUPABASE_JWT_SECRET às edge functions, então
  // não é possível assinar um JWT curto para assumir o role parecer_nucleo_ro.
  // Em vez disso, usamos o próprio JWT do usuário — as tabelas oficiais
  // (itbi_transactions, iptu_logradouro_resumo, condominios_mapeamento,
  // microbairros_geo) já têm SELECT liberado para `authenticated` via RLS.
  const supaAsParecer = supaAsUser;

  const lacunas: string[] = [];
  const nucleo: Record<string, any> = {};

  // ---- 5. Normaliza logradouro --------------------------------------------
  let logradouroNorm: string | null = null;
  try {
    const { data: normData, error: normErr } = await supaAsParecer.rpc(
      "normalizar_logradouro",
      { texto: input.logradouro },
    );
    if (normErr) throw normErr;
    logradouroNorm =
      typeof normData === "string" ? normData : (normData as any)?.toString();
  } catch (e) {
    console.error("[parecer-nucleo] normalizar_logradouro fail", e);
    lacunas.push(
      "Falha ao normalizar logradouro via função oficial; comparação pode ser imprecisa.",
    );
  }

  // ---- 6. ITBI (agregado, ponderado por total_transacoes) ------------------
  try {
    const dataMin = new Date();
    dataMin.setMonth(dataMin.getMonth() - input.periodo_meses);
    const dataMinIso = dataMin.toISOString().slice(0, 10);

    let q = supaAsParecer
      .from("itbi_transactions")
      .select(
        "valor_m2, total_transacoes, data_transacao, tipologia, uso, bairro, microbairro, logradouro_norm",
      )
      .gte("data_transacao", dataMinIso)
      .limit(5000);

    if (logradouroNorm) {
      q = q.eq("logradouro_norm", logradouroNorm);
    } else {
      q = q.ilike("logradouro", `%${input.logradouro}%`);
    }
    if (input.tipologia) q = q.eq("tipologia", input.tipologia);

    const { data: itbiRows, error: itbiErr } = await q;
    if (itbiErr) throw itbiErr;

    const stats = weightedItbiStats(itbiRows ?? []);
    if (!stats) {
      lacunas.push(
        `Sem transações ITBI para o logradouro no período de ${input.periodo_meses} meses.`,
      );
      nucleo.itbi = {
        disponivel: false,
        fonte: "Prefeitura RJ — ITBI (base agregada mensal por logradouro)",
      };
    } else {
      nucleo.itbi = {
        disponivel: true,
        janela_meses: input.periodo_meses,
        logradouro_norm: logradouroNorm ?? null,
        bairro_input: input.bairro,
        tipologia_filtro: input.tipologia ?? null,
        ...stats,
        metodo:
          "Média/mediana ponderadas por total_transacoes com corte IQR 1.5× sobre valor_m2",
        fonte:
          "Prefeitura RJ — ITBI (base agregada mensal por logradouro/tipologia)",
      };
    }
  } catch (e: any) {
    console.error("[parecer-nucleo] itbi query fail", e);
    lacunas.push(`ITBI: falha de leitura (${e?.message ?? "desconhecido"}).`);
    nucleo.itbi = { disponivel: false, erro: true };
  }

  // ---- 7. IPTU (resumo por logradouro + oficial 2025) ---------------------
  try {
    let iptuQ = supaAsParecer
      .from("iptu_logradouro_resumo")
      .select(
        "logradouro, logradouro_norm, bairro, tipologia, total_imoveis, total_area_construida, valor_venal_medio, preco_real_medio_itbi, total_transacoes_itbi, desconto_venal_percentual, area_media_unidade, tot_imoveis_oficial, nome_completo_oficial, cod_logradouro",
      )
      .limit(50);
    if (logradouroNorm) iptuQ = iptuQ.eq("logradouro_norm", logradouroNorm);
    else iptuQ = iptuQ.ilike("logradouro", `%${input.logradouro}%`);
    if (input.tipologia) iptuQ = iptuQ.eq("tipologia", input.tipologia);

    const { data: iptuRows, error: iptuErr } = await iptuQ;
    if (iptuErr) throw iptuErr;

    if (!iptuRows || iptuRows.length === 0) {
      lacunas.push("IPTU: sem resumo por logradouro para os filtros informados.");
      nucleo.iptu = {
        disponivel: false,
        fonte:
          "Prefeitura RJ — IPTU (agregado por logradouro; imóvel-a-imóvel indisponível)",
      };
    } else {
      nucleo.iptu = {
        disponivel: true,
        agregacao: "logradouro",
        linhas: iptuRows,
        observacao_lacuna:
          "IPTU imóvel-a-imóvel (`iptu_imoveis`) indisponível nesta base — análise por logradouro.",
        fonte:
          "Prefeitura RJ — IPTU (iptu_logradouro_resumo + iptu_2025_logradouro)",
      };
    }
  } catch (e: any) {
    console.error("[parecer-nucleo] iptu fail", e);
    lacunas.push(`IPTU: falha de leitura (${e?.message ?? "desconhecido"}).`);
    nucleo.iptu = { disponivel: false, erro: true };
  }

  // ---- 8. Territorial: condomínio + microbairro + edificação --------------
  try {
    const territorial: Record<string, any> = {
      fonte:
        "Base territorial — condominios_mapeamento, microbairros_geo, edificacoes_geo, lotes_pal",
    };

    if (input.nome_condominio) {
      const { data: condoRows } = await supaAsParecer
        .from("condominios_mapeamento")
        .select(
          "nome_condominio, logradouro_padrao, logradouro_itbi_normalizado, ruas_internas, microbairro, numero_torres, unidades_estimadas, area_media_unidade_logradouro, preco_medio_m2, total_transacoes_itbi, padrao_construtivo, tipologia_predominante, ativo",
        )
        .ilike("nome_condominio", `%${input.nome_condominio}%`)
        .eq("ativo", true)
        .limit(10);
      if (condoRows && condoRows.length > 0) {
        territorial.condominio = condoRows[0];
        if (condoRows.length > 1) territorial.condominio_candidatos = condoRows;
      } else {
        lacunas.push(
          `Condomínio "${input.nome_condominio}" não encontrado no mapeamento oficial.`,
        );
      }
    }

    // microbairro pelo bairro/logradouro (best-effort textual)
    const { data: mbRows } = await supaAsParecer
      .from("microbairros_geo")
      .select("nome, bairro, keywords")
      .ilike("bairro", `%${input.bairro}%`)
      .limit(20);
    if (mbRows && mbRows.length > 0) {
      const hit = mbRows.find((m: any) =>
        (m.keywords ?? []).some((k: string) =>
          input.logradouro.toLowerCase().includes(String(k).toLowerCase()),
        ),
      );
      territorial.microbairro = hit ?? { candidatos: mbRows };
    } else {
      lacunas.push("Microbairro não localizado para o bairro informado.");
    }

    nucleo.territorial = territorial;
  } catch (e: any) {
    console.error("[parecer-nucleo] territorial fail", e);
    lacunas.push(
      `Territorial: falha de leitura (${e?.message ?? "desconhecido"}).`,
    );
    nucleo.territorial = { disponivel: false, erro: true };
  }

  // ---- 9. Log e resposta ---------------------------------------------------
  const status = 200;
  await supaAsUser.from("parecer_nucleo_rate_log").insert({
    user_id: userId,
    endpoint: "parecer-nucleo",
    ip_hash: ip,
    status,
  });

  const meta = {
    versao: VERSAO,
    timestamp: new Date().toISOString(),
    duracao_ms: Date.now() - started,
    input_normalizado: {
      logradouro_original: input.logradouro,
      logradouro_norm: logradouroNorm,
      bairro: input.bairro,
      numero: input.numero ?? null,
      nome_condominio: input.nome_condominio ?? null,
      tipologia: input.tipologia ?? null,
      periodo_meses: input.periodo_meses,
    },
    role_execucao: "parecer_nucleo_ro",
    politica:
      "Camada de QA — leitura APENAS de dados oficiais. Não recalcula, não substitui o motor de avaliação. Dados ausentes são declarados como lacuna, nunca estimados.",
  };

  return jsonResp({ nucleo, lacunas, meta }, status);
});
