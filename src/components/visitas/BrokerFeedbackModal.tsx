import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrokerFeedbackForm } from "./BrokerFeedbackForm";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BrokerFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fichaVisitaId: string;
  fichaLabel?: string;
}

export function BrokerFeedbackModal({ open, onOpenChange, fichaVisitaId, fichaLabel }: BrokerFeedbackModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Feedback do Corretor</DialogTitle>
          {fichaLabel && <p className="text-sm text-muted-foreground">{fichaLabel}</p>}
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <BrokerFeedbackForm
            fichaVisitaId={fichaVisitaId}
            onSuccess={() => onOpenChange(false)}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
