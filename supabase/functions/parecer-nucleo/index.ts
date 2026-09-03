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
import {
  calculateITBIData,
  toWeightedItems,
  weightedQuantile,
  type MarketRow,
} from "../_shared/itbiMarketStats.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VERSAO = "parecer-nucleo/1.1.0";
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

// Estatística ITBI: implementação compartilhada com o motor de avaliação e o site
// público (supabase/functions/_shared/itbiMarketStats.ts). Mantém o formato de
// saída que o prompt do parecer consome.
function weightedItbiStats(
  rows: Array<{ valor_m2: number; total_transacoes: number; data_transacao?: string }>,
) {
  const clean: MarketRow[] = rows
    .filter(
      (r) =>
        Number.isFinite(r.valor_m2) &&
        r.valor_m2 > 0 &&
        Number.isFinite(r.total_transacoes) &&
        r.total_transacoes > 0,
    )
    .map((r) => ({
      valor_m2: r.valor_m2,
      total_transacoes: r.total_transacoes,
      data_transacao: r.data_transacao ?? "",
    }));

  if (clean.length === 0) {
    return null;
  }

  const stats = calculateITBIData(clean, {
    method: "mad", // mesmo padrão do motor interno (calibrado em 2026-09-02)
    meta: {
      data_source: "logradouro",
      bairros_incluidos: [],
      janela_inicio: "",
      janela_fim: "",
      ano_corrente_incluido: false,
      tipologia_filtro: null,
      tipologia_fallback: false,
      piso_m2: 0,
      teto_m2: 0,
      truncado: false,
    },
  });
  if (!stats) return null;

  const items = toWeightedItems(clean);
  const q1 = weightedQuantile(items, 0.25);
  const q3 = weightedQuantile(items, 0.75);
  const iqr = q3 - q1;
  const spread_pct =
    stats.min_m2 && stats.max_m2 && stats.media_m2
      ? ((stats.max_m2 - stats.min_m2) / stats.media_m2) * 100
      : null;

  return {
    valor_m2_medio_ponderado: stats.media_m2,
    valor_m2_mediana_ponderada: stats.med_m2,
    valor_m2_min: stats.min_m2, // P10 ponderado dos sobreviventes
    valor_m2_max: stats.max_m2, // P95 ponderado dos sobreviventes
    q1,
    q3,
    iqr,
    spread_pct,
    n_transacoes: stats.meta.escrituras_validas,
    n_linhas_agregadas: stats.meta.linhas_agregadas - stats.meta.linhas_descartadas,
    linhas_descartadas_iqr: stats.meta.linhas_descartadas,
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
  // Guardado fora do try do ITBI para reaproveitar na inferência de microbairro.
  let itbiRowsCache: Array<Record<string, any>> = [];

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
    itbiRowsCache = itbiRows ?? [];

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
          "Mediana/média ponderadas por total_transacoes com corte MAD em log (2,5×/3×, implementação compartilhada com o motor); mín/máx = P10/P95; q1/q3/iqr informativos",
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
    const iptuSelect =
      "logradouro, logradouro_norm, bairro, tipologia, total_imoveis, total_area_construida, valor_venal_medio, preco_real_medio_itbi, total_transacoes_itbi, desconto_venal_percentual, area_media_unidade, tot_imoveis_oficial, nome_completo_oficial, cod_logradouro";

    // Fallback em cascata: (norm + tipologia) → (norm) → (ilike logradouro)
    async function runIptu(mode: "norm+tip" | "norm" | "ilike") {
      let q = supaAsParecer.from("iptu_logradouro_resumo").select(iptuSelect).limit(50);
      if (mode === "ilike" || !logradouroNorm) {
        q = q.ilike("logradouro", `%${input.logradouro}%`);
      } else {
        q = q.eq("logradouro_norm", logradouroNorm);
      }
      if (mode === "norm+tip" && input.tipologia) q = q.eq("tipologia", input.tipologia);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    }

    let iptuRows = await runIptu("norm+tip");
    let iptuEstrategia = "logradouro_norm + tipologia";
    if (iptuRows.length === 0 && input.tipologia) {
      iptuRows = await runIptu("norm");
      iptuEstrategia = "logradouro_norm (sem filtro de tipologia)";
    }
    if (iptuRows.length === 0) {
      iptuRows = await runIptu("ilike");
      iptuEstrategia = "ilike logradouro";
    }

    if (!iptuRows || iptuRows.length === 0) {
      lacunas.push("IPTU: sem resumo por logradouro para os filtros informados.");
      nucleo.iptu = {
        disponivel: false,
        fonte:
          "Prefeitura RJ — IPTU (agregado por logradouro; imóvel-a-imóvel indisponível)",
      };
    } else {
      // Média ponderada de valor_venal_medio pelo total_imoveis.
      let somaPeso = 0;
      let somaProd = 0;
      const tipCount = new Map<string, number>();
      for (const r of iptuRows as Array<Record<string, any>>) {
        const peso = Number(r.total_imoveis) || 0;
        const vv = Number(r.valor_venal_medio) || 0;
        if (peso > 0 && vv > 0) {
          somaPeso += peso;
          somaProd += peso * vv;
        }
        const tip = (r.tipologia ?? "").toString().trim();
        if (tip) tipCount.set(tip, (tipCount.get(tip) ?? 0) + peso);
      }
      const valorVenalAgregado = somaPeso > 0 ? somaProd / somaPeso : null;
      let tipologiaPredominante: string | null = null;
      let maxTip = 0;
      for (const [t, w] of tipCount) {
        if (w > maxTip) {
          maxTip = w;
          tipologiaPredominante = t;
        }
      }

      nucleo.iptu = {
        disponivel: true,
        agregacao: "logradouro",
        estrategia_busca: iptuEstrategia,
        valor_venal_agregado: valorVenalAgregado,
        tipologia_predominante: tipologiaPredominante,
        total_imoveis_considerados: somaPeso,
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

    const condoSelect =
      "nome_condominio, logradouro_padrao, logradouro_itbi_normalizado, ruas_internas, microbairro, numero_torres, unidades_estimadas, area_media_unidade_logradouro, preco_medio_m2, total_transacoes_itbi, padrao_construtivo, tipologia_predominante, ativo";

    let condoHit: Record<string, any> | null = null;
    let condoCandidatos: Array<Record<string, any>> | null = null;
    let condoEstrategia: string | null = null;

    if (input.nome_condominio) {
      const { data: condoRows } = await supaAsParecer
        .from("condominios_mapeamento")
        .select(condoSelect)
        .ilike("nome_condominio", `%${input.nome_condominio}%`)
        .eq("ativo", true)
        .limit(10);
      if (condoRows && condoRows.length > 0) {
        condoHit = condoRows[0];
        if (condoRows.length > 1) condoCandidatos = condoRows;
        condoEstrategia = "nome_condominio (input)";
      } else {
        lacunas.push(
          `Condomínio "${input.nome_condominio}" não encontrado no mapeamento oficial.`,
        );
      }
    }

    // Fallback: inferir condomínio pelo logradouro_norm (logradouro_itbi_normalizado ou ruas_internas)
    if (!condoHit && logradouroNorm) {
      const { data: byLog } = await supaAsParecer
        .from("condominios_mapeamento")
        .select(condoSelect)
        .eq("ativo", true)
        .or(
          `logradouro_itbi_normalizado.eq.${logradouroNorm},ruas_internas.cs.{${logradouroNorm}}`,
        )
        .limit(10);
      if (byLog && byLog.length > 0) {
        condoHit = byLog[0];
        if (byLog.length > 1) condoCandidatos = byLog;
        condoEstrategia = "logradouro_norm (logradouro_itbi_normalizado / ruas_internas)";
      }
    }

    if (condoHit) {
      territorial.condominio = {
        nome_condominio: condoHit.nome_condominio ?? null,
        microbairro: condoHit.microbairro ?? null,
        tipologia_predominante: condoHit.tipologia_predominante ?? null,
        padrao_construtivo: condoHit.padrao_construtivo ?? null,
        unidades_estimadas: condoHit.unidades_estimadas ?? null,
        estrategia_busca: condoEstrategia,
        detalhes: condoHit,
      };
      if (condoCandidatos) territorial.condominio_candidatos = condoCandidatos;
    } else if (!input.nome_condominio) {
      lacunas.push(
        "Condomínio: nenhum registro em condominios_mapeamento casou com o logradouro informado.",
      );
    }

    // Microbairro: prioriza (1) microbairro do condomínio; (2) mais frequente no ITBI já lido;
    // (3) match por keywords em microbairros_geo (best-effort).
    let microbairroNome: string | null = condoHit?.microbairro ?? null;
    let microbairroFonte: string | null = microbairroNome ? "condominios_mapeamento" : null;

    if (!microbairroNome && itbiRowsCache.length > 0) {
      const mbCount = new Map<string, number>();
      for (const r of itbiRowsCache) {
        const mb = (r as any).microbairro;
        const w = Number((r as any).total_transacoes) || 1;
        if (mb && typeof mb === "string") {
          mbCount.set(mb, (mbCount.get(mb) ?? 0) + w);
        }
      }
      let best = 0;
      for (const [mb, w] of mbCount) {
        if (w > best) {
          best = w;
          microbairroNome = mb;
        }
      }
      if (microbairroNome) microbairroFonte = "itbi_transactions (moda ponderada)";
    }

    let mbGeoHit: Record<string, any> | null = null;
    const { data: mbRows } = await supaAsParecer
      .from("microbairros_geo")
      .select("nome, bairro, keywords")
      .ilike("bairro", `%${input.bairro}%`)
      .limit(20);
    if (mbRows && mbRows.length > 0) {
      if (microbairroNome) {
        mbGeoHit =
          mbRows.find(
            (m: any) =>
              (m.nome ?? "").toLowerCase() === microbairroNome!.toLowerCase(),
          ) ?? null;
      }
      if (!microbairroNome) {
        const hit = mbRows.find((m: any) =>
          (m.keywords ?? []).some((k: string) =>
            input.logradouro.toLowerCase().includes(String(k).toLowerCase()),
          ),
        );
        if (hit) {
          microbairroNome = (hit as any).nome ?? null;
          microbairroFonte = "microbairros_geo (keywords)";
          mbGeoHit = hit as any;
        }
      }
    }

    if (microbairroNome) {
      territorial.microbairro = {
        nome: microbairroNome,
        fonte: microbairroFonte,
        geo: mbGeoHit,
      };
    } else {
      lacunas.push("Microbairro: não foi possível identificar com precisão.");
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
    role_execucao: "authenticated",
    politica:
      "Camada de QA — leitura restrita às tabelas oficiais (itbi_transactions, iptu_logradouro_resumo, condominios_mapeamento, microbairros_geo) via RLS do usuário autenticado. Não recalcula, não substitui o motor de avaliação. Dados ausentes são declarados como lacuna, nunca estimados.",
  };

  return jsonResp({ nucleo, lacunas, meta }, status);
});
