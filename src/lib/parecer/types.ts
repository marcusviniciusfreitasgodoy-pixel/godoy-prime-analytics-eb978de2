export type NivelRisco = "baixo" | "medio" | "alto" | "";
export type GrauNBR = "I" | "II" | "III" | "";

export interface Comparativo {
  endereco: string;
  area: string;
  valor: string;
  valor_m2: string;
  fonte: string;
  ajuste: string;
}

export interface FotoParecer {
  url: string;
  legenda: string;
}

export interface AnuncioParecer {
  valor: number;
  area: number;
  fonte: string;
}

export interface ParecerTecnico {
  id?: string;
  organization_id?: string;
  avaliacao_id?: string | null;
  status?: string;

  referencia_documento: string;
  data_emissao: string;
  data_referencia: string;

  objetivo: string;
  finalidade: string;
  pressupostos: string;

  endereco_imovel: string;
  bairro: string;
  tipologia: string;
  area_privativa: string;
  area_total: string;
  quartos: string;
  suites: string;
  vagas: string;
  ano_construcao: string;
  condominio: string;
  matricula: string;

  diagnostico_regiao: string;

  tipo_tratamento: string;
  fundamentacao_metodologica: string;

  comparativos: Comparativo[];
  tratamento_amostra: string;

  anuncios: AnuncioParecer[];

  estado_conservacao: string;
  padrao_acabamento: string;
  vista: string;
  posicao_solar: string;
  reformas: string;
  observacoes_perito: string;
  fotos: FotoParecer[];

  riscos_estruturais: string;
  nivel_estrutural: NivelRisco;
  riscos_documentais: string;
  nivel_documental: NivelRisco;
  riscos_condominiais: string;
  nivel_condominial: NivelRisco;

  valor_mercado: string;
  valor_m2_apurado: string;
  intervalo_valor: string;
  grau_fundamentacao: GrauNBR;
  grau_precisao: GrauNBR;

  faixa_abertura: string;
  valor_alvo: string;
  piso_negociacao: string;
  argumentos: string[];
  alavancagem: string;

  conclusao: string;
}

export const defaultParecer = (): ParecerTecnico => ({
  referencia_documento: `PTAM-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
  data_emissao: new Date().toISOString().slice(0, 10),
  data_referencia: new Date().toISOString().slice(0, 10),
  objetivo:
    "Estimar o valor de mercado do imovel para fins de orientacao de negociacao e tomada de decisao patrimonial.",
  finalidade:
    "Subsidiar as partes interessadas na definicao de estrategia comercial, com base tecnica auditavel.",
  pressupostos:
    "Assume-se a veracidade das informacoes prestadas pelas partes, a regularidade documental declarada e a permanencia das condicoes de mercado vigentes na data de referencia.",
  endereco_imovel: "",
  bairro: "",
  tipologia: "",
  area_privativa: "",
  area_total: "",
  quartos: "",
  suites: "",
  vagas: "",
  ano_construcao: "",
  condominio: "",
  matricula: "",
  diagnostico_regiao: "",
  tipo_tratamento: "Tratamento por fatores",
  fundamentacao_metodologica:
    "Aplicou-se o Metodo Comparativo Direto de Dados de Mercado (MCDDM), em aderencia a ABNT NBR 14.653, com tratamento por fatores sobre amostra de transacoes reais e oficiais e de ofertas ativas, saneadas quanto a homogeneidade tipologica, locacional e de padrao construtivo.",
  comparativos: [],
  tratamento_amostra:
    "A amostra foi saneada por criterios de homogeneidade (tipologia, area, padrao, localizacao) e ponderada conforme aderencia ao imovel-referencia.",
  anuncios: [],
  estado_conservacao: "",
  padrao_acabamento: "",
  vista: "",
  posicao_solar: "",
  reformas: "",
  observacoes_perito: "",
  fotos: [],
  riscos_estruturais: "",
  nivel_estrutural: "",
  riscos_documentais: "",
  nivel_documental: "",
  riscos_condominiais: "",
  nivel_condominial: "",
  valor_mercado: "",
  valor_m2_apurado: "",
  intervalo_valor: "",
  grau_fundamentacao: "II",
  grau_precisao: "II",
  faixa_abertura: "",
  valor_alvo: "",
  piso_negociacao: "",
  argumentos: [],
  alavancagem: "",
  conclusao: "",
});

export const FORBIDDEN_PHRASES = [
  "laudo",
  "valorizacao garantida",
  "valorização garantida",
  "retorno garantido",
  "lucro certo",
  "investimento sem risco",
  "valor garantido de revenda",
  "cheque",
  "itbi",
  "cartorio",
  "cartório",
];

export function findForbidden(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return FORBIDDEN_PHRASES.filter((p) => lower.includes(p));
}
