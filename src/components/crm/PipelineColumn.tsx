import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LeadCard } from './LeadCard';
import { LeadPipeline, PipelineColumnDef, formatCurrencyShort } from '@/types/crm';
import { cn } from '@/lib/utils';

interface PipelineColumnProps {
  column: PipelineColumnDef;
  leads: LeadPipeline[];
  onViewLead: (lead: LeadPipeline) => void;
}

export function PipelineColumn({ column, leads, onViewLead }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const totalValue = leads.reduce((sum, lead) => sum + (lead.valor_interesse || 0), 0);

  return (
    <div
      className={cn(
        'flex flex-col min-w-[280px] max-w-[300px] rounded-lg border p-2 transition-colors',
        column.cor,
        isOver && 'ring-2 ring-primary'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{column.icone}</span>
          <span className="text-sm font-semibold">{column.titulo}</span>
          <span className="text-xs bg-background/60 rounded-full px-1.5 py-0.5 font-medium">
            {leads.length}
          </span>
        </div>
      </div>
      {totalValue > 0 && (
        <p className="text-[10px] text-muted-foreground px-1 mb-2">
          {formatCurrencyShort(totalValue)}
        </p>
      )}

      {/* Cards */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-320px)]">
        <div ref={setNodeRef} className="space-y-2 min-h-[60px] p-0.5">
          <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onView={onViewLead} />
            ))}
          </SortableContext>
          {leads.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum lead</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
