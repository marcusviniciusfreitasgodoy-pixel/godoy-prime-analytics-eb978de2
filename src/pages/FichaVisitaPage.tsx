import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useVisitas } from "@/hooks/useVisitas";
import { useFeedbackVisita } from "@/hooks/useFeedbackVisita";
import { useAuthContext } from "@/contexts/AuthContext";
import { VisitSignature } from "@/components/visitas/VisitSignature";
import { VisitStatusBadge } from "@/components/visitas/VisitStatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FichaVisita, StatusVisita } from "@/types/visitas";
import { exportFichaVisitaPdf } from "@/utils/fichaVisitaPdfExport";
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
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

export default function FichaVisitaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { fichas, updateFicha, updateStatus, isLoading } = useVisitas();
  const { feedbacks } = useFeedbackVisita(id);

  const [ficha, setFicha] = useState<FichaVisita | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedFicha, setEditedFicha] = useState<Partial<FichaVisita>>({});

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

  const handleExportPdf = async () => {
    if (!ficha) return;

    try {
      await exportFichaVisitaPdf({ 
        ficha, 
        feedback: feedbacks && feedbacks.length > 0 ? feedbacks[0] : null 
      });
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar PDF");
    }
  };

  const feedbackUrl = `${window.location.origin}/visitas/feedback/${ficha?.codigo}`;

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

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/visitas")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{ficha.codigo}</h1>
                <VisitStatusBadge status={ficha.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Criada em {format(new Date(ficha.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={ficha.status} onValueChange={(value) => handleStatusChange(value as StatusVisita)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agendada">Agendada</SelectItem>
                <SelectItem value="confirmada">Confirmada</SelectItem>
                <SelectItem value="realizada">Realizada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleExportPdf}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dados do Imóvel */}
            <Card>
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
                        <Label>Código do Imóvel</Label>
                        <Input
                          value={editedFicha.codigo_imovel || ""}
                          onChange={(e) => setEditedFicha(prev => ({ ...prev, codigo_imovel: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Valor</Label>
                        <Input
                          type="number"
                          value={editedFicha.valor_imovel || ""}
                          onChange={(e) => setEditedFicha(prev => ({ ...prev, valor_imovel: parseFloat(e.target.value) }))}
                        />
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
            <Card>
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
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{ficha.nome_visitante}</p>
                        <p className="text-sm text-muted-foreground">CPF: {ficha.cpf_visitante}</p>
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
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Observações */}
            <Card>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <Card>
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

            {/* Link para Feedback */}
            <Card>
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
    </>
  );
}
