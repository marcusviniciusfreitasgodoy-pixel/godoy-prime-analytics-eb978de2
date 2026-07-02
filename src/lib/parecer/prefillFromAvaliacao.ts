import { supabase } from "@/integrations/supabase/client";
import { ParecerTecnico, Comparativo, GrauNBR, AnuncioParecer } from "./types";

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function fmtBRL(n: unknown): string {
  const num = typeof n === "number" ? n : Number(n);
  if (!num || Number.isNaN(num)) return "";
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function grauFromConfidence(level: unknown): GrauNBR {
  const s = String(level || "").toLowerCase();
  if (s.includes("alt")) return "III";
  if (s.includes("baix")) return "I";
  if (s) return "II";
  return "";
}

function stripTravessoes(s: string): string {
  return String(s || "")
    .replace(/\s—\s/g, ", ")
    .replace(/—/g, ",")
    .replace(/\s–\s/g, ", ")
    .replace(/–/g, ",")
    .replace(/\s--\s/g, ", ");
}

function confLabel(level: unknown): string {
  const s = String(level || "").toLowerCase();
  if (s.includes("alt")) return "alta";
  if (s.includes("baix")) return "baixa";
  if (s) return "media";
  return "";
}

export async function prefillFromAvaliacao(avaliacaoId: string): Promise<Partial<ParecerTecnico>> {
  const { data, error } = await supabase
    .from("valuations")
    .select("*")
    .eq("id", avaliacaoId)
    .maybeSingle();

  if (error || !data) return {};

  const v = data as any;
  const recDetails = (v.recommendation_details as any) || {};
  const anuncioFontes = Array.isArray(v.anuncio_fontes) ? v.anuncio_fontes : [];

  // Endereço completo (sem travessão)
  const enderecoLinha1 = [v.logradouro, v.numero].filter(Boolean).join(", ");
  const enderecoLinha2 = [v.complemento, v.cep].filter(Boolean).join(" ");
  const endereco = [enderecoLinha1, enderecoLinha2].filter(Boolean).join(", ");

  // Áreas
  const areaPriv = v.property_area_m2 ? String(v.property_area_m2) : "";
  const areaTerr = Number(v.area_terreno_m2 || 0);
  const areaPrivNum = Number(v.property_area_m2 || 0);
  const areaTotal = areaTerr > 0 ? String(areaPrivNum + areaTerr) : areaPriv;

  // Valor por m² formatado
  const valorM2Num = Number(v.combined_med_m2 || v.itbi_med_m2 || 0);
  const valorM2 = valorM2Num
    ? `${valorM2Num.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}/m²`
    : "";

  // Intervalo de valor
  const intervalo =
    v.final_value_min && v.final_value_max
      ? `${fmtBRL(v.final_value_min)} a ${fmtBRL(v.final_value_max)}`
      : "";

  // Comparativos (opcional, se vierem no JSON)
  const compRaw: any[] = Array.isArray(recDetails?.comparativos)
    ? recDetails.comparativos
    : Array.isArray((recDetails as any)?.comparaveis)
      ? (recDetails as any).comparaveis
      : anuncioFontes;
  const comparativos: Comparativo[] = (compRaw || []).slice(0, 8).map((c: any) => ({
    endereco: toStr(c.endereco || c.logradouro || c.rua || c.titulo),
    area: toStr(c.area || c.area_privativa || c.area_util || c.m2),
    valor: toStr(c.valor || c.preco || c.valor_total || c.price),
    valor_m2: toStr(c.valor_m2 || c.preco_m2 || c.price_m2),
    fonte: toStr(c.fonte || c.source || "Transacao real e oficial"),
    ajuste: toStr(c.ajuste || ""),
  }));

  // Amostra de anúncios analisados (ofertas ativas) — vem de valuations.anuncio_fontes
  const anuncios: AnuncioParecer[] = (anuncioFontes || [])
    .map((a: any) => ({
      valor: Number(a?.valor ?? a?.preco ?? a?.valor_total ?? 0) || 0,
      area: Number(a?.area ?? a?.area_m2 ?? a?.area_privativa ?? 0) || 0,
      fonte: toStr(a?.fonte ?? a?.link ?? a?.url ?? ""),
    }))
    .filter((a: AnuncioParecer) => a.valor > 0 || a.area > 0 || !!a.fonte);

  // Observações do perito: condomínio / IPTU quando disponíveis
  const obsExtras: string[] = [];
  if (v.valor_condominio) obsExtras.push(`Condominio mensal declarado: ${fmtBRL(v.valor_condominio)}.`);
  if (v.valor_iptu) obsExtras.push(`IPTU anual declarado: ${fmtBRL(v.valor_iptu)}.`);
  if (v.andar) obsExtras.push(`Andar: ${v.andar}.`);

  // === Vistoria: buscar em recommendation_details / vistoria embutida ===
  const vist = (recDetails as any)?.vistoria || {};
  const estadoConservacao = toStr(
    (v as any).estado_conservacao || recDetails.estado_conservacao || vist.estado_conservacao,
  );
  const padraoAcabamento = toStr(
    (v as any).padrao_acabamento || recDetails.padrao_acabamento || vist.padrao_acabamento || (v as any).padrao_construtivo,
  );
  const vista = toStr((v as any).vista || recDetails.vista || vist.vista);
  const posicaoSolar = toStr((v as any).posicao_solar || recDetails.posicao_solar || vist.posicao_solar);

  const reformasRaw = (v as any).reformas || recDetails.reformas_benfeitorias || recDetails.reformas || vist.reformas;
  const reformas = Array.isArray(reformasRaw)
    ? reformasRaw.map((r) => toStr(r)).filter(Boolean).join("; ")
    : toStr(reformasRaw);

  // === Estratégia de negociação: pricing_strategies ===
  let faixaAbertura = "";
  let valorAlvo = "";
  let pisoNegociacao = "";
  let argumentos: string[] = [];
  let alavancagem = "";

  try {
    const { data: ps } = await supabase
      .from("pricing_strategies")
      .select(
        "estrategia_selecionada, preco_anuncio_premium, preco_anuncio_mercado, preco_anuncio_atracao, piso_planejado_premium, piso_planejado_mercado, piso_planejado_atracao",
      )
      .eq("valuation_id", avaliacaoId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ps) {
      const key = String(ps.estrategia_selecionada || "mercado").toLowerCase();
      const precoAlvo =
        key.includes("premium") ? ps.preco_anuncio_premium
        : key.includes("atrac") ? ps.preco_anuncio_atracao
        : ps.preco_anuncio_mercado;
      const piso =
        key.includes("premium") ? ps.piso_planejado_premium
        : key.includes("atrac") ? ps.piso_planejado_atracao
        : ps.piso_planejado_mercado;

      faixaAbertura = fmtBRL(ps.preco_anuncio_premium || ps.preco_anuncio_mercado);
      valorAlvo = fmtBRL(precoAlvo);
      pisoNegociacao = fmtBRL(piso || ps.piso_planejado_mercado);
    }
  } catch {
    // silencioso: pricing_strategies e opcional
  }

  if (!faixaAbertura) faixaAbertura = fmtBRL(v.final_value_max);
  if (!valorAlvo) valorAlvo = fmtBRL(v.final_value_med);
  if (!pisoNegociacao) pisoNegociacao = fmtBRL(v.final_value_min);

  // Argumentos derivados
  const args: string[] = [];
  if (valorM2)
    args.push(`Valor por metro quadrado apurado em ${valorM2}, com base em transacoes reais e ofertas ativas saneadas.`);
  if (Number(v.suites || 0) > 0) args.push(`Presenca de ${v.suites} suite(s), item valorizado no segmento.`);
  if (Number(v.vagas || 0) > 0) args.push(`Inclui ${v.vagas} vaga(s) de garagem.`);
  if (vista) args.push(`Vista: ${vista}.`);
  if (estadoConservacao) args.push(`Estado de conservacao: ${estadoConservacao}.`);
  argumentos = args;

  alavancagem = "";

  // === Conclusão modelo ===
  const conf = confLabel(v.confidence_level);
  const partes: string[] = [];
  partes.push(
    "Com base na metodologia comparativa aplicada e na amostra de transacoes reais e ofertas ativas saneadas,",
  );
  if (fmtBRL(v.final_value_med)) {
    partes.push(
      `estima-se o valor de mercado do imovel em ${fmtBRL(v.final_value_med)}${valorM2 ? `, correspondente a ${valorM2}` : ""}.`,
    );
  }
  if (intervalo) partes.push(`O intervalo de referencia situa-se entre ${intervalo}.`);
  if (conf) partes.push(`O grau de confianca da estimativa e ${conf}.`);
  partes.push(
    "As conclusoes apresentadas refletem as condicoes de mercado vigentes na data de referencia e podem ser revisadas mediante novos elementos ou vistoria complementar.",
  );
  const conclusao = stripTravessoes(partes.join(" "));

  const patch: Partial<ParecerTecnico> = {
    avaliacao_id: avaliacaoId,
    endereco_imovel: endereco,
    bairro: toStr(v.bairro),
    tipologia: toStr(v.property_type || v.tipo_avaliacao),
    area_privativa: areaPriv,
    area_total: areaTotal,
    quartos: toStr(v.quartos),
    suites: toStr(v.suites),
    vagas: toStr(v.vagas),
    condominio: toStr(v.nome_condominio),
    valor_mercado: fmtBRL(v.final_value_med),
    valor_m2_apurado: valorM2,
    intervalo_valor: intervalo,
    grau_fundamentacao: grauFromConfidence(v.confidence_level),
    grau_precisao: grauFromConfidence(v.confidence_level),
    comparativos,
    anuncios,
    estado_conservacao: estadoConservacao,
    padrao_acabamento: padraoAcabamento,
    vista,
    posicao_solar: posicaoSolar,
    reformas,
    faixa_abertura: faixaAbertura,
    valor_alvo: valorAlvo,
    piso_negociacao: pisoNegociacao,
    argumentos,
    alavancagem,
    conclusao,
  };

  if (obsExtras.length) {
    patch.observacoes_perito = obsExtras.join(" ");
  }

  return patch;
}
