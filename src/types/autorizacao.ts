export type AutorizacaoStatus = "rascunho" | "enviada" | "visualizada" | "assinada" | "recusada";
export type TipoGestao = "com_exclusiva" | "sem_exclusiva";

export interface Autorizacao {
  id: string;
  organization_id: string;
  valuation_id: string;
  created_by: string | null;
  codigo: string;

  proprietario_nome: string;
  proprietario_cpf: string;
  proprietario_rg: string | null;
  proprietario_rg_orgao: string | null;
  proprietario_telefone: string | null;
  proprietario_email: string;

  endereco: string;
  numero: string | null;
  complemento: string | null;
  bairro: string;
  cidade: string;
  cep: string | null;
  valor_condominio: number | null;
  valor_iptu: number | null;
  vagas: number | null;
  quartos: number | null;

  valor_avaliacao: number;
  valor_venda: number;

  tipo_gestao: TipoGestao;
  prazo_dias: number;
  percentual_honorarios: number;

  corretor_nome: string | null;
  corretor_creci: string | null;

  status: AutorizacaoStatus;
  token_acesso: string | null;

  assinatura_proprietario: string | null;
  assinatura_corretor: string | null;
  ip_assinatura_proprietario: string | null;
  data_assinatura_proprietario: string | null;
  data_envio: string | null;
  data_visualizacao: string | null;
  data_vencimento: string | null;
  data_recusa: string | null;
  motivo_recusa: string | null;

  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutorizacaoEvento {
  id: string;
  autorizacao_id: string;
  tipo:
    | "criada"
    | "enviada"
    | "reenviada"
    | "visualizada"
    | "assinada"
    | "recusada"
    | "pdf_gerado";
  ip: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AutorizacaoFormData {
  // Proprietário
  proprietario_nome: string;
  proprietario_cpf: string;
  proprietario_rg: string;
  proprietario_rg_orgao: string;
  proprietario_telefone: string;
  proprietario_email: string;

  // Imóvel
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  cep: string;
  valor_condominio: string; // numeric string
  valor_iptu: string;
  vagas: number;
  quartos: number;

  // Valores contratuais
  valor_avaliacao: string;
  valor_venda: string;

  // Configurações
  tipo_gestao: TipoGestao;
  prazo_dias: number;
  percentual_honorarios: number;
}

export const STATUS_LABEL: Record<AutorizacaoStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  visualizada: "Visualizada",
  assinada: "Assinada",
  recusada: "Recusada",
};

export const STATUS_BADGE_CLASS: Record<AutorizacaoStatus, string> = {
  rascunho: "bg-muted text-muted-foreground border-border",
  enviada: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300",
  visualizada: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
  assinada: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
  recusada: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300",
};