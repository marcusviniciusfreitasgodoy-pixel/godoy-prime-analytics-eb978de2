import { supabase } from "@/integrations/supabase/client";
import { ParecerTecnico, Comparativo, GrauNBR } from "./types";

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

  // Endereço completo (logradouro, número — complemento, CEP)
  const enderecoLinha1 = [v.logradouro, v.numero].filter(Boolean).join(", ");
  const enderecoLinha2 = [v.complemento, v.cep].filter(Boolean).join(" - ");
  const endereco = [enderecoLinha1, enderecoLinha2].filter(Boolean).join(" — ");

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

  // Observações do perito: condomínio / IPTU quando disponíveis
  const obsExtras: string[] = [];
  if (v.valor_condominio) obsExtras.push(`Condomínio mensal declarado: ${fmtBRL(v.valor_condominio)}.`);
  if (v.valor_iptu) obsExtras.push(`IPTU anual declarado: ${fmtBRL(v.valor_iptu)}.`);
  if (v.andar) obsExtras.push(`Andar: ${v.andar}.`);

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
  };

  if (obsExtras.length) {
    patch.observacoes_perito = obsExtras.join(" ");
  }

  return patch;
}
