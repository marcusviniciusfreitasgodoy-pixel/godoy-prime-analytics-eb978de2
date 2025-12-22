// Tipos para o módulo de Agendamento de Visitas

export type StatusVisita = 'agendada' | 'confirmada' | 'realizada' | 'cancelada';
export type TipoServicoVisita = 'visita' | 'avaliacao' | 'consultoria' | 'fotografia';
export type OrigemAgendamento = 'site' | 'indicacao' | 'whatsapp' | 'instagram' | 'facebook' | 'google' | 'outro';
export type NivelInteresseVisita = 'baixo' | 'medio' | 'alto' | 'muito_alto';
export type PercepcaoValorVisita = 'abaixo' | 'justo' | 'acima';

export interface FichaVisita {
  id: string;
  codigo: string;
  nome_visitante: string;
  cpf_visitante: string;
  telefone_visitante: string;
  email_visitante: string | null;
  codigo_imovel: string | null;
  endereco_imovel: string;
  valor_imovel: number | null;
  nome_proprietario: string;
  corretor_id: string | null;
  nome_corretor: string;
  data_visita: string;
  status: StatusVisita;
  assinatura_visitante: string | null;
  assinatura_corretor: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface FichaVisitaInsert {
  codigo: string;
  nome_visitante: string;
  cpf_visitante: string;
  telefone_visitante: string;
  email_visitante?: string | null;
  codigo_imovel?: string | null;
  endereco_imovel: string;
  valor_imovel?: number | null;
  nome_proprietario: string;
  corretor_id?: string | null;
  nome_corretor: string;
  data_visita?: string;
  status?: StatusVisita;
  assinatura_visitante?: string | null;
  assinatura_corretor?: string | null;
  notas?: string | null;
}

export interface FeedbackVisita {
  id: string;
  ficha_visita_id: string;
  atende_necessidades: boolean | null;
  gostaria_fazer_proposta: boolean | null;
  avaliacao_geral: number | null;
  conexao_imovel: number | null;
  valor_ofertaria: number | null;
  nivel_interesse: NivelInteresseVisita | null;
  compraria_imovel: boolean | null;
  ponto_resistencia: string | null;
  percepcao_valor: PercepcaoValorVisita | null;
  o_que_mais_gostou: string | null;
  o_que_menos_gostou: string | null;
  o_que_alteraria: string | null;
  pontos_positivos: string | null;
  pontos_negativos: string | null;
  sugestoes_melhoria: string | null;
  efeito_uau: string[] | null;
  efeito_uau_detalhe: string | null;
  created_at: string;
}

export interface FeedbackVisitaInsert {
  ficha_visita_id: string;
  atende_necessidades?: boolean | null;
  gostaria_fazer_proposta?: boolean | null;
  avaliacao_geral?: number | null;
  conexao_imovel?: number | null;
  valor_ofertaria?: number | null;
  nivel_interesse?: NivelInteresseVisita | null;
  compraria_imovel?: boolean | null;
  ponto_resistencia?: string | null;
  percepcao_valor?: PercepcaoValorVisita | null;
  o_que_mais_gostou?: string | null;
  o_que_menos_gostou?: string | null;
  o_que_alteraria?: string | null;
  pontos_positivos?: string | null;
  pontos_negativos?: string | null;
  sugestoes_melhoria?: string | null;
  efeito_uau?: string[] | null;
  efeito_uau_detalhe?: string | null;
}

export interface AgendamentoVisita {
  id: string;
  lead_id: string | null;
  nome_visitante: string;
  telefone_visitante: string;
  email_visitante: string | null;
  endereco_imovel: string;
  codigo_imovel: string | null;
  corretor_id: string | null;
  tipo_servico: TipoServicoVisita;
  data_hora: string;
  status: StatusVisita;
  origem: OrigemAgendamento | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgendamentoVisitaInsert {
  lead_id?: string | null;
  nome_visitante: string;
  telefone_visitante: string;
  email_visitante?: string | null;
  endereco_imovel: string;
  codigo_imovel?: string | null;
  corretor_id?: string | null;
  tipo_servico?: TipoServicoVisita;
  data_hora: string;
  status?: StatusVisita;
  origem?: OrigemAgendamento | null;
  notas?: string | null;
}

export interface DisponibilidadeCorretor {
  id: string;
  corretor_id: string;
  data: string;
  horarios_disponiveis: string[];
  ativo: boolean;
  created_at: string;
}

export interface DisponibilidadeCorretorInsert {
  corretor_id: string;
  data: string;
  horarios_disponiveis?: string[];
  ativo?: boolean;
}
