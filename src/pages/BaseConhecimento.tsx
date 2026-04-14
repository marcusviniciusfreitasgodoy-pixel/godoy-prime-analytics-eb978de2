import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Search, Book, FileText, Scale, TrendingUp, Brain, Loader2 } from "lucide-react";
import sofiaAvatar from "@/assets/sofia-avatar.png";
import CSVImportButton from "@/components/knowledge/CSVImportButton";

const CATEGORIES = [
  { value: "documentacao", label: "Documentação", icon: FileText },
  { value: "legislacao", label: "Legislação", icon: Scale },
  { value: "avaliacao", label: "Avaliação", icon: TrendingUp },
  { value: "mercado", label: "Mercado", icon: Brain },
  { value: "financiamento", label: "Financiamento", icon: Book },
  { value: "contratos", label: "Contratos", icon: FileText },
  { value: "due_diligence", label: "Due Diligence", icon: Search },
];

interface KnowledgeArticle {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[] | null;
  source: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function BaseConhecimento() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [formData, setFormData] = useState({
    category: "documentacao",
    title: "",
    content: "",
    keywords: "",
    source: "",
    is_active: true,
  });
  
  const queryClient = useQueryClient();

  const { data: articles, isLoading } = useQuery({
    queryKey: ['sofia-knowledge-base'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sofia_knowledge_base')
        .select('*')
        .order('category')
        .order('title');
      
      if (error) throw error;
      return data as KnowledgeArticle[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('sofia_knowledge_base').insert({
        category: data.category,
        title: data.title,
        content: data.content,
        keywords: data.keywords ? data.keywords.split(',').map(k => k.trim()) : [],
        source: data.source || null,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sofia-knowledge-base'] });
      toast.success("Artigo criado com sucesso!");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao criar artigo: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from('sofia_knowledge_base').update({
        category: data.category,
        title: data.title,
        content: data.content,
        keywords: data.keywords ? data.keywords.split(',').map(k => k.trim()) : [],
        source: data.source || null,
        is_active: data.is_active,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sofia-knowledge-base'] });
      toast.success("Artigo atualizado!");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sofia_knowledge_base').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sofia-knowledge-base'] });
      toast.success("Artigo excluído!");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('sofia_knowledge_base').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sofia-knowledge-base'] });
    }
  });

  const resetForm = () => {
    setFormData({
      category: "documentacao",
      title: "",
      content: "",
      keywords: "",
      source: "",
      is_active: true,
    });
    setEditingArticle(null);
  };

  const handleEdit = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    setFormData({
      category: article.category,
      title: article.title,
      content: article.content,
      keywords: article.keywords?.join(', ') || '',
      source: article.source || '',
      is_active: article.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredArticles = articles?.filter(article => {
    const matchesSearch = !searchTerm || 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: articles?.length || 0,
    active: articles?.filter(a => a.is_active).length || 0,
    byCategory: CATEGORIES.map(cat => ({
      ...cat,
      count: articles?.filter(a => a.category === cat.value).length || 0
    }))
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={sofiaAvatar} alt="Sofia" className="w-14 h-14 rounded-full border-4 border-accent/20" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Base de Conhecimento</h1>
            <p className="text-muted-foreground">Gerencie o conhecimento da Sofia</p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Artigo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingArticle ? "Editar Artigo" : "Novo Artigo"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={formData.is_active} 
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))} 
                  />
                  <Label>Ativo</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Título</Label>
                <Input 
                  value={formData.title} 
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título do artigo"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea 
                  value={formData.content} 
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Conteúdo completo do artigo..."
                  rows={10}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Palavras-chave (separadas por vírgula)</Label>
                <Input 
                  value={formData.keywords} 
                  onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="certidão, ônus, registro, imóvel"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Fonte (opcional)</Label>
                <Input 
                  value={formData.source} 
                  onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                  placeholder="Lei nº 6.015/1973, Art. 167"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingArticle ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {stats.byCategory.map(cat => {
          const Icon = cat.icon;
          return (
            <Card 
              key={cat.value} 
              className={`cursor-pointer transition-all ${categoryFilter === cat.value ? 'ring-2 ring-accent' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === cat.value ? 'all' : cat.value)}
            >
              <CardContent className="p-3 text-center">
                <Icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold text-foreground">{cat.count}</p>
                <p className="text-xs text-muted-foreground">{cat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por título ou conteúdo..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{stats.total} artigos</Badge>
              <Badge variant="secondary">{stats.active} ativos</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Articles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Artigos da Base de Conhecimento</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="hidden md:table-cell">Keywords</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles?.map(article => {
                    const category = CATEGORIES.find(c => c.value === article.category);
                    return (
                      <TableRow key={article.id}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {category?.label || article.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {article.title}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {article.keywords?.slice(0, 3).map((kw, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {kw}
                              </Badge>
                            ))}
                            {(article.keywords?.length || 0) > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{(article.keywords?.length || 0) - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch 
                            checked={article.is_active ?? true}
                            onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: article.id, is_active: checked })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(article)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm('Excluir este artigo?')) {
                                  deleteMutation.mutate(article.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
