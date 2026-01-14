import { useState, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, Plus, Pencil, Trash2, Home, Building, Save, RotateCcw, HelpCircle, Scale, ListChecks } from "lucide-react";
import { useAllVistoriaData, useCreateCategory, useUpdateCategory, useDeleteCategory, useCreateItem, useUpdateItem, useDeleteItem, VistoriaCategory, VistoriaItem } from "@/hooks/useVistoriaChecklist";

export default function CalibradorVistoria() {
  const { data, isLoading } = useAllVistoriaData();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const [activeTab, setActiveTab] = useState<'casa' | 'apartamento'>('casa');
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);

  const [editingCategory, setEditingCategory] = useState<VistoriaCategory | null>(null);
  const [editingItem, setEditingItem] = useState<VistoriaItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<VistoriaCategory | null>(null);
  const [itemToDelete, setItemToDelete] = useState<VistoriaItem | null>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ category_id: '', title: '', weight: 5, applies_to: 'casa' as string });
  const [itemForm, setItemForm] = useState({ item_id: '', label: '', tooltip: '' });

  const filteredCategories = useMemo(() => {
    if (!data?.categories) return [];
    return data.categories.filter(c => c.applies_to === activeTab).sort((a, b) => a.display_order - b.display_order);
  }, [data?.categories, activeTab]);

  const getItemsForCategory = (categoryId: string) => {
    if (!data?.items) return [];
    return data.items.filter(i => i.category_id === categoryId).sort((a, b) => a.display_order - b.display_order);
  };

  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ category_id: '', title: '', weight: 5, applies_to: activeTab });
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (category: VistoriaCategory) => {
    setEditingCategory(category);
    setCategoryForm({ category_id: category.category_id, title: category.title, weight: category.weight, applies_to: category.applies_to });
    setCategoryDialogOpen(true);
  };

  const openAddItem = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setEditingItem(null);
    setItemForm({ item_id: '', label: '', tooltip: '' });
    setItemDialogOpen(true);
  };

  const openEditItem = (item: VistoriaItem) => {
    setSelectedCategoryId(item.category_id);
    setEditingItem(item);
    setItemForm({ item_id: item.item_id, label: item.label, tooltip: item.tooltip || '' });
    setItemDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    const maxOrder = filteredCategories.length > 0 ? Math.max(...filteredCategories.map(c => c.display_order)) : 0;

    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, ...categoryForm });
    } else {
      await createCategory.mutateAsync({ ...categoryForm, display_order: maxOrder + 1, is_active: true });
    }
    setCategoryDialogOpen(false);
  };

  const handleSaveItem = async () => {
    if (!selectedCategoryId) return;
    const items = getItemsForCategory(selectedCategoryId);
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.display_order)) : 0;

    if (editingItem) {
      await updateItem.mutateAsync({ id: editingItem.id, ...itemForm, tooltip: itemForm.tooltip || null });
    } else {
      await createItem.mutateAsync({ ...itemForm, tooltip: itemForm.tooltip || null, category_id: selectedCategoryId, display_order: maxOrder + 1, is_active: true });
    }
    setItemDialogOpen(false);
  };

  const handleDeleteCategory = async () => {
    if (categoryToDelete) {
      await deleteCategory.mutateAsync(categoryToDelete.id);
      setCategoryToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteItem = async () => {
    if (itemToDelete) {
      await deleteItem.mutateAsync(itemToDelete.id);
      setItemToDelete(null);
      setDeleteItemDialogOpen(false);
    }
  };

  const handleWeightChange = async (category: VistoriaCategory, newWeight: number) => {
    await updateCategory.mutateAsync({ id: category.id, weight: newWeight });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 lg:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  const totalWeight = filteredCategories.reduce((sum, c) => sum + c.weight, 0);

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-primary" />
            Calibrador de Vistorias
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure os itens do checklist de inspeção de imóveis
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'casa' | 'apartamento')}>
              <TabsList>
                <TabsTrigger value="casa" className="gap-2">
                  <Home className="h-4 w-4" /> Casa
                </TabsTrigger>
                <TabsTrigger value="apartamento" className="gap-2">
                  <Building className="h-4 w-4" /> Apartamento
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-1">
                <Scale className="h-3 w-3" /> Peso Total: {totalWeight}%
              </Badge>
              <Badge variant="outline" className="gap-1">
                <ListChecks className="h-3 w-3" /> {filteredCategories.length} categorias
              </Badge>
              <Button onClick={openAddCategory} size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Nova Categoria
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {filteredCategories.map((category) => {
              const items = getItemsForCategory(category.id);
              return (
                <AccordionItem key={category.id} value={category.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center justify-between w-full pr-4">
                      <span className="font-medium">{category.title}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{items.length} itens</Badge>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground">Peso:</Label>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            value={category.weight}
                            onChange={(e) => handleWeightChange(category, Number(e.target.value))}
                            className="w-16 h-7 text-center"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-2 mt-2">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg group">
                          <div className="flex-1">
                            <p className="text-sm">{item.label}</p>
                            {item.tooltip && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <HelpCircle className="h-3 w-3" /> {item.tooltip}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditItem(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setItemToDelete(item); setDeleteItemDialogOpen(true); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 pt-2">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => openAddItem(category.id)}>
                          <Plus className="h-3.5 w-3.5" /> Adicionar Item
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEditCategory(category)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar Categoria
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => { setCategoryToDelete(category); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ID da Categoria</Label>
              <Input placeholder="ex: fundacoes" value={categoryForm.category_id} onChange={(e) => setCategoryForm({ ...categoryForm, category_id: e.target.value })} disabled={!!editingCategory} />
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input placeholder="ex: 1. Fundações e Estrutura" value={categoryForm.title} onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Peso (%)</Label>
                <Input type="number" min={1} max={20} value={categoryForm.weight} onChange={(e) => setCategoryForm({ ...categoryForm, weight: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Imóvel</Label>
                <Select value={categoryForm.applies_to} onValueChange={(v) => setCategoryForm({ ...categoryForm, applies_to: v })} disabled={!!editingCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="apartamento">Apartamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCategory} disabled={!categoryForm.category_id || !categoryForm.title}>
              <Save className="h-4 w-4 mr-2" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ID do Item</Label>
              <Input placeholder="ex: trincas" value={itemForm.item_id} onChange={(e) => setItemForm({ ...itemForm, item_id: e.target.value })} disabled={!!editingItem} />
            </div>
            <div className="space-y-2">
              <Label>Descrição do Item</Label>
              <Textarea placeholder="ex: Trincas ou fissuras grandes (>3mm) em paredes" value={itemForm.label} onChange={(e) => setItemForm({ ...itemForm, label: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Dica (opcional)</Label>
              <Input placeholder="ex: Observe atentamente a base das paredes" value={itemForm.tooltip} onChange={(e) => setItemForm({ ...itemForm, tooltip: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem} disabled={!itemForm.item_id || !itemForm.label}>
              <Save className="h-4 w-4 mr-2" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              A categoria "{categoryToDelete?.title}" e todos os seus itens serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              O item será excluído permanentemente do checklist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
