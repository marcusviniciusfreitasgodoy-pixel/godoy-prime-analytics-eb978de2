import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useVisitas } from "@/hooks/useVisitas";
import { useFeedbackVisita } from "@/hooks/useFeedbackVisita";
import { usePropostas } from "@/hooks/usePropostas";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCompanySettings, getLogoBase64ForPDF } from "@/hooks/useCompanySettings";
import { useCorretores } from "@/hooks/useCorretores";
import { VisitSignature } from "@/components/visitas/VisitSignature";
import { VisitStatusBadge } from "@/components/visitas/VisitStatusBadge";
import { PageTour, TourButton } from "@/components/PageTour";
import { SendPdfEmailDialog } from "@/components/SendPdfEmailDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FichaVisita, StatusVisita, Acompanhante } from "@/types/visitas";
import { exportFichaVisitaPdf, generateFichaVisitaPdfDoc } from "@/utils/fichaVisitaPdfExport";
import { sendFeedbackRequestEmail } from "@/utils/visitEmailService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ArrowLeft, 
  Loader2, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Building2, 
  FileText, 
  Download,
  Save,
  QrCode,
  ExternalLink,
  CheckCircle,
  Send,
  FileSignature
} from "lucide-react";
import { toast } from "sonner";

export default function FichaVisitaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { fichas, updateFicha, updateStatus, isLoading } = useVisitas();
  const { feedbacks } = useFeedbackVisita(id);
  const { settings: companySettings } = useCompanySettings();
  const { corretores } = useCorretores();

  const [ficha, setFicha] = useState<FichaVisita | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [editedFicha, setEditedFicha] = useState<Partial<FichaVisita>>({});
  const [runTour, setRunTour] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  useEffect(() => {
    if (fichas && id) {
      const found = fichas.find(f => f.id === id);
      if (found) {
        setFicha(found);
        setEditedFicha(found);
      }
    }
  }, [fichas, id]);

  const handleSaveSignature = async (type: "visitante" | "corretor", signatureData: string) => {
    if (!ficha) return;

    try {
      const field = type === "visitante" ? "assinatura_visitante" : "assinatura_corretor";
      await updateFicha.mutateAsync({
        id: ficha.id,
        [field]: signatureData,
      });
      
      setFicha(prev => prev ? { ...prev, [field]: signatureData } : null);
      toast.success(`Assinatura do ${type} salva com sucesso!`);
    } catch (error) {
      toast.error("Erro ao salvar assinatura");
    }
  };

  const handleStatusChange = async (newStatus: StatusVisita) => {
    if (!ficha) return;

    try {
      await updateStatus.mutateAsync({ id: ficha.id, status: newStatus });
      setFicha(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleSaveChanges = async () => {
    if (!ficha) return;

    setIsSaving(true);
    try {
      await updateFicha.mutateAsync({
        id: ficha.id,
        ...editedFicha,
      });
      setFicha(prev => prev ? { ...prev, ...editedFicha } : null);
      setIsEditing(false);
      toast.success("Ficha atualizada com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

  const getCorretorInfo = () => {
    if (!ficha) return null;
    const corretor = corretores.find(c => c.id === ficha.corretor_id);
    return corretor ? { creci: corretor.creci, phone: corretor.phone, email: corretor.email } : null;
  };

  const handleExportPdf = async () => {
    if (!ficha) return;

    try {
      const logoBase64 = await getLogoBase64ForPDF(companySettings.custom_logo_url);
      const doc = await exportFichaVisitaPdf({ 
        ficha, 
        feedback: feedbacks && feedbacks.length > 0 ? feedbacks[0] : null,
        customLogoBase64: logoBase64,
        companySettings,
        corretorInfo: getCorretorInfo(),
      });
      
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ficha-visita-${ficha.codigo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  const handleGeneratePdfForEmail = async () => {
    if (!ficha) throw new Error("Ficha não encontrada");
    const logoBase64 = await getLogoBase64ForPDF(companySettings.custom_logo_url);
    return await generateFichaVisitaPdfDoc({
      ficha,
      feedback: feedbacks && feedbacks.length > 0 ? feedbacks[0] : null,
      customLogoBase64: logoBase64,
      companySettings,
      corretorInfo: getCorretorInfo(),
    });
  };

  const handleSendFeedbackEmail = async () => {
    if (!ficha || !ficha.email_visitante) {
      toast.error("Email do visitante não cadastrado");
      return;
    }

    setIsSendingEmail(true);
    try {
      const result = await sendFeedbackRequestEmail(ficha.email_visitante, {
        nome_visitante: ficha.nome_visitante,
        endereco_imovel: ficha.endereco_imovel,
        codigo_visita: ficha.codigo,
      });

      if (result.success) {
        toast.success("Email de feedback enviado com sucesso!");
      } else {
        toast.error(`Erro ao enviar email: ${result.error}`);
      }
    } catch (error) {
      toast.error("Erro ao enviar email de feedback");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const feedbackUrl = `${window.location.origin}/visitas/feedback/${ficha?.codigo}`;
  const signatureVisitanteUrl = `${window.location.origin}/visitas/assinatura/${ficha?.codigo}/visitante`;
  const signatureCorretorUrl = `${window.location.origin}/visitas/assinatura/${ficha?.codigo}/corretor`;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ficha) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Ficha de visita não encontrada</p>
            <Button onClick={() => navigate("/visitas")}>Voltar às visitas</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Ficha de Visita {ficha.codigo} | Godoy Prime Analytics</title>
      </Helmet>

      <PageTour page="fichaVisita" run={runTour} onFinish={() => setRunTour(false)} />

      <div className="container mx-auto px-3 py-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4" data-tour="ficha-header">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" className="px-2 sm:px-3" onClick={() => navigate("/visitas")}>
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold truncate">{ficha.codigo}</h1>
                <VisitStatusBadge status={ficha.status} />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Criada em {format(new Date(ficha.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <TourButton onClick={() => setRunTour(true)} />
            <Select value={ficha.status} onValueChange={(value) => handleStatusChange(value as StatusVisita)}>
              <SelectTrigger className="w-[140px] sm:w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agendada">Agendada</SelectItem>
                <SelectItem value="confirmada">Confirmada</SelectItem>
                <SelectItem value="realizada">Realizada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={handleExportPdf} data-tour="ficha-export-pdf">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Exportar PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(true)} data-tour="ficha-send-email">
              <Mail className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Enviar por Email</span>
              <span className="sm:hidden">Email</span>
            </Button>
          </div>
        </div>

        {/* Banner de campos pendentes */}
        {(ficha.cpf_visitante === "A preencher" || ficha.nome_proprietario === "A preencher") && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Campos pendentes de preenchimento</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Clique em "Editar Ficha" para preencher CPF, proprietário e outros dados antes da visita.</p>
            </div>
            <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => setIsEditing(true)}>
              Completar
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dados do Imóvel */}
            <Card data-tour="ficha-imovel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Dados do Imóvel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label>Endereço</Label>
                        <Input
                          value={editedFicha.endereco_imovel || ""}
                          onChange={(e) => setEditedFicha(prev => ({ ...prev, endereco_imovel: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Condomínio/Edifício</Label>
                        <Input
                          value={editedFicha.condominio_edificio || ""}
                          onChange={(e) => setEditedFicha(prev => ({ ...prev, condominio_edificio: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Unidade</Label>
                        <Input
                          value={editedFicha.unidade_imovel || ""}
                          onChange={(e) => setEditedFicha(prev => ({ ...prev, unidade_imovel: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Código do Imóvel</Label>
                        <Input
                          value={editedFicha.codigo_imovel || ""}
                          onChange={(e) => setEditedFicha(prev => ({ ...prev, codigo_imovel: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Valor (R$)</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="Ex: 1500000"
                          value={editedFicha.valor_imovel != null ? String(editedFicha.valor_imovel) : ""}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                            setEditedFicha(prev => ({ ...prev, valor_imovel: raw === "" ? null : parseFloat(raw) || null }));
                          }}
                        />
                        {editedFicha.valor_imovel != null && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(editedFicha.valor_imovel)}
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <Label>Proprietário</Label>
                        <Input
                          value={editedFicha.nome_proprietario || ""}
                          onChange={(e) => setEditedFicha(prev => ({ ...prev, nome_proprietario: e.target.value }))}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">{ficha.endereco_imovel}</p>
                        {ficha.condominio_edificio && (
                          <p className="text-sm text-muted-foreground">Condomínio: {ficha.condominio_edificio}</p>
                        )}
                        {ficha.unidade_imovel && (
                          <p className="text-sm text-muted-foreground">Unidade: {ficha.unidade_imovel}</p>
                        )}
                        {ficha.codigo_imovel && (
                          <p className="text-sm text-muted-foreground">Código: {ficha.codigo_imovel}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span>Proprietário: {ficha.nome_proprietario}</span>
                    </div>
                    {ficha.valor_imovel && (
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span>
                          Valor: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(ficha.valor_imovel)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dados do Visitante */}
            <Card data-tour="ficha-visitante">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados do Visitante
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome</Label>
                      <Input
                        value={editedFicha.nome_visitante || ""}
                        onChange={(e) => setEditedFicha(prev => ({ ...prev, nome_visitante: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>CPF</Label>
                      <Input
                        value={editedFicha.cpf_visitante || ""}
                        onChange={(e) => setEditedFicha(prev => ({ ...prev, cpf_visitante: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>RG</Label>
                      <Input
                        value={editedFicha.rg_visitante || ""}
                        onChange={(e) => setEditedFicha(prev => ({ ...prev, rg_visitante: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={editedFicha.telefone_visitante || ""}
                        onChange={(e) => setEditedFicha(prev => ({ ...prev, telefone_visitante: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={editedFicha.email_visitante || ""}
                        onChange={(e) => setEditedFicha(prev => ({ ...prev, email_visitante: e.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Endereço do Visitante</Label>
                      <Input
                        value={editedFicha.endereco_visitante || ""}
                        onChange={(e) => setEditedFicha(prev => ({ ...prev, endereco_visitante: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{ficha.nome_visitante}</p>
                        <p className="text-sm text-muted-foreground">CPF: {ficha.cpf_visitante}</p>
                        {ficha.rg_visitante && (
                          <p className="text-sm text-muted-foreground">RG: {ficha.rg_visitante}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <span>{ficha.telefone_visitante}</span>
                    </div>
                    {ficha.email_visitante && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <span>{ficha.email_visitante}</span>
                      </div>
                    )}
                    {ficha.endereco_visitante && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">{ficha.endereco_visitante}</span>
                      </div>
                    )}
                    {/* Acompanhantes */}
                    {ficha.acompanhantes && (ficha.acompanhantes as Acompanhante[]).length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium mb-1">Acompanhante(s):</p>
                        {(ficha.acompanhantes as Acompanhante[]).map((a, i) => (
                          <p key={i} className="text-sm text-muted-foreground">
                            {a.nome}{a.cpf ? ` — CPF: ${a.cpf}` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                    {/* LGPD opt-in */}
                    <div className="pt-2 border-t">
                      <Badge variant={ficha.aceita_ofertas_similares ? "default" : "secondary"}>
                        {ficha.aceita_ofertas_similares ? "Aceita ofertas similares" : "Não aceita ofertas similares"}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Observações */}
            <Card data-tour="ficha-observacoes">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editedFicha.notas || ""}
                    onChange={(e) => setEditedFicha(prev => ({ ...prev, notas: e.target.value }))}
                    rows={4}
                    placeholder="Observações sobre a visita..."
                  />
                ) : (
                  <p className="text-muted-foreground">
                    {ficha.notas || "Nenhuma observação registrada."}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Botões de Edição */}
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    setEditedFicha(ficha);
                  }}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Editar Ficha
                </Button>
              )}
            </div>

            {/* Assinaturas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-tour="ficha-assinaturas">
              <VisitSignature
                title="Assinatura do Visitante"
                description="Solicite a assinatura do visitante"
                onSave={(data) => handleSaveSignature("visitante", data)}
                existingSignature={ficha.assinatura_visitante}
              />
              <VisitSignature
                title="Assinatura do Corretor"
                description="Sua assinatura como corretor"
                onSave={(data) => handleSaveSignature("corretor", data)}
                existingSignature={ficha.assinatura_corretor}
              />
            </div>
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Info da Visita */}
            <Card data-tour="ficha-info">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data da Visita</p>
                  <p className="font-medium">
                    {format(new Date(ficha.data_visita), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(ficha.data_visita), "HH:mm", { locale: ptBR })}
                  </p>
                </div>
                
                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground">Corretor</p>
                  <p className="font-medium">{ficha.nome_corretor}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground">Status das Assinaturas</p>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                      {ficha.assinatura_visitante ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className="text-sm">Visitante</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {ficha.assinatura_corretor ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className="text-sm">Corretor</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Links de Assinatura Digital */}
            <Card data-tour="ficha-assinatura-digital">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5" />
                  Assinatura Digital
                </CardTitle>
                <CardDescription>
                  Envie o link para assinatura remota
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Visitante */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Visitante</span>
                    {ficha.assinatura_visitante ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Assinado
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pendente</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        navigator.clipboard.writeText(signatureVisitanteUrl);
                        toast.success("Link de assinatura copiado!");
                      }}
                    >
                      Copiar Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(signatureVisitanteUrl, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Corretor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Corretor</span>
                    {ficha.assinatura_corretor ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Assinado
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pendente</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        navigator.clipboard.writeText(signatureCorretorUrl);
                        toast.success("Link de assinatura copiado!");
                      }}
                    >
                      Copiar Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(signatureCorretorUrl, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Proposta de Compra */}
            <Card data-tour="ficha-proposta">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5" />
                  Proposta de Compra
                </CardTitle>
                <CardDescription>
                  Envie o formulário de proposta ao cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Link pré-preenchido</p>
                  <p className="text-xs text-muted-foreground">Com dados do imóvel e visitante</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/proposta/${ficha.codigo}`);
                        toast.success("Link da proposta pré-preenchida copiado!");
                      }}
                    >
                      Copiar Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/proposta/${ficha.codigo}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Link em branco</p>
                  <p className="text-xs text-muted-foreground">Cliente preenche todos os dados</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/proposta/novo`);
                        toast.success("Link da proposta em branco copiado!");
                      }}
                    >
                      Copiar Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open("/proposta/novo", "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Link para Feedback */}
            <Card data-tour="ficha-feedback">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Feedback do Cliente
                </CardTitle>
                <CardDescription>
                  Compartilhe este link para o cliente avaliar a visita
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted rounded-lg text-sm break-all font-mono">
                  {feedbackUrl}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      navigator.clipboard.writeText(feedbackUrl);
                      toast.success("Link copiado!");
                    }}
                  >
                    Copiar Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(feedbackUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                {/* Botão de enviar email */}
                {ficha.email_visitante && !feedbacks?.length && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={handleSendFeedbackEmail}
                    disabled={isSendingEmail}
                  >
                    {isSendingEmail ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar Link por Email
                  </Button>
                )}

                {feedbacks && feedbacks.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Feedback recebido!</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog de envio por email */}
      <SendPdfEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        generatePdf={handleGeneratePdfForEmail}
        documentType="ficha_visita"
        defaultSubject={`Ficha de Visita - ${ficha.codigo}`}
        pdfFilename={`ficha-visita-${ficha.codigo}.pdf`}
        defaultEmail={ficha.email_visitante || ""}
        defaultName={ficha.nome_visitante}
      />
    </>
  );
}
