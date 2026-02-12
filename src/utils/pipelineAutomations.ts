import { supabase } from '@/integrations/supabase/client';
import { EstagioPipeline } from '@/types/crm';

interface AutomationConfig {
  titulo: string;
  descricao: string;
  prioridade: string;
  horasVencimento: number;
}

const STAGE_AUTOMATIONS: Partial<Record<EstagioPipeline, AutomationConfig>> = {
  qualificado: {
    titulo: 'Follow-up: Contatar lead qualificado',
    descricao: 'Entrar em contato com o lead qualificado para avançar no processo.',
    prioridade: 'alta',
    horasVencimento: 24,
  },
  visita_agendada: {
    titulo: 'Preparar material para visita',
    descricao: 'Reunir documentação e materiais necessários para a visita agendada.',
    prioridade: 'media',
    horasVencimento: 48,
  },
  proposta_enviada: {
    titulo: 'Acompanhar resposta da proposta',
    descricao: 'Fazer follow-up sobre a proposta enviada ao cliente.',
    prioridade: 'alta',
    horasVencimento: 72,
  },
};

export function runStageAutomations(
  leadId: string,
  newStage: EstagioPipeline,
  userId?: string,
  userName?: string,
  organizationId?: string | null,
) {
  const config = STAGE_AUTOMATIONS[newStage];
  if (!config) return;

  const vencimento = new Date();
  vencimento.setHours(vencimento.getHours() + config.horasVencimento);

  // Fire-and-forget: create task + log activity
  Promise.all([
    supabase.from('tarefas').insert({
      lead_id: leadId,
      organization_id: organizationId,
      titulo: config.titulo,
      descricao: config.descricao,
      prioridade: config.prioridade,
      status: 'pendente',
      responsavel_id: userId,
      responsavel_nome: userName,
      data_vencimento: vencimento.toISOString(),
    } as any),
    supabase.from('atividades_lead').insert({
      lead_id: leadId,
      tipo: 'nota',
      titulo: '🤖 Automação executada',
      descricao: `Tarefa criada automaticamente: "${config.titulo}" (vence em ${config.horasVencimento}h)`,
      usuario_id: userId,
      usuario_nome: 'Sistema',
    } as any),
  ]).catch((err) => console.error('Pipeline automation error:', err));
}
