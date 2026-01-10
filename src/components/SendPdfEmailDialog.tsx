import { useState, useEffect } from 'react';
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
import { Loader2, Mail, Send, FileText, FileCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendPdfByEmail, DocumentType } from '@/utils/pdfEmailService';
import jsPDF from 'jspdf';

export type ReportType = 'simplificado' | 'completo';

interface SendPdfEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatePdf: (reportType: ReportType) => Promise<jsPDF> | jsPDF;
  documentType: DocumentType;
  defaultEmail?: string;
  defaultName?: string;
  defaultSubject?: string;
  pdfFilename: string;
  showReportTypeSelector?: boolean;
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
  showReportTypeSelector = false,
}: SendPdfEmailDialogProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [recipientName, setRecipientName] = useState(defaultName);
  const [subject, setSubject] = useState(defaultSubject);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('simplificado');
  const { toast } = useToast();

  // Update email when defaultEmail changes
  useEffect(() => {
    setEmail(defaultEmail);
  }, [defaultEmail]);

  useEffect(() => {
    setRecipientName(defaultName);
  }, [defaultName]);

  useEffect(() => {
    setSubject(defaultSubject);
  }, [defaultSubject]);

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
      const pdfDoc = await generatePdf(reportType);

      const filenameWithType = showReportTypeSelector 
        ? pdfFilename.replace('.pdf', `_${reportType}.pdf`)
        : pdfFilename;

      const result = await sendPdfByEmail({
        to: email,
        recipientName: recipientName || 'Cliente',
        subject: subject || `Documento - ${filenameWithType}`,
        pdfDoc,
        pdfFilename: filenameWithType,
        documentType,
        customMessage: customMessage || undefined,
      });

      if (result.success) {
        toast({
          title: 'Email enviado!',
          description: `O relatório ${reportType === 'simplificado' ? 'simplificado' : 'completo'} foi enviado para ${email}.`,
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
          {showReportTypeSelector && (
            <div className="space-y-3">
              <Label>Tipo de Relatório</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReportType('simplificado')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    reportType === 'simplificado'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <FileText className={`h-8 w-8 ${reportType === 'simplificado' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-center">
                    <p className={`font-medium text-sm ${reportType === 'simplificado' ? 'text-primary' : ''}`}>
                      Simplificado
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Resumo executivo
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('completo')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    reportType === 'completo'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <FileCheck className={`h-8 w-8 ${reportType === 'completo' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-center">
                    <p className={`font-medium text-sm ${reportType === 'completo' ? 'text-primary' : ''}`}>
                      Completo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Análise detalhada
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

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
