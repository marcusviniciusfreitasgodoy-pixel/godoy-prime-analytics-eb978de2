import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mail, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendPdfByEmail, DocumentType } from '@/utils/pdfEmailService';
import jsPDF from 'jspdf';

interface SendPdfEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatePdf: () => Promise<jsPDF> | jsPDF;
  documentType: DocumentType;
  defaultEmail?: string;
  defaultName?: string;
  defaultSubject?: string;
  pdfFilename: string;
}

export function SendPdfEmailDialog({
  open,
  onOpenChange,
  generatePdf,
  documentType,
  defaultEmail = '',
  defaultName = '',
  defaultSubject = '',
  pdfFilename,
}: SendPdfEmailDialogProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [recipientName, setRecipientName] = useState(defaultName);
  const [subject, setSubject] = useState(defaultSubject);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!email) {
      toast({
        title: 'Email obrigatório',
        description: 'Por favor, informe o email do destinatário.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      const pdfDoc = await generatePdf();

      const result = await sendPdfByEmail({
        to: email,
        recipientName: recipientName || 'Cliente',
        subject: subject || `Documento - ${pdfFilename}`,
        pdfDoc,
        pdfFilename,
        documentType,
        customMessage: customMessage || undefined,
      });

      if (result.success) {
        toast({
          title: 'Email enviado!',
          description: `O documento foi enviado para ${email}.`,
        });
        onOpenChange(false);
        // Reset form
        setCustomMessage('');
      } else {
        throw new Error(result.error || 'Erro ao enviar email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Não foi possível enviar o email. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enviar PDF por Email
          </DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para enviar o documento por email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email do Destinatário *</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientName">Nome do Destinatário</Label>
            <Input
              id="recipientName"
              placeholder="Nome do cliente"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              placeholder="Assunto do email"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem Adicional (opcional)</Label>
            <Textarea
              id="message"
              placeholder="Adicione uma mensagem personalizada..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
