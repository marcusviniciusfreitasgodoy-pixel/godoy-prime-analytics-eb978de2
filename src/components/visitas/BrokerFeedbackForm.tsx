import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Loader2 } from "lucide-react";
import { useActiveFeedbackCorretorConfig, FeedbackCorretorField, FeedbackCorretorSection } from "@/hooks/useFeedbackCorretorConfig";
import { useFeedbackCorretor } from "@/hooks/useFeedbackCorretor";
import { useAuthContext } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface BrokerFeedbackFormProps {
  fichaVisitaId: string;
  onSuccess?: () => void;
}

export function BrokerFeedbackForm({ fichaVisitaId, onSuccess }: BrokerFeedbackFormProps) {
  const { data: config, isLoading: configLoading } = useActiveFeedbackCorretorConfig();
  const { feedback: existingFeedback, isLoading: feedbackLoading, createFeedback } = useFeedbackCorretor(fichaVisitaId);
  const { user } = useAuthContext();
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [notasGerais, setNotasGerais] = useState("");
  const [proximosPassos, setProximosPassos] = useState("");

  if (configLoading || feedbackLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (existingFeedback) {
    return (
      <div className="space-y-4">
        <Badge variant="secondary" className="text-sm">Feedback já registrado</Badge>
        {config?.sections?.map((section) => {
          const fields = config.fields.filter(f => f.section_id === section.section_id);
          return (
            <Card key={section.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {fields.map((field) => {
                  const value = existingFeedback.respostas?.[field.field_id];
                  return (
                    <div key={field.id} className="flex justify-between items-center py-1">
                      <span className="text-sm text-muted-foreground">{field.label}</span>
                      <span className="text-sm font-medium">
                        {field.field_type === "checkbox" ? (value ? "Sim" : "Não") : 
                         field.field_type === "rating" ? `${value || 0}/5` : 
                         (value || "—")}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
        {existingFeedback.notas_gerais && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Notas Gerais</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{existingFeedback.notas_gerais}</p></CardContent>
          </Card>
        )}
        {existingFeedback.proximos_passos && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Próximos Passos</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{existingFeedback.proximos_passos}</p></CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (!config?.sections?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum formulário configurado.</p>
        <p className="text-sm mt-1">O administrador precisa configurar os campos em Calibrador Feedback Corretor.</p>
      </div>
    );
  }

  const updateResposta = (fieldId: string, value: any) => {
    setRespostas(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = () => {
    if (!user?.id) return;
    createFeedback.mutate({
      ficha_visita_id: fichaVisitaId,
      corretor_id: user.id,
      respostas,
      notas_gerais: notasGerais || null,
      proximos_passos: proximosPassos || null,
    }, { onSuccess });
  };

  const renderField = (field: FeedbackCorretorField) => {
    const value = respostas[field.field_id];

    switch (field.field_type) {
      case "rating":
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{field.label} {field.is_required && <span className="text-destructive">*</span>}</Label>
              <Badge variant="outline" className="text-xs">{value || 0}/5</Badge>
            </div>
            <Slider
              min={1}
              max={5}
              step={1}
              value={[value || 3]}
              onValueChange={([v]) => updateResposta(field.field_id, v)}
              className="w-full"
            />
          </div>
        );
      case "select": {
        const options = Array.isArray(field.options) ? field.options : [];
        return (
          <div className="space-y-1.5">
            <Label className="text-sm">{field.label} {field.is_required && <span className="text-destructive">*</span>}</Label>
            <Select value={value || ""} onValueChange={(v) => updateResposta(field.field_id, v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!value}
              onCheckedChange={(v) => updateResposta(field.field_id, v)}
            />
            <Label className="text-sm">{field.label}</Label>
          </div>
        );
      case "textarea":
        return (
          <div className="space-y-1.5">
            <Label className="text-sm">{field.label} {field.is_required && <span className="text-destructive">*</span>}</Label>
            <Textarea
              value={value || ""}
              onChange={(e) => updateResposta(field.field_id, e.target.value)}
              rows={3}
              placeholder={`Digite ${field.label.toLowerCase()}...`}
            />
          </div>
        );
      default: // text
        return (
          <div className="space-y-1.5">
            <Label className="text-sm">{field.label} {field.is_required && <span className="text-destructive">*</span>}</Label>
            <Input
              value={value || ""}
              onChange={(e) => updateResposta(field.field_id, e.target.value)}
              placeholder={`Digite ${field.label.toLowerCase()}...`}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {config.sections.map((section) => {
        const fields = config.fields.filter(f => f.section_id === section.section_id);
        if (!fields.length) return null;
        return (
          <Card key={section.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{section.title}</CardTitle>
              {section.description && (
                <p className="text-xs text-muted-foreground">{section.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field) => (
                <div key={field.id}>{renderField(field)}</div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Observações Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Notas Gerais</Label>
            <Textarea
              value={notasGerais}
              onChange={(e) => setNotasGerais(e.target.value)}
              rows={3}
              placeholder="Observações gerais sobre a visita..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Próximos Passos</Label>
            <Textarea
              value={proximosPassos}
              onChange={(e) => setProximosPassos(e.target.value)}
              rows={2}
              placeholder="Ações recomendadas..."
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={createFeedback.isPending} className="w-full gap-2">
        {createFeedback.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Registrar Feedback
      </Button>
    </div>
  );
}
