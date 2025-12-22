import { StatusVisita } from "@/types/visitas";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, XCircle, Clock } from "lucide-react";

interface VisitStatusBadgeProps {
  status: StatusVisita;
}

const statusConfig: Record<StatusVisita, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  agendada: {
    label: "Agendada",
    variant: "secondary",
    icon: <Calendar className="h-3 w-3" />,
  },
  confirmada: {
    label: "Confirmada",
    variant: "default",
    icon: <Clock className="h-3 w-3" />,
  },
  realizada: {
    label: "Realizada",
    variant: "outline",
    icon: <CheckCircle className="h-3 w-3 text-green-500" />,
  },
  cancelada: {
    label: "Cancelada",
    variant: "destructive",
    icon: <XCircle className="h-3 w-3" />,
  },
};

export function VisitStatusBadge({ status }: VisitStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}
