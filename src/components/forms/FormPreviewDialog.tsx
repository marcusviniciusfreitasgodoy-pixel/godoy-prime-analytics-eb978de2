import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { DynamicFieldRenderer } from "@/components/forms/DynamicFieldRenderer";
import type { FormConfigField, FormConfigSection, TipoFormulario } from "@/hooks/useFormConfig";

interface FormPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoFormulario: TipoFormulario;
  tipoLabel: string;
  sections: FormConfigSection[];
  fields: FormConfigField[];
}

const PROPOSTA_MODELOS = [
  { value: "simplificado", label: "Simplificado" },
  { value: "completo", label: "Completo" },
] as const;

export function FormPreviewDialog({
  open,
  onOpenChange,
  tipoFormulario,
  tipoLabel,
  sections,
  fields,
}: FormPreviewDialogProps) {
  const isProposta = tipoFormulario === "proposta_compra";
  const [modelo, setModelo] = useState<"simplificado" | "completo">("completo");
  const [values, setValues] = useState<Record<string, any>>({});

  const orderedSections = useMemo(
    () => [...sections].filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order),
    [sections]
  );

  const fieldsBySection = useMemo(() => {
    const map = new Map<string, FormConfigField[]>();
    for (const f of fields) {
      if (!f.is_active) continue;
      if (isProposta) {
        const m = Array.isArray(f.modelos) ? f.modelos : [];
        if (m.length > 0 && !m.includes(modelo)) continue;
      }
      const arr = map.get(f.section_id) || [];
      arr.push(f);
      map.set(f.section_id, arr);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => a.display_order - b.display_order);
      map.set(k, arr);
    }
    return map;
  }, [fields, isProposta, modelo]);

  const visibleSections = orderedSections.filter(s => (fieldsBySection.get(s.section_id)?.length ?? 0) > 0);
  const totalFields = Array.from(fieldsBySection.values()).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Pré-visualização — {tipoLabel}
          </DialogTitle>
          <DialogDescription>
            Esta é uma visualização do formulário ativo. Os valores digitados aqui não são salvos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
          <Badge variant="secondary">{visibleSections.length} seções</Badge>
          <Badge variant="secondary">{totalFields} campos visíveis</Badge>
          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
            Modo pré-visualização
          </Badge>
        </div>

        {isProposta && (
          <div className="space-y-2 py-2">
            <p className="text-sm font-medium">Modelo da proposta</p>
            <div className="flex gap-2">
              {PROPOSTA_MODELOS.map((m) => (
                <Button
                  key={m.value}
                  type="button"
                  size="sm"
                  variant={modelo === m.value ? "default" : "outline"}
                  onClick={() => setModelo(m.value as any)}
                >
                  {m.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6 py-2">
          {visibleSections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum campo ativo para exibir.
            </div>
          ) : (
            visibleSections.map((section) => {
              const sectionFields = fieldsBySection.get(section.section_id) || [];
              return (
                <div key={section.id} className="space-y-3 rounded-lg border p-4">
                  <div>
                    <h3 className="font-semibold text-base">{section.title}</h3>
                    {section.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                    )}
                  </div>
                  <div className="space-y-4">
                    {sectionFields.map((field) => (
                      <DynamicFieldRenderer
                        key={field.id}
                        field={field}
                        value={values[field.field_id]}
                        onChange={(v) => setValues((prev) => ({ ...prev, [field.field_id]: v }))}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}