import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Eye, 
  Wrench, 
  Sofa, 
  Shield, 
  LayoutGrid,
  FileText,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Pencil
} from "lucide-react";
import { toast } from "sonner";
import { useValuationCharacteristics, useDocumentationFactors } from "@/hooks/useValuationCharacteristics";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  A: Eye,
  B: Wrench,
  C: Sofa,
  D: Shield,
  E: LayoutGrid,
};

const CATEGORY_COLORS: Record<string, string> = {
  A: "text-blue-600 bg-blue-50",
  B: "text-orange-600 bg-orange-50",
  C: "text-purple-600 bg-purple-50",
  D: "text-green-600 bg-green-50",
  E: "text-pink-600 bg-pink-50",
};

const CATEGORY_NAMES: Record<string, string> = {
  A: "Posição / Vista / Luminosidade",
  B: "Conservação / Modernização",
  C: "Conforto / Amenidades",
  D: "Segurança / Acesso",
  E: "Funcionalidade / Layout",
};

interface NewCharacteristic {
  char_name: string;
  char_description: string;
  char_type: "positive" | "negative";
  category: string;
  weight_value: number;
}

export default function CalibradorAvaliacao() {
  const { data: characteristics, isLoading: loadingChars, refetch: refetchChars } = useValuationCharacteristics();
  const { data: docFactors, isLoading: loadingDocs, refetch: refetchDocs } = useDocumentationFactors();
  
  const [editedWeights, setEditedWeights] = useState<Record<string, number>>({});
  const [editedDocFactors, setEditedDocFactors] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("A");
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [newChar, setNewChar] = useState<NewCharacteristic>({
    char_name: "",
    char_description: "",
    char_type: "positive",
    category: "A",
    weight_value: 0.02,
  });
  const [editChar, setEditChar] = useState<NewCharacteristic & { id: string }>({
    id: "",
    char_name: "",
    char_description: "",
    char_type: "positive",
    category: "A",
    weight_value: 0.02,
  });

  const handleWeightChange = (charId: string, value: string) => {
    const numValue = parseFloat(value) / 100;
    setEditedWeights(prev => ({ ...prev, [charId]: numValue }));
  };

  const handleDocFactorChange = (factorId: string, value: string) => {
    const numValue = parseFloat(value) / 100;
    setEditedDocFactors(prev => ({ ...prev, [factorId]: numValue }));
  };

  const getWeight = (charId: string, originalWeight: number) => {
    return editedWeights[charId] !== undefined ? editedWeights[charId] : originalWeight;
  };

  const getDocFactor = (factorId: string, originalFactor: number | null) => {
    return editedDocFactors[factorId] !== undefined ? editedDocFactors[factorId] : (originalFactor || 1);
  };

  const hasChanges = Object.keys(editedWeights).length > 0 || Object.keys(editedDocFactors).length > 0;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Salvar pesos de características
      for (const [charId, weight] of Object.entries(editedWeights)) {
        const { error } = await supabase
          .from("valuation_characteristics")
          .update({ weight_value: weight })
          .eq("id", charId);
        
        if (error) throw error;
      }

      // Salvar fatores de documentação
      for (const [factorId, factor] of Object.entries(editedDocFactors)) {
        const { error } = await supabase
          .from("valuation_documentation_factors")
          .update({ factor })
          .eq("id", factorId);
        
        if (error) throw error;
      }

      toast.success("Configurações salvas com sucesso!");
      setEditedWeights({});
      setEditedDocFactors({});
      refetchChars();
      refetchDocs();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEditedWeights({});
    setEditedDocFactors({});
    toast.info("Alterações descartadas");
  };

  // Adicionar nova característica
  const handleAddCharacteristic = async () => {
    if (!newChar.char_name.trim()) {
      toast.error("Nome da característica é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      const categoryChars = characteristics?.filter(c => c.category === newChar.category) || [];
      const maxOrder = categoryChars.length > 0 
        ? Math.max(...categoryChars.map(c => c.display_order)) 
        : 0;
      
      const firstCategoryChar = categoryChars[0];
      
      const { error } = await supabase
        .from("valuation_characteristics")
        .insert({
          char_name: newChar.char_name,
          char_description: newChar.char_description,
          char_type: newChar.char_type,
          category: newChar.category,
          category_name: CATEGORY_NAMES[newChar.category],
          weight_value: newChar.weight_value,
          char_code: `${newChar.category}${maxOrder + 1}`,
          display_order: maxOrder + 1,
          category_cap_min: firstCategoryChar?.category_cap_min || -0.15,
          category_cap_max: firstCategoryChar?.category_cap_max || 0.15,
          is_active: true,
        });

      if (error) throw error;

      toast.success("Característica adicionada com sucesso!");
      setShowAddModal(false);
      setNewChar({
        char_name: "",
        char_description: "",
        char_type: "positive",
        category: activeTab || "A",
        weight_value: 0.02,
      });
      refetchChars();
    } catch (error) {
      console.error("Erro ao adicionar:", error);
      toast.error("Erro ao adicionar característica");
    } finally {
      setIsSaving(false);
    }
  };

  // Editar característica existente
  const handleEditCharacteristic = async () => {
    if (!editChar.char_name.trim()) {
      toast.error("Nome da característica é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("valuation_characteristics")
        .update({
          char_name: editChar.char_name,
          char_description: editChar.char_description,
          char_type: editChar.char_type,
          weight_value: editChar.weight_value,
        })
        .eq("id", editChar.id);

      if (error) throw error;

      toast.success("Característica atualizada com sucesso!");
      setShowEditModal(false);
      refetchChars();
    } catch (error) {
      console.error("Erro ao editar:", error);
      toast.error("Erro ao atualizar característica");
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir característica
  const handleDeleteCharacteristic = async () => {
    if (!selectedCharId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("valuation_characteristics")
        .delete()
        .eq("id", selectedCharId);

      if (error) throw error;

      toast.success("Característica excluída com sucesso!");
      setShowDeleteModal(false);
      setSelectedCharId(null);
      refetchChars();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir característica");
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (char: any) => {
    setEditChar({
      id: char.id,
      char_name: char.char_name,
      char_description: char.char_description || "",
      char_type: char.char_type,
      category: char.category,
      weight_value: char.weight_value,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (charId: string) => {
    setSelectedCharId(charId);
    setShowDeleteModal(true);
  };

  if (loadingChars || loadingDocs) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Agrupar características por categoria
  const groupedChars = characteristics?.reduce((acc, char) => {
    if (!acc[char.category]) {
      acc[char.category] = [];
    }
    acc[char.category].push(char);
    return acc;
  }, {} as Record<string, typeof characteristics>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calibrador de Avaliação</h1>
            <p className="text-muted-foreground">
              Configure os pesos das 35 características e fatores de documentação
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {hasChanges && (
            <>
              <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Descartar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </>
          )}
        </div>
      </div>

      {hasChanges && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              Você tem alterações não salvas. Clique em "Salvar Alterações" para aplicar.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full">
          {Object.keys(CATEGORY_NAMES).map((key) => {
            const Icon = CATEGORY_ICONS[key];
            return (
              <TabsTrigger key={key} value={key} className="flex flex-col gap-1 py-2">
                <Icon className={`h-4 w-4 ${CATEGORY_COLORS[key].split(' ')[0]}`} />
                <span className="text-xs">{key}</span>
              </TabsTrigger>
            );
          })}
          <TabsTrigger value="doc" className="flex flex-col gap-1 py-2">
            <FileText className="h-4 w-4 text-amber-600" />
            <span className="text-xs">Doc</span>
          </TabsTrigger>
        </TabsList>

        {/* Tabs de Características */}
        {Object.entries(groupedChars || {}).map(([category, chars]) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {(() => {
                    const Icon = CATEGORY_ICONS[category];
                    return Icon ? <Icon className={`h-5 w-5 ${CATEGORY_COLORS[category]?.split(' ')[0]}`} /> : null;
                  })()}
                  Categoria {category}: {CATEGORY_NAMES[category]}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {chars?.map((char) => {
                    const currentWeight = getWeight(char.id, char.weight_value);
                    const hasChanged = editedWeights[char.id] !== undefined;
                    
                    return (
                      <div 
                        key={char.id} 
                        className={`p-4 rounded-lg border ${hasChanged ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20' : 'bg-muted/30'}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{char.char_name}</span>
                              <Badge variant={char.char_type === "positive" ? "default" : "destructive"}>
                                {char.char_type === "positive" ? "Positivo" : "Negativo"}
                              </Badge>
                              {hasChanged && (
                                <Badge variant="outline" className="text-amber-600 border-amber-600">
                                  Modificado
                                </Badge>
                              )}
                            </div>
                            {char.char_description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {char.char_description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm whitespace-nowrap">Peso (%):</Label>
                            <Input
                              type="number"
                              step="0.5"
                              className="w-24"
                              value={(currentWeight * 100).toFixed(1)}
                              onChange={(e) => handleWeightChange(char.id, e.target.value)}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(char)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDeleteModal(char.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button variant="outline" className="mt-4" onClick={() => { setNewChar(prev => ({ ...prev, category })); setShowAddModal(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Característica
                </Button>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    <strong>Caps da categoria:</strong> Mín: {((chars?.[0]?.category_cap_min || 0) * 100).toFixed(0)}% / 
                    Máx: {((chars?.[0]?.category_cap_max || 0) * 100).toFixed(0)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        {/* Tab de Documentação */}
        <TabsContent value="doc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                Fatores de Documentação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                O fator de documentação é um multiplicador aplicado ao valor final da avaliação.
                Por exemplo, fator 0.95 significa -5% de desconto no valor.
              </p>
              
              <div className="grid gap-4">
                {docFactors?.map((factor) => {
                  const currentFactor = getDocFactor(factor.id, factor.factor);
                  const hasChanged = editedDocFactors[factor.id] !== undefined;
                  
                  return (
                    <div 
                      key={factor.id} 
                      className={`p-4 rounded-lg border ${hasChanged ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20' : 'bg-muted/30'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`w-3 h-3 rounded-full ${
                                factor.severity === "green"
                                  ? "bg-emerald-500"
                                  : factor.severity === "yellow"
                                  ? "bg-yellow-500"
                                  : factor.severity === "yellow_high"
                                  ? "bg-orange-500"
                                  : "bg-red-500"
                              }`}
                            />
                            <span className="font-medium">{factor.status_name}</span>
                            {hasChanged && (
                              <Badge variant="outline" className="text-amber-600 border-amber-600">
                                Modificado
                              </Badge>
                            )}
                          </div>
                          {factor.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {factor.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Ação: {factor.action_required}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm whitespace-nowrap">Fator (%):</Label>
                          <Input
                            type="number"
                            step="1"
                            className="w-24"
                            value={(currentFactor * 100).toFixed(0)}
                            onChange={(e) => handleDocFactorChange(factor.id, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resumo */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold">Resumo da Configuração</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total de Características</p>
              <p className="font-semibold text-lg">{characteristics?.length || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Características Positivas</p>
              <p className="font-semibold text-lg text-emerald-600">
                {characteristics?.filter(c => c.char_type === "positive").length || 0}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Características Negativas</p>
              <p className="font-semibold text-lg text-red-600">
                {characteristics?.filter(c => c.char_type === "negative").length || 0}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Fatores de Documentação</p>
              <p className="font-semibold text-lg">{docFactors?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal Adicionar */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Característica</DialogTitle>
            <DialogDescription>Preencha os dados da nova característica</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={newChar.char_name} onChange={(e) => setNewChar(prev => ({ ...prev, char_name: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={newChar.char_description} onChange={(e) => setNewChar(prev => ({ ...prev, char_description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={newChar.char_type} onValueChange={(v: "positive" | "negative") => setNewChar(prev => ({ ...prev, char_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positivo</SelectItem>
                    <SelectItem value="negative">Negativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Peso (%)</Label>
                <Input type="number" step="0.5" value={(newChar.weight_value * 100).toFixed(1)} onChange={(e) => setNewChar(prev => ({ ...prev, weight_value: parseFloat(e.target.value) / 100 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancelar</Button>
            <Button onClick={handleAddCharacteristic} disabled={isSaving}>{isSaving ? "Salvando..." : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Característica</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={editChar.char_name} onChange={(e) => setEditChar(prev => ({ ...prev, char_name: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={editChar.char_description} onChange={(e) => setEditChar(prev => ({ ...prev, char_description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={editChar.char_type} onValueChange={(v: "positive" | "negative") => setEditChar(prev => ({ ...prev, char_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positivo</SelectItem>
                    <SelectItem value="negative">Negativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Peso (%)</Label>
                <Input type="number" step="0.5" value={(editChar.weight_value * 100).toFixed(1)} onChange={(e) => setEditChar(prev => ({ ...prev, weight_value: parseFloat(e.target.value) / 100 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button>
            <Button onClick={handleEditCharacteristic} disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Excluir */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir esta característica? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteCharacteristic} disabled={isSaving}>{isSaving ? "Excluindo..." : "Excluir"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
