// Carga mensal agendada do ITBI por escritura (planilhas da SMF).
//
// Roda no GitHub Actions (.github/workflows/itbi-smf-mensal.yml), toda semana:
//   1. lê a página da SMF e acha a planilha recente (..._2025_diante...xlsx);
//   2. pergunta à função ingest-itbi-smf qual foi o último arquivo recente
//      carregado; se o nome é o mesmo, a SMF não republicou e o script termina;
//   3. se é outro, lê as planilhas a partir do ano da última escritura da base,
//      com as MESMAS etapas do painel /admin (_shared/itbiSmfCarga.ts, que
//      define os ids), grava pela função e consolida um trimestre por chamada.
//
// A gravação e a consolidação passam sempre pela função, autenticada pelo
// cabeçalho x-cron-secret = ITBI_CARGA_SECRET (secret do GitHub com o mesmo
// valor do secret da Lovable Cloud). O script nunca usa a chave de serviço.
//
// Uso:
//   bun scripts/itbi-smf/carga-mensal.ts                verifica e carrega se houver planilha nova
//   bun scripts/itbi-smf/carga-mensal.ts --forcar       carrega mesmo sem planilha nova
//   bun scripts/itbi-smf/carga-mensal.ts --simular      lê, normaliza e geocodifica; não grava
//   opções: --desde=AAAA (ano inicial; padrão = ano da última escritura da base)
//           --bairro=COD (só com --simular; CD_BAIRRO sem zeros, ex.: 128)
//           --saida=arquivo.jsonl (só com --simular; grava as escrituras preparadas)

import { appendFileSync, writeFileSync } from "node:fs";
import { janelasTrimestrais } from "../../supabase/functions/_shared/itbiFonte.ts";
import { ehArquivoRecente, type EscrituraSmf, linksDaPagina, PAGINA_SMF } from "../../supabase/functions/_shared/itbiSmf.ts";
import {
  anosDoArquivo,
  gruposDeBairros,
  LOTE_GRAVACAO,
  lerPorBairro,
  prepararGrupo,
  ultimoMesDe,
} from "../../supabase/functions/_shared/itbiSmfCarga.ts";

const URL_FUNCAO = process.env.ITBI_FUNCAO_URL ?? "https://ldiadiezzooivgittjvj.supabase.co/functions/v1/ingest-itbi-smf";
const SEGREDO = process.env.ITBI_CARGA_SECRET ?? "";
const CHAVE_PUBLICA = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const AGENTE = "GodoyPrime/1.0 (carga agendada ITBI SMF)";

interface ArquivoSmf { url: string; nome: string; tamanho: number; recente: boolean }
interface Status { escrituras: number; ultima_escritura: string | null; ultimo_arquivo_recente?: string | null }

const args = process.argv.slice(2);
const opcao = (nome: string) => args.find((a) => a.startsWith(`--${nome}=`))?.split("=")[1];
const SIMULAR = args.includes("--simular");
const FORCAR = args.includes("--forcar");
const DESDE_ARG = opcao("desde");
const BAIRRO_ARG = opcao("bairro");
const SAIDA = opcao("saida");

const resumo: string[] = [];
const log = (linha: string) => {
  console.log(`${new Date().toISOString().slice(11, 19)}  ${linha}`);
  resumo.push(linha);
};
const fecharResumo = (titulo: string) => {
  const arquivo = process.env.GITHUB_STEP_SUMMARY;
  if (arquivo) appendFileSync(arquivo, `### ${titulo}\n\n${resumo.map((l) => `- ${l}`).join("\n")}\n`);
};

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/** Chama a função ingest-itbi-smf. Repete em erro de rede ou 5xx: gravar e consolidar são idempotentes. */
const chamar = async <T>(corpo: Record<string, unknown>): Promise<T> => {
  if (!SEGREDO) throw new Error("ITBI_CARGA_SECRET não definido");
  const cabecalhos: Record<string, string> = { "Content-Type": "application/json", "x-cron-secret": SEGREDO };
  if (CHAVE_PUBLICA) Object.assign(cabecalhos, { apikey: CHAVE_PUBLICA, Authorization: `Bearer ${CHAVE_PUBLICA}` });
  let ultimoErro = "";
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      const r = await fetch(URL_FUNCAO, {
        method: "POST",
        headers: cabecalhos,
        body: JSON.stringify(corpo),
        signal: AbortSignal.timeout(400_000),
      });
      const texto = await r.text();
      let dados: Record<string, unknown> = {};
      try { dados = JSON.parse(texto); } catch { /* resposta não JSON */ }
      if (r.ok && !("error" in dados)) return dados as T;
      ultimoErro = `${r.status} ${String(dados.error ?? dados.msg ?? texto).slice(0, 300)}`;
      if (r.status < 500) break; // erro de autorização ou de pedido: repetir não adianta
    } catch (e) {
      ultimoErro = e instanceof Error ? e.message : String(e);
    }
    await esperar(15_000 * tentativa);
  }
  throw new Error(`ingest-itbi-smf (${String(corpo.acao)}): ${ultimoErro}`);
};

/** Planilhas publicadas na página da SMF, com tamanho (mesma lógica da ação "arquivos"). */
const arquivosDaSmf = async (): Promise<ArquivoSmf[]> => {
  const r = await fetch(PAGINA_SMF, { headers: { "User-Agent": `Mozilla/5.0 ${AGENTE}` } });
  if (!r.ok) throw new Error(`página da SMF respondeu ${r.status}`);
  const links = linksDaPagina(await r.text());
  if (!links.length) throw new Error("nenhum arquivo ITBI_TRANSACOES na página da SMF (a página mudou?)");
  return Promise.all(links.map(async (url) => {
    const h = await fetch(url, { method: "HEAD", headers: { "User-Agent": AGENTE } });
    return { url, nome: decodeURIComponent(url.split("/").pop() ?? url), tamanho: Number(h.headers.get("content-length") ?? 0), recente: ehArquivoRecente(url) };
  }));
};

/** Lê bytes da planilha direto da SMF (aqui não há CORS; o painel usa a ação "faixa"). */
const lerDaSmf = (url: string) => async (inicio: number, fim: number): Promise<Uint8Array> => {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    try {
      const r = await fetch(url, { headers: { Range: `bytes=${inicio}-${fim}`, "User-Agent": AGENTE } });
      if (r.status === 206 || (r.status === 200 && inicio === 0)) {
        const b = new Uint8Array(await r.arrayBuffer());
        if (r.status === 200) return b.subarray(0, fim + 1);
        if (b.length === fim - inicio + 1) return b;
      }
    } catch { /* tenta de novo */ }
    await esperar(2000 * (tentativa + 1));
  }
  throw new Error(`falha ao ler bytes ${inicio}-${fim} de ${url}`);
};

const buscarJson = async (u: string) => {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": AGENTE } });
      if (r.ok) return r.json();
    } catch { /* tenta de novo */ }
    await esperar(2000 * (tentativa + 1));
  }
  throw new Error(`falha ao consultar ${u.slice(0, 120)}`);
};

const main = async () => {
  if (BAIRRO_ARG && !SIMULAR) throw new Error("--bairro só vale com --simular (a consolidação é da cidade inteira)");
  if (SAIDA && !SIMULAR) throw new Error("--saida só vale com --simular");

  const arquivos = await arquivosDaSmf();
  const recente = arquivos.find((a) => a.recente);
  log(`Planilhas na SMF: ${arquivos.map((a) => `${a.nome} (${(a.tamanho / 1e6).toFixed(1)} MB)`).join(", ")}`);

  const status = SEGREDO ? await chamar<Status>({ acao: "status" }) : null;
  if (status) log(`Base: ${status.escrituras.toLocaleString("pt-BR")} escrituras, última de ${status.ultima_escritura}, arquivo recente carregado: ${status.ultimo_arquivo_recente ?? "nenhum"}`);
  else if (!SIMULAR) throw new Error("ITBI_CARGA_SECRET não definido: sem ele não há como consultar nem gravar");

  if (!FORCAR && !SIMULAR && recente && status?.ultimo_arquivo_recente === recente.nome) {
    log(`Sem planilha nova: ${recente.nome} já está carregada. Nada a fazer.`);
    fecharResumo("ITBI SMF: sem novidade");
    return;
  }

  const desde = Number(DESDE_ARG) || (status?.ultima_escritura ? Number(status.ultima_escritura.slice(0, 4)) : new Date().getFullYear());
  const usar = arquivos.filter((a) => anosDoArquivo(a.nome)[1] >= desde);
  log(`${SIMULAR ? "Simulação" : "Carga"} a partir de ${desde}: ${usar.map((a) => a.nome).join(", ")}`);

  let ultimoMes = { ano: desde, mes: 1 };
  let preparadas = 0;
  let rejeitadas = 0;
  if (SAIDA) writeFileSync(SAIDA, "");

  for (const arq of usar) {
    const porBairro = await lerPorBairro(
      lerDaSmf(arq.url),
      arq.tamanho,
      { bairros: BAIRRO_ARG ? new Set([BAIRRO_ARG]) : undefined, desde },
      (lidas) => console.log(`  ${arq.nome}: ${lidas.toLocaleString("pt-BR")} linhas lidas`),
    );
    const lidas = [...porBairro.values()].reduce((s, v) => s + v.length, 0);
    log(`${arq.nome}: ${lidas.toLocaleString("pt-BR")} escrituras em ${porBairro.size} bairros`);

    for (const grupo of gruposDeBairros(porBairro.keys())) {
      const esc: EscrituraSmf[] = await prepararGrupo(porBairro, grupo, arq.nome, buscarJson);
      preparadas += esc.length;
      rejeitadas += esc.filter((e) => !e.aceita).length;
      ultimoMes = ultimoMesDe(esc, ultimoMes);
      if (SIMULAR) {
        if (SAIDA) appendFileSync(SAIDA, esc.map((e) => JSON.stringify(e)).join("\n") + (esc.length ? "\n" : ""));
      } else {
        for (let i = 0; i < esc.length; i += LOTE_GRAVACAO) {
          await chamar({ acao: "gravar", escrituras: esc.slice(i, i + LOTE_GRAVACAO) });
        }
      }
      grupo.forEach((cod) => porBairro.delete(cod));
      console.log(`  bairros ${grupo[0]} a ${grupo[grupo.length - 1]}: ${esc.length} escrituras ${SIMULAR ? "preparadas" : "gravadas"}`);
    }
  }
  log(`${SIMULAR ? "Seriam gravadas" : "Gravadas"} ${preparadas.toLocaleString("pt-BR")} escrituras (${rejeitadas.toLocaleString("pt-BR")} fora dos limites de ingestão), até ${ultimoMes.ano}-${String(ultimoMes.mes).padStart(2, "0")}`);

  if (SIMULAR) {
    fecharResumo("ITBI SMF: simulação (nada gravado)");
    return;
  }

  for (const j of janelasTrimestrais(desde, ultimoMes)) {
    const r = await chamar<{ resultado: Record<string, unknown> }>({ acao: "consolidar", inicio: j.inicio, fim: j.fim });
    const cinto = r.resultado?.cinto as { alteradas?: number } | undefined;
    log(`Consolidação ${j.rotulo}: ${r.resultado?.escrituras_consideradas} escrituras, ${r.resultado?.linhas_inseridas} linhas; ${cinto?.alteradas ?? 0} marcações do cinto alteradas`);
  }
  const depois = await chamar<Status>({ acao: "status" });
  log(`Fim: ${depois.escrituras.toLocaleString("pt-BR")} escrituras na base, última de ${depois.ultima_escritura}, arquivo recente ${depois.ultimo_arquivo_recente}`);
  fecharResumo("ITBI SMF: carga concluída");
};

main().catch((e) => {
  log(`ERRO: ${e instanceof Error ? e.message : String(e)}`);
  fecharResumo("ITBI SMF: carga interrompida");
  process.exit(1);
});
