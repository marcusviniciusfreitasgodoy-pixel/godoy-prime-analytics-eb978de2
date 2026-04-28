import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Plus, Pencil, Trash2, Save, ListChecks, Lock, CalendarCheck, MessageSquare, ClipboardCheck, FileText } from "lucide-react";
import { useFormConfig, TipoFormulario, FormConfigSection, FormConfigField } from "@/hooks/useFormConfig";

const FIELD_TYPES = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "rating", label: "Nota 1-5" },
  { value: "select", label: "Seleção" },
  { value: "radio", label: "Radio (escolha única)" },
  { value: "checkbox", label: "Checkbox" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data/hora" },
  { value: "email", label: "Email" },
  { value: "telefone", label: "Telefone" },
];

const TAB_CONFIG: { value: TipoFormulario; label: string; icon: any }[] = [
  { value: "ficha_visita", label: "Ficha de Visita", icon: CalendarCheck },
  { value: "feedback_cliente", label: "Feedback Cliente", icon: MessageSquare },
  { value: "feedback_corretor", label: "Feedback Corretor", icon: ClipboardCheck },
  { value: "proposta_compra", label: "Proposta de Compra", icon: FileText },
];

function FormConfigTab({ tipoFormulario }: { tipoFormulario: TipoFormulario }) {
  const {
    data, isLoading,
    createSection, updateSection, deleteSection,
    createField, updateField, deleteField,
  } = useFormConfig(tipoFormulario);

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [deleteSectionDialogOpen, setDeleteSectionDialogOpen] = useState(false);
  const [deleteFieldDialogOpen, setDeleteFieldDialogOpen] = useState(false);

  const [editingSection, setEditingSection] = useState<FormConfigSection | null>(null);
  const [editingField, setEditingField] = useState<FormConfigField | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<FormConfigSection | null>(null);
  const [fieldToDelete, setFieldToDelete] = useState<FormConfigField | null>(null);

  const [sectionForm, setSectionForm] = useState({ section_id: "", title: "", description: "" });
  const [fieldForm, setFieldForm] = useState({ field_id: "", label: "", field_type: "text", options: "", is_required: false, placeholder: "", help_text: "" });

  const sections = useMemo(() => {
    if (!data?.sections) return [];
    return [...data.sections].sort((a, b) => a.display_order - b.display_order);
  }, [data?.sections]);

  const getFieldsForSection = (sectionId: string) => {
    if (!data?.fields) return [];
    return data.fields.filter(f => f.section_id === sectionId).sort((a, b) => a.display_order - b.display_order);
  };

  const openAddSection = () => {
    setEditingSection(null);
    setSectionForm({ section_id: "", title: "", description: "" });
    setSectionDialogOpen(true);
  };

  const openEditSection = (section: FormConfigSection) => {
    setEditingSection(section);
    setSectionForm({ section_id: section.section_id, title: section.title, description: section.description || "" });
    setSectionDialogOpen(true);
  };

  const openAddField = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setEditingField(null);
    setFieldForm({ field_id: "", label: "", field_type: "text", options: "", is_required: false, placeholder: "", help_text: "" });
    setFieldDialogOpen(true);
  };

  const openEditField = (field: FormConfigField) => {
    setSelectedSectionId(field.section_id);
    setEditingField(field);
    const opts = Array.isArray(field.options) ? field.options.join(", ") : "";
    setFieldForm({
      field_id: field.field_id,
      label: field.label,
      field_type: field.field_type,
      options: opts,
      is_required: field.is_required,
      placeholder: field.placeholder || "",
      help_text: field.help_text || "",
    });
    setFieldDialogOpen(true);
  };

  const handleSaveSection = async () => {
    const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.display_order)) : 0;
    if (editingSection) {
      await updateSection.mutateAsync({ id: editingSection.id, title: sectionForm.title, description: sectionForm.description || null });
    } else {
      await createSection.mutateAsync({ ...sectionForm, description: sectionForm.description || null, display_order: maxOrder + 1, is_active: true });
    }
    setSectionDialogOpen(false);
  };

  const handleSaveField = async () => {
    if (!selectedSectionId) return;
    const fields = getFieldsForSection(selectedSectionId);
    const maxOrder = fields.length > 0 ? Math.max(...fields.map(f => f.display_order)) : 0;
    const needsOptions = ["select", "radio", "checkbox"].includes(fieldForm.field_type);
    const parsedOptions = needsOptions && fieldForm.options
      ? fieldForm.options.split(",").map(o => o.trim()).filter(Boolean)
      : null;

    if (editingField) {
      await updateField.mutateAsync({
        id: editingField.id,
        label: fieldForm.label,
        field_type: fieldForm.field_type,
        options: parsedOptions,
        is_required: fieldForm.is_required,
        placeholder: fieldForm.placeholder || null,
        help_text: fieldForm.help_text || null,
      });
    } else {
      await createField.mutateAsync({
        field_id: fieldForm.field_id,
        section_id: selectedSectionId,
        label: fieldForm.label,
        field_type: fieldForm.field_type,
        options: parsedOptions,
        is_required: fieldForm.is_required,
        is_locked: false,
        display_order: maxOrder + 1,
        is_active: true,
        placeholder: fieldForm.placeholder || null,
        help_text: fieldForm.help_text || null,
      });
    }
    setFieldDialogOpen(false);
  };

  const handleDeleteSection = async () => {
    if (sectionToDelete) {
      await deleteSection.mutateAsync(sectionToDelete.id);
      setSectionToDelete(null);
      setDeleteSectionDialogOpen(false);
    }
  };

  const handleDeleteField = async () => {
    if (fieldToDelete) {
      await deleteField.mutateAsync(fieldToDelete.id);
      setFieldToDelete(null);
      setDeleteFieldDialogOpen(false);
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="gap-1"><ListChecks className="h-3 w-3" /> {sections.length} seções</Badge>
            <Button onClick={openAddSection} size="sm" className="gap-1"><Plus className="h-4 w-4" /> Nova Seção</Button>
          </div>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma seção configurada.</p>
              <p className="text-sm mt-1">Clique em "Nova Seção" para começar.</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {sections.map((section) => {
                const fields = getFieldsForSection(section.section_id);
                return (
                  <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-medium">{section.title}</span>
                        <Badge variant="secondary">{fields.length} campos</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-2 mt-2">
                        {fields.map((field) => (
                          <div key={field.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg group">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">{field.label}</p>
                                <Badge variant="outline" className="text-[10px]">{FIELD_TYPES.find(t => t.value === field.field_type)?.label || field.field_type}</Badge>
                                {field.is_required && <Badge variant="destructive" className="text-[10px]">Obrigatório</Badge>}
                                {field.is_locked && <Badge variant="secondary" className="text-[10px] gap-0.5"><Lock className="h-2.5 w-2.5" /> Sistema</Badge>}
                              </div>
                              {field.options && Array.isArray(field.options) && field.options.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">Opções: {field.options.join(", ")}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditField(field)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {!field.is_locked && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setFieldToDelete(field); setDeleteFieldDialogOpen(true); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 pt-2">
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => openAddField(section.section_id)}>
                            <Plus className="h-3.5 w-3.5" /> Adicionar Campo
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEditSection(section)}>
                            <Pencil className="h-3.5 w-3.5" /> Editar Seção
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => { setSectionToDelete(section); setDeleteSectionDialogOpen(true); }}>
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSection ? "Editar Seção" : "Nova Seção"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ID da Seção</Label>
              <Input placeholder="ex: dados_adicionais" value={sectionForm.section_id} onChange={(e) => setSectionForm({ ...sectionForm, section_id: e.target.value })} disabled={!!editingSection} />
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input placeholder="ex: Dados Adicionais" value={sectionForm.title} onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea placeholder="Descrição da seção..." value={sectionForm.description} onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSection} disabled={!sectionForm.section_id || !sectionForm.title}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Dialog */}
      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingField ? "Editar Campo" : "Novo Campo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ID do Campo</Label>
              <Input placeholder="ex: observacao_extra" value={fieldForm.field_id} onChange={(e) => setFieldForm({ ...fieldForm, field_id: e.target.value })} disabled={!!editingField} />
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input placeholder="ex: Observação Extra" value={fieldForm.label} onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Campo</Label>
              <Select value={fieldForm.field_type} onValueChange={(v) => setFieldForm({ ...fieldForm, field_type: v })} disabled={editingField?.is_locked}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Placeholder (opcional)</Label>
              <Input placeholder="Texto de placeholder" value={fieldForm.placeholder} onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Texto de ajuda (opcional)</Label>
              <Input placeholder="Texto de ajuda abaixo do campo" value={fieldForm.help_text} onChange={(e) => setFieldForm({ ...fieldForm, help_text: e.target.value })} />
            </div>
            {["select", "radio", "checkbox"].includes(fieldForm.field_type) && (
              <div className="space-y-2">
                <Label>Opções (separadas por vírgula)</Label>
                <Input placeholder="ex: opção 1, opção 2, opção 3" value={fieldForm.options} onChange={(e) => setFieldForm({ ...fieldForm, options: e.target.value })} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={fieldForm.is_required} onCheckedChange={(v) => setFieldForm({ ...fieldForm, is_required: v })} />
              <Label>Campo obrigatório</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveField} disabled={!fieldForm.field_id || !fieldForm.label}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section Dialog */}
      <AlertDialog open={deleteSectionDialogOpen} onOpenChange={setDeleteSectionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir seção?</AlertDialogTitle>
            <AlertDialogDescription>A seção "{sectionToDelete?.title}" será excluída permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSection} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Field Dialog */}
      <AlertDialog open={deleteFieldDialogOpen} onOpenChange={setDeleteFieldDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campo?</AlertDialogTitle>
            <AlertDialogDescription>O campo será excluído permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteField} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ConfigurarFormularios() {
  return (
    <>
      <Helmet><title>Configurar Formulários | Godoy Prime Analytics</title></Helmet>
      <div className="container mx-auto p-4 lg:p-6 space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" />
            Configurar Formulários
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seções e campos dos formulários de visita e feedback
          </p>
        </div>

        <Tabs defaultValue="ficha_visita" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {TAB_CONFIG.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {TAB_CONFIG.map(t => (
            <TabsContent key={t.value} value={t.value} className="mt-4">
              <FormConfigTab tipoFormulario={t.value} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
}
