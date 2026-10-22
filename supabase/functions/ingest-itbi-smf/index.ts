// ingest-itbi-smf: carga do ITBI por escritura (planilhas da SMF) em
// public.itbi_escrituras e consolidação em itbi_transactions.
//
// Quem pode chamar: administrador logado (JWT + has_role admin), o agendador
// do banco (cabeçalho x-cron-secret = CRON_SECRET, o mesmo padrão de
// sync-itbi-daily) ou a carga agendada do GitHub (x-cron-secret =
// ITBI_CARGA_SECRET, scripts/itbi-smf/carga-mensal.ts). A escrita no banco é
// sempre feita aqui, com a chave de serviço; nada é aberto para a chave
// pública. verify_jwt = false em supabase/config.toml porque a carga agendada
// não tem JWT; a autorização acima vale para todas as ações.
//
// Ações (POST JSON { acao, ... }):
//   arquivos    lista os xlsx publicados na página da SMF, com tamanho.
//   faixa       { url, inicio, fim } devolve esses bytes do arquivo da SMF
//               (o site da SMF não libera CORS; o painel do admin lê por aqui).
//   gravar      { escrituras: EscrituraSmf[] } grava até 1.000 escrituras já
//               normalizadas pelo painel (upsert por id).
//   consolidar  { inicio, fim, bairro? } chama itbi_consolidar_smf.
//   processar   { bairros: string[], arquivo?: url, desde?: ano, consolidar?: bool }
//               faz tudo do lado do servidor: baixa por faixas, filtra os
//               bairros, normaliza, geocodifica, grava e consolida. Pensado
//               para o arquivo recente (2025 em diante) e poucos bairros por
//               chamada: edge functions têm ~2 s de CPU (ver _shared/itbiSmf.ts).
//   status      contagens de itbi_escrituras e de itbi_transactions por fonte,
//               data da última escritura e nome do último arquivo recente
//               carregado (a carga agendada compara com a página da SMF).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import {
  COLUNAS_ESCRITURA,
  conferirEscritura,
  ehArquivoRecente,
  type EscrituraSmf,
  geocodificarEscrituras,
  HOST_SMF,
  lerPlanilhaSmf,
  linksDaPagina,
  normalizarEscrituras,
  PAGINA_SMF,
} from "../_shared/itbiSmf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_FAIXA = 4 * 1024 * 1024;
const MAX_LOTE = 1000;

/** URL só pode ser um xlsx ITBI_TRANSACOES no site da SMF (evita virar proxy aberto). */
const urlPermitida = (u: string): URL | null => {
  try {
    const url = new URL(u);
    if (url.protocol !== "https:" || url.hostname !== HOST_SMF) return null;
    if (!/\/ITBI_TRANSACOES[^/]*\.xlsx$/i.test(url.pathname)) return null;
    return url;
  } catch {
    return null;
  }
};

const lerFaixaRemota = (url: string) => async (inicio: number, fim: number): Promise<Uint8Array> => {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const r = await fetch(url, { headers: { Range: `bytes=${inicio}-${fim}`, "User-Agent": "GodoyPrime/1.0" } });
    if (r.status === 206 || (r.status === 200 && inicio === 0)) {
      const b = new Uint8Array(await r.arrayBuffer());
      if (b.length === fim - inicio + 1 || r.status === 200) return r.status === 200 ? b.subarray(0, fim + 1) : b;
    }
    await new Promise((ok) => setTimeout(ok, 1000 * (tentativa + 1)));
  }
  throw new Error(`falha ao ler bytes ${inicio}-${fim} da SMF`);
};

const arquivosDaSmf = async () => {
  const r = await fetch(PAGINA_SMF, { headers: { "User-Agent": "Mozilla/5.0 GodoyPrime/1.0" } });
  if (!r.ok) throw new Error(`página da SMF respondeu ${r.status}`);
  const links = linksDaPagina(await r.text());
  if (!links.length) throw new Error("nenhum arquivo ITBI_TRANSACOES na página da SMF (a página mudou?)");
  return await Promise.all(
    links.map(async (url) => {
      const h = await fetch(url, { method: "HEAD", headers: { "User-Agent": "GodoyPrime/1.0" } });
      return {
        url,
        nome: decodeURIComponent(url.split("/").pop() ?? url),
        tamanho: Number(h.headers.get("content-length") ?? 0),
        recente: ehArquivoRecente(url),
      };
    }),
  );
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey);

  // ---------- autorização: cron com segredo ou admin logado ----------
  const segredos = [Deno.env.get("CRON_SECRET"), Deno.env.get("ITBI_CARGA_SECRET")].filter((s): s is string => !!s);
  const segredoRecebido = req.headers.get("x-cron-secret");
  let quem = "";
  if (segredoRecebido && segredos.includes(segredoRecebido)) {
    quem = "cron";
  } else {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Autenticação necessária" }, 401);
    const cliente = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user }, error } = await cliente.auth.getUser();
    if (error || !user) return json({ error: "Sessão inválida ou expirada" }, 401);
    const { data: admin, error: erroPapel } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (erroPapel || !admin) return json({ error: "Acesso restrito a administradores" }, 403);
    quem = user.email ?? user.id;
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return json({ error: "Corpo JSON inválido" }, 400);
  }
  const acao = String(corpo.acao ?? "");

  try {
    // ---------------------------------------------------------------- arquivos
    if (acao === "arquivos") {
      return json({ success: true, pagina: PAGINA_SMF, arquivos: await arquivosDaSmf() });
    }

    // ------------------------------------------------------------------- faixa
    if (acao === "faixa") {
      const url = urlPermitida(String(corpo.url ?? ""));
      const inicio = Number(corpo.inicio), fim = Number(corpo.fim);
      if (!url) return json({ error: "URL não permitida: só arquivos ITBI_TRANSACOES da SMF" }, 400);
      if (!Number.isInteger(inicio) || !Number.isInteger(fim) || inicio < 0 || fim < inicio || fim - inicio + 1 > MAX_FAIXA) {
        return json({ error: `faixa inválida (máximo ${MAX_FAIXA} bytes)` }, 400);
      }
      const bytes = await lerFaixaRemota(url.toString())(inicio, fim);
      return new Response(bytes as unknown as BodyInit, { headers: { ...corsHeaders, "Content-Type": "application/octet-stream" } });
    }

    // ------------------------------------------------------------------ gravar
    if (acao === "gravar") {
      const lista = corpo.escrituras;
      if (!Array.isArray(lista) || !lista.length) return json({ error: "escrituras vazias" }, 400);
      if (lista.length > MAX_LOTE) return json({ error: `máximo de ${MAX_LOTE} escrituras por chamada` }, 400);
      for (let i = 0; i < lista.length; i++) {
        const motivo = conferirEscritura(lista[i]);
        if (motivo) return json({ error: `escritura ${i}: ${motivo}` }, 400);
      }
      const linhas = lista.map((e) => Object.fromEntries(COLUNAS_ESCRITURA.map((c) => [c, (e as Record<string, unknown>)[c]])));
      const { error } = await supabase.from("itbi_escrituras").upsert(linhas, { onConflict: "id" });
      if (error) return json({ error: `gravação: ${error.message}` }, 500);
      return json({ success: true, gravadas: linhas.length });
    }

    // -------------------------------------------------------------- consolidar
    if (acao === "consolidar") {
      const inicio = String(corpo.inicio ?? ""), fim = String(corpo.fim ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) return json({ error: "datas inválidas" }, 400);
      const bairro = corpo.bairro ? String(corpo.bairro) : null;
      const { data, error } = await supabase.rpc("itbi_consolidar_smf", { p_inicio: inicio, p_fim: fim, p_bairro: bairro });
      if (error) return json({ error: `consolidação: ${error.message}` }, 500);
      return json({ success: true, resultado: data });
    }

    // --------------------------------------------------------------- processar
    if (acao === "processar") {
      const bairros = Array.isArray(corpo.bairros) ? corpo.bairros.map(String) : [];
      if (!bairros.length || bairros.length > 10) return json({ error: "informe de 1 a 10 códigos de bairro (CD_BAIRRO)" }, 400);
      const desde = Number(corpo.desde ?? 0) || undefined;
      let alvo = corpo.arquivo ? urlPermitida(String(corpo.arquivo))?.toString() : undefined;
      let tamanho = 0;
      if (!alvo) {
        const recente = (await arquivosDaSmf()).find((a) => a.recente);
        if (!recente) return json({ error: "arquivo recente não encontrado na página da SMF" }, 502);
        alvo = recente.url;
        tamanho = recente.tamanho;
      } else {
        const h = await fetch(alvo, { method: "HEAD" });
        tamanho = Number(h.headers.get("content-length") ?? 0);
      }
      if (!tamanho) return json({ error: "tamanho do arquivo desconhecido" }, 502);

      const nome = decodeURIComponent(alvo.split("/").pop() ?? alvo);
      const linhas = [];
      for await (const l of lerPlanilhaSmf(lerFaixaRemota(alvo), tamanho, { bairros: new Set(bairros), desde })) linhas.push(l);
      let escrituras: EscrituraSmf[] = await normalizarEscrituras(linhas, nome);
      escrituras = await geocodificarEscrituras(escrituras, async (u) => (await fetch(u)).json());
      for (let i = 0; i < escrituras.length; i += MAX_LOTE) {
        const { error } = await supabase.from("itbi_escrituras").upsert(escrituras.slice(i, i + MAX_LOTE), { onConflict: "id" });
        if (error) return json({ error: `gravação: ${error.message}` }, 500);
      }

      let consolidacao: unknown = null;
      if (corpo.consolidar && escrituras.length) {
        const datas = escrituras.map((e) => e.data_transacao).sort();
        const inicio = datas[0].slice(0, 8) + "01";
        const [a, m] = datas[datas.length - 1].split("-").map(Number);
        const fim = `${a}-${String(m).padStart(2, "0")}-${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2, "0")}`;
        const nomesBairro = [...new Set(escrituras.map((e) => e.bairro))];
        consolidacao = [];
        for (const b of nomesBairro) {
          const { data, error } = await supabase.rpc("itbi_consolidar_smf", { p_inicio: inicio, p_fim: fim, p_bairro: b });
          (consolidacao as unknown[]).push(error ? { bairro: b, erro: error.message } : data);
        }
      }
      await supabase.from("etl_log").insert({
        fonte: "smf", bairro: bairros.join(","), status: "concluido", registros_importados: escrituras.length,
        detalhes: { arquivo: nome, por: quem, consolidacao }, finalizado_em: new Date().toISOString(),
      });
      return json({ success: true, arquivo: nome, linhas: linhas.length, gravadas: escrituras.length, consolidacao });
    }

    // ------------------------------------------------------------------ status
    if (acao === "status") {
      const conta = async (tabela: string, filtro?: [string, string]) => {
        let q = supabase.from(tabela).select("id", { count: "exact", head: true });
        if (filtro) q = q.eq(filtro[0], filtro[1]);
        const { count } = await q;
        return count ?? 0;
      };
      const { data: ultima } = await supabase.from("itbi_escrituras").select("data_transacao")
        .order("data_transacao", { ascending: false }).limit(1).maybeSingle();
      // Cada carga regrava as escrituras do arquivo recente com o nome dele;
      // a SMF muda o nome a cada republicação (ex.: ..._2025_diante-7-1.xlsx).
      const { data: recente } = await supabase.from("itbi_escrituras").select("arquivo_fonte")
        .ilike("arquivo_fonte", "%diante%").order("data_transacao", { ascending: false }).limit(1).maybeSingle();
      return json({
        success: true,
        escrituras: await conta("itbi_escrituras"),
        ultima_escritura: ultima?.data_transacao ?? null,
        ultimo_arquivo_recente: recente?.arquivo_fonte ?? null,
        transacoes_smf: await conta("itbi_transactions", ["fonte", "smf"]),
        transacoes_arcgis: await conta("itbi_transactions", ["fonte", "arcgis"]),
      });
    }

    return json({ error: `ação desconhecida: ${acao}` }, 400);
  } catch (e) {
    console.error("[ingest-itbi-smf]", acao, e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
