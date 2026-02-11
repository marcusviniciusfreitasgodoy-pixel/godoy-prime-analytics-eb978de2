import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PipelineColumn } from './PipelineColumn';
import { LeadCard } from './LeadCard';
import { LeadDetailModal } from './LeadDetailModal';
import { LeadPipeline, PIPELINE_COLUMNS, EstagioPipeline, formatCurrencyShort } from '@/types/crm';
import { Loader2 } from 'lucide-react';

export function PipelineKanban() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadPipeline | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Fetch leads
  const { data: leads, isLoading } = useQuery({
    queryKey: ['pipeline-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      return (data || []).map((lead: any) => ({
        ...lead,
        estagio_pipeline: lead.estagio_pipeline || 'novo',
        score_qualificacao: lead.score_qualificacao || 0,
        tags: Array.isArray(lead.tags) ? lead.tags : [],
      })) as LeadPipeline[];
    },
  });

  // Move lead mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ leadId, newStage, oldStage }: { leadId: string; newStage: EstagioPipeline; oldStage: string }) => {
      const { error } = await supabase
        .from('leads')
        .update({ estagio_pipeline: newStage, ultimo_contato: new Date().toISOString() } as any)
        .eq('id', leadId);
      if (error) throw error;

      await supabase.from('atividades_lead').insert({
        lead_id: leadId,
        tipo: 'status_alterado',
        titulo: 'Estágio alterado',
        descricao: `De "${oldStage}" para "${newStage}"`,
        usuario_id: user?.id,
        usuario_nome: user?.email?.split('@')[0] || 'Usuário',
      } as any);
    },
    onSuccess: (_, { newStage }) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      if (newStage === 'ganho') {
        toast.success('🎉 Lead convertido com sucesso!');
      } else {
        toast.success('Estágio atualizado!');
      }
    },
    onError: () => toast.error('Erro ao atualizar estágio'),
  });

  // Filters
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (!searchTerm) return leads;
    const term = searchTerm.toLowerCase();
    return leads.filter((lead) =>
      lead.nome.toLowerCase().includes(term) ||
      lead.email.toLowerCase().includes(term) ||
      lead.telefone?.includes(searchTerm)
    );
  }, [leads, searchTerm]);

  // Group by stage
  const leadsByStage = useMemo(() => {
    const grouped: Record<EstagioPipeline, LeadPipeline[]> = {
      novo: [], contatado: [], qualificado: [], visita_agendada: [],
      proposta_enviada: [], negociacao: [], ganho: [], perdido: [],
    };
    filteredLeads.forEach((lead) => {
      const stage = lead.estagio_pipeline as EstagioPipeline;
      if (grouped[stage]) grouped[stage].push(lead);
      else grouped.novo.push(lead);
    });
    return grouped;
  }, [filteredLeads]);

  // KPIs
  const metrics = useMemo(() => {
    const total = filteredLeads.length;
    const ganhos = leadsByStage.ganho.length;
    const perdidos = leadsByStage.perdido.length;
    const taxaConversao = total > 0 ? ((ganhos / total) * 100).toFixed(1) : '0';
    const valorNegociacao = [...leadsByStage.proposta_enviada, ...leadsByStage.negociacao]
      .reduce((sum, lead) => sum + (lead.valor_interesse || 0), 0);
    return { total, ganhos, perdidos, taxaConversao, valorNegociacao };
  }, [filteredLeads, leadsByStage]);

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const leadId = active.id as string;
    const newStage = over.id as EstagioPipeline;
    const lead = filteredLeads.find((l) => l.id === leadId);
    if (!lead || lead.estagio_pipeline === newStage) return;
    // Check if over.id is a valid stage
    if (!PIPELINE_COLUMNS.find((c) => c.id === newStage)) return;
    updateStageMutation.mutate({ leadId, newStage, oldStage: lead.estagio_pipeline });
  };

  const activeLead = activeId ? filteredLeads.find((l) => l.id === activeId) : null;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Leads Ativos</p>
            <p className="text-2xl font-bold">{metrics.total - metrics.ganhos - metrics.perdidos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
            <p className="text-2xl font-bold">{metrics.taxaConversao}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Em Negociação</p>
            <p className="text-2xl font-bold">{formatCurrencyShort(metrics.valorNegociacao)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ganhos / Perdidos</p>
            <p className="text-2xl font-bold">
              <span className="text-emerald-500">{metrics.ganhos}</span>
              {' / '}
              <span className="text-red-500">{metrics.perdidos}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar lead..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-4 min-w-max">
              {PIPELINE_COLUMNS.map((column) => (
                <PipelineColumn
                  key={column.id}
                  column={column}
                  leads={leadsByStage[column.id]}
                  onViewLead={setSelectedLead}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <DragOverlay>
            {activeLead && (
              <LeadCard lead={activeLead} onView={() => {}} overlay />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdateLead={() => queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] })}
      />
    </div>
  );
}
