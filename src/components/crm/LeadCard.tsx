import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Phone, Mail, MessageCircle, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { LeadPipeline, getScoreIcon, getScoreColor, formatTimeAgo, formatCurrencyFull } from '@/types/crm';
import { cn } from '@/lib/utils';

interface LeadCardProps {
  lead: LeadPipeline;
  onView: (lead: LeadPipeline) => void;
  overlay?: boolean;
}

export function LeadCard({ lead, onView, overlay }: LeadCardProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: lead.id, data: { lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={overlay ? undefined : style}
      {...(overlay ? {} : { ...attributes, ...listeners })}
      className={cn(
        'p-3 cursor-grab active:cursor-grabbing border bg-card hover:shadow-md transition-shadow',
        isDragging && 'opacity-40',
        overlay && 'shadow-lg rotate-2'
      )}
      onClick={() => onView(lead)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{lead.nome}</p>
          {lead.bairro_interesse && (
            <p className="text-xs text-muted-foreground truncate">{lead.bairro_interesse}</p>
          )}
        </div>
        <span className={cn('text-xs font-bold whitespace-nowrap', getScoreColor(lead.score_qualificacao))}>
          {lead.score_qualificacao} {getScoreIcon(lead.score_qualificacao)}
        </span>
      </div>

      {/* Value */}
      <p className="text-xs text-muted-foreground mb-2">
        {formatCurrencyFull(lead.valor_interesse)}
      </p>

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {lead.tags.slice(0, 2).map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {lead.tags.length > 2 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              +{lead.tags.length - 2}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {formatTimeAgo(lead.ultimo_contato || lead.created_at)}
        </span>
        <div className="flex gap-1">
          {lead.telefone && (
            <button
              onClick={(e) => { e.stopPropagation(); window.open(`tel:${lead.telefone}`, '_blank'); }}
              className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent"
              title="Ligar"
            >
              <Phone className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); window.open(`mailto:${lead.email}`, '_blank'); }}
            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent"
            title="Email"
          >
            <Mail className="h-3 w-3" />
          </button>
          {lead.telefone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`, '_blank');
              }}
              className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent"
              title="WhatsApp"
            >
              <MessageCircle className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onView(lead); }}
            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent"
            title="Ver detalhes"
          >
            <Eye className="h-3 w-3" />
          </button>
        </div>
      </div>
    </Card>
  );
}
