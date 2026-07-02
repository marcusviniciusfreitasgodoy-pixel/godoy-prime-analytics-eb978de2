import { supabase } from "@/integrations/supabase/client";
import { defaultParecer, ParecerTecnico, Comparativo } from "./types";

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export async function prefillFromAvaliacao(avaliacaoId: string): Promise<Partial<ParecerTecnico>> {
  const base = defaultParecer();
  const { data, error } = await supabase
    .from("valuations")
    .select("*")
    .eq("id", avaliacaoId)
    .maybeSingle();

  if (error || !data) return {};

  const v = data as any;
  const payload = v.calculation_payload || v.resultado_json || {};

  const comparativos: Comparativo[] = Array.isArray(payload?.comparativos)
    ? payload.comparativos.slice(0, 8).map((c: any) => ({
        endereco: toStr(c.endereco || c.logradouro || c.rua),
        area: toStr(c.area || c.area_privativa),
        valor: toStr(c.valor || c.preco || c.valor_total),
        valor_m2: toStr(c.valor_m2 || c.preco_m2),
        fonte: toStr(c.fonte || "Transacao real e oficial"),
        ajuste: toStr(c.ajuste || ""),
      }))
    : [];

  return {
    avaliacao_id: avaliacaoId,
    endereco_imovel: toStr(v.endereco),
    bairro: toStr(v.bairro),
    tipologia: toStr(v.tipologia),
    area_privativa: toStr(v.area_privativa || v.area_util),
    area_total: toStr(v.area_total || v.area_privativa),
    quartos: toStr(v.quartos),
    suites: toStr(v.suites),
    vagas: toStr(v.vagas),
    condominio: toStr(v.condominio),
    valor_mercado: toStr(v.valor_estimado || v.valor_mercado),
    valor_m2_apurado: toStr(v.valor_m2 || v.preco_m2),
    intervalo_valor:
      v.valor_min && v.valor_max
        ? `R$ ${Number(v.valor_min).toLocaleString("pt-BR")} a R$ ${Number(v.valor_max).toLocaleString("pt-BR")}`
        : "",
    comparativos,
    diagnostico_regiao: base.diagnostico_regiao || "",
  };
}
