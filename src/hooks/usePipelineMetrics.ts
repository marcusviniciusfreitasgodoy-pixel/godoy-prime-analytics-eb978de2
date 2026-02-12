import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EstagioPipeline, PIPELINE_COLUMNS } from '@/types/crm';

const FUNNEL_STAGES: EstagioPipeline[] = [
  'novo', 'contatado', 'qualificado', 'visita_agendada',
  'proposta_enviada', 'negociacao', 'ganho',
];

const STAGE_LABELS: Record<string, string> = {};
PIPELINE_COLUMNS.forEach(c => { STAGE_LABELS[c.id] = c.titulo; });

interface FunnelEntry {
  stage: EstagioPipeline;
  label: string;
  count: number;
  percent: number; // vs previous stage
}

interface AvgTimeEntry {
  stage: string;
  label: string;
  days: number;
}

interface LossEntry {
  stage: string;
  label: string;
  count: number;
}

export interface PipelineMetrics {
  funnel: FunnelEntry[];
  avgTime: AvgTimeEntry[];
  lossRate: LossEntry[];
  kpis: {
    conversionRate: number; // % novo→ganho
    avgCycleDays: number;
    activeLeads: number;
    pipelineValue: number;
  };
}

async function fetchMetrics(): Promise<PipelineMetrics> {
  // Fetch leads and activities in parallel
  const [leadsRes, activitiesRes] = await Promise.all([
    supabase.from('leads').select('id, estagio_pipeline, valor_interesse, created_at'),
    supabase.from('atividades_lead').select('lead_id, tipo, metadata, created_at')
      .eq('tipo', 'status_alterado')
      .order('created_at', { ascending: true }),
  ]);

  const leads = leadsRes.data ?? [];
  const activities = activitiesRes.data ?? [];

  // Build per-lead stage history
  const stageIndex = new Map<string, number>();
  FUNNEL_STAGES.forEach((s, i) => stageIndex.set(s, i));

  // Track highest stage each lead reached
  const leadMaxStage = new Map<string, number>();
  const leadActivities = new Map<string, Array<{ stage: string; at: number }>>();

  leads.forEach(l => {
    const current = l.estagio_pipeline as string;
    const idx = stageIndex.get(current) ?? -1;
    leadMaxStage.set(l.id, Math.max(leadMaxStage.get(l.id) ?? 0, idx));

    // Every lead starts at 'novo'
    if (!leadActivities.has(l.id)) {
      leadActivities.set(l.id, [{ stage: 'novo', at: new Date(l.created_at).getTime() }]);
    }
  });

  activities.forEach(a => {
    const meta = a.metadata as Record<string, unknown> | null;
    const newStage = (meta?.novo_estagio ?? meta?.new_stage ?? '') as string;
    const oldStage = (meta?.estagio_anterior ?? meta?.old_stage ?? '') as string;

    if (newStage && stageIndex.has(newStage)) {
      const idx = stageIndex.get(newStage)!;
      leadMaxStage.set(a.lead_id, Math.max(leadMaxStage.get(a.lead_id) ?? 0, idx));
    }

    if (!leadActivities.has(a.lead_id)) {
      leadActivities.set(a.lead_id, []);
    }
    if (newStage) {
      leadActivities.get(a.lead_id)!.push({
        stage: newStage,
        at: new Date(a.created_at!).getTime(),
      });
    }
  });

  // --- Funnel ---
  const funnel: FunnelEntry[] = FUNNEL_STAGES.map((stage, i) => {
    const idx = stageIndex.get(stage)!;
    const count = Array.from(leadMaxStage.values()).filter(v => v >= idx).length;
    const prevCount = i === 0 ? count : Array.from(leadMaxStage.values()).filter(v => v >= stageIndex.get(FUNNEL_STAGES[i - 1])!).length;
    return {
      stage,
      label: STAGE_LABELS[stage] ?? stage,
      count,
      percent: prevCount > 0 ? Math.round((count / prevCount) * 100) : 0,
    };
  });

  // --- Avg time per stage ---
  const stageDurations = new Map<string, number[]>();
  FUNNEL_STAGES.forEach(s => stageDurations.set(s, []));

  leadActivities.forEach(entries => {
    const sorted = [...entries].sort((a, b) => a.at - b.at);
    for (let i = 0; i < sorted.length - 1; i++) {
      const fromStage = sorted[i].stage;
      if (stageDurations.has(fromStage)) {
        const diffDays = (sorted[i + 1].at - sorted[i].at) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays < 365) {
          stageDurations.get(fromStage)!.push(diffDays);
        }
      }
    }
  });

  const avgTime: AvgTimeEntry[] = FUNNEL_STAGES.slice(0, -1).map(stage => {
    const durations = stageDurations.get(stage) ?? [];
    const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    return { stage, label: STAGE_LABELS[stage] ?? stage, days: Math.round(avg * 10) / 10 };
  });

  // --- Loss rate ---
  const lostLeads = leads.filter(l => l.estagio_pipeline === 'perdido');
  const lossMap = new Map<string, number>();

  lostLeads.forEach(l => {
    const entries = leadActivities.get(l.id) ?? [];
    const sorted = [...entries].sort((a, b) => a.at - b.at);
    // Find last stage before 'perdido'
    let lastBefore = 'novo';
    for (const e of sorted) {
      if (e.stage === 'perdido') break;
      lastBefore = e.stage;
    }
    lossMap.set(lastBefore, (lossMap.get(lastBefore) ?? 0) + 1);
  });

  const lossRate: LossEntry[] = FUNNEL_STAGES.filter(s => s !== 'ganho')
    .map(stage => ({
      stage,
      label: STAGE_LABELS[stage] ?? stage,
      count: lossMap.get(stage) ?? 0,
    }))
    .filter(e => e.count > 0);

  // --- KPIs ---
  const totalLeads = leads.length;
  const wonLeads = leads.filter(l => l.estagio_pipeline === 'ganho').length;
  const activeLeads = leads.filter(l => l.estagio_pipeline !== 'ganho' && l.estagio_pipeline !== 'perdido').length;
  const pipelineValue = leads
    .filter(l => l.estagio_pipeline !== 'ganho' && l.estagio_pipeline !== 'perdido')
    .reduce((sum, l) => sum + (l.valor_interesse ?? 0), 0);

  // Avg cycle for won leads
  const wonCycles: number[] = [];
  leads.filter(l => l.estagio_pipeline === 'ganho').forEach(l => {
    const entries = leadActivities.get(l.id) ?? [];
    const ganhoEntry = entries.find(e => e.stage === 'ganho');
    if (ganhoEntry) {
      const days = (ganhoEntry.at - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (days >= 0 && days < 730) wonCycles.push(days);
    }
  });

  const avgCycleDays = wonCycles.length > 0
    ? Math.round((wonCycles.reduce((a, b) => a + b, 0) / wonCycles.length) * 10) / 10
    : 0;

  return {
    funnel,
    avgTime,
    lossRate,
    kpis: {
      conversionRate: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100 * 10) / 10 : 0,
      avgCycleDays,
      activeLeads,
      pipelineValue,
    },
  };
}

export function usePipelineMetrics() {
  return useQuery({
    queryKey: ['pipeline-metrics'],
    queryFn: fetchMetrics,
    staleTime: 60_000,
  });
}
