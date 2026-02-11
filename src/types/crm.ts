export type EstagioPipeline =
  | 'novo'
  | 'contatado'
  | 'qualificado'
  | 'visita_agendada'
  | 'proposta_enviada'
  | 'negociacao'
  | 'ganho'
  | 'perdido';

export type TipoAtividade =
  | 'email_enviado'
  | 'whatsapp_enviado'
  | 'ligacao_realizada'
  | 'reuniao'
  | 'visita_agendada'
  | 'proposta_enviada'
  | 'nota'
  | 'status_alterado';

export type PrioridadeTarefa = 'baixa' | 'media' | 'alta' | 'urgente';
export type StatusTarefa = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';

export interface LeadPipeline {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  interesse: string | null;
  origem: string | null;
  estagio_pipeline: EstagioPipeline;
  score_qualificacao: number;
  tags: string[];
  valor_interesse: number | null;
  prazo_compra: string | null;
  ultimo_contato: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  organization_id: string | null;
  created_at: string;
  bairro_interesse: string | null;
}

export interface AtividadeLead {
  id: string;
  lead_id: string;
  tipo: TipoAtividade;
  titulo: string | null;
  descricao: string | null;
  metadata: Record<string, unknown>;
  usuario_id: string | null;
  usuario_nome: string | null;
  created_at: string;
}

export interface Tarefa {
  id: string;
  lead_id: string | null;
  organization_id: string | null;
  titulo: string;
  descricao: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  data_vencimento: string | null;
  data_conclusao: string | null;
  prioridade: PrioridadeTarefa;
  status: StatusTarefa;
  created_at: string;
  updated_at: string;
}

export interface NotaLead {
  id: string;
  lead_id: string;
  conteudo: string;
  autor_id: string | null;
  autor_nome: string | null;
  privada: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineColumnDef {
  id: EstagioPipeline;
  titulo: string;
  cor: string;
  icone: string;
}

export const PIPELINE_COLUMNS: PipelineColumnDef[] = [
  { id: 'novo', titulo: 'Novo', cor: 'bg-blue-500/20 border-blue-500/40', icone: '🆕' },
  { id: 'contatado', titulo: 'Contatado', cor: 'bg-cyan-500/20 border-cyan-500/40', icone: '📞' },
  { id: 'qualificado', titulo: 'Qualificado', cor: 'bg-violet-500/20 border-violet-500/40', icone: '✓' },
  { id: 'visita_agendada', titulo: 'Visita Agendada', cor: 'bg-amber-500/20 border-amber-500/40', icone: '📅' },
  { id: 'proposta_enviada', titulo: 'Proposta Enviada', cor: 'bg-orange-500/20 border-orange-500/40', icone: '📋' },
  { id: 'negociacao', titulo: 'Negociação', cor: 'bg-pink-500/20 border-pink-500/40', icone: '💬' },
  { id: 'ganho', titulo: 'Ganho', cor: 'bg-emerald-500/20 border-emerald-500/40', icone: '✅' },
  { id: 'perdido', titulo: 'Perdido', cor: 'bg-red-500/20 border-red-500/40', icone: '❌' },
];

export function getScoreIcon(score: number): string {
  if (score >= 80) return '🔥';
  if (score >= 50) return '🌡️';
  return '❄️';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-red-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-muted-foreground';
}

export function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Nunca';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `há ${diffMinutes}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 7) return `há ${diffDays}d`;
  return date.toLocaleDateString('pt-BR');
}

export function formatCurrencyShort(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return `R$ ${value}`;
}

export function formatCurrencyFull(value: number | null): string {
  if (!value) return 'A consultar';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(value);
}
