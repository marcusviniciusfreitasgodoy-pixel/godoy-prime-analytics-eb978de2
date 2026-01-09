import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  ClipboardCheck, 
  Search, 
  Eye,
  Calendar,
  X,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Home
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Vistoria {
  id: string;
  created_at: string;
  logradouro: string;
  numero: string | null;
  bairro: string;
  nome_condominio: string | null;
  tipo_imovel: string | null;
  tipo_vistoria: string | null;
  area_m2: number | null;
  final_score: number | null;
  progress: number | null;
  critical_count: number | null;
  proprietario: string | null;
  vistoriador: string | null;
  data_vistoria: string | null;
  valor_avaliacao: number | null;
  valor_ajustado: number | null;
  ajuste_percentual: number | null;
  pdf_generated: boolean | null;
}

export default function HistoricoVistorias() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVistoria, setSelectedVistoria] = useState<Vistoria | null>(null);

  const { data: vistorias, isLoading } = useQuery({
    queryKey: ["vistorias-historico", user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("vistorias")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!isAdmin && user?.id) {
        query = query.eq("user_id", user.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Vistoria[];
    },
    enabled: !!user?.id,
  });

  const filteredVistorias = vistorias?.filter(v => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      v.logradouro.toLowerCase().includes(term) ||
      v.bairro.toLowerCase().includes(term) ||
      v.numero?.toLowerCase().includes(term) ||
      v.proprietario?.toLowerCase().includes(term)
    );
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getScoreBadge = (score: number | null) => {
    if (!score) return <Badge variant="secondary">Pendente</Badge>;
    if (score >= 80) return <Badge className="bg-emerald-500">Excelente</Badge>;
    if (score >= 60) return <Badge className="bg-green-500">Bom</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-500">Regular</Badge>;
    return <Badge variant="destructive">Crítico</Badge>;
  };

  const handleRowClick = (vistoria: Vistoria) => {
    setSelectedVistoria(vistoria);
  };

  const handleNovaVistoria = () => {
    navigate("/vistoria-digital");
  };

  // Stats
  const totalVistorias = vistorias?.length || 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const vistoriasThisMonth = vistorias?.filter(v => {
    const date = new Date(v.created_at);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).length || 0;
  const avgScore = vistorias?.reduce((acc, v) => acc + (v.final_score || 0), 0) / (totalVistorias || 1);
  const criticalItems = vistorias?.reduce((acc, v) => acc + (v.critical_count || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Histórico de Vistorias</h1>
            <p className="text-muted-foreground text-sm">Todas as vistorias digitais realizadas</p>
          </div>
        </div>
        <Button onClick={handleNovaVistoria}>
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Nova Vistoria
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <ClipboardCheck className="h-4 w-4" />
              Total
            </div>
            <p className="text-2xl font-bold">{totalVistorias}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="h-4 w-4" />
              Este Mês
            </div>
            <p className="text-2xl font-bold">{vistoriasThisMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Score Médio
            </div>
            <p className="text-2xl font-bold">{avgScore.toFixed(0)}/100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertTriangle className="h-4 w-4" />
              Itens Críticos
            </div>
            <p className="text-2xl font-bold text-destructive">{criticalItems}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Vistorias Realizadas</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredVistorias?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma vistoria encontrada</p>
              <Button variant="outline" className="mt-4" onClick={handleNovaVistoria}>
                Realizar primeira vistoria
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Críticos</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVistorias?.map((vistoria) => (
                    <TableRow 
                      key={vistoria.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(vistoria)}
                    >
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(vistoria.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {vistoria.tipo_vistoria === 'casa' ? (
                            <Home className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">{vistoria.logradouro}{vistoria.numero ? `, ${vistoria.numero}` : ''}</p>
                            <p className="text-xs text-muted-foreground">{vistoria.bairro}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{vistoria.tipo_vistoria || '-'}</TableCell>
                      <TableCell>{vistoria.area_m2 ? `${vistoria.area_m2} m²` : '-'}</TableCell>
                      <TableCell>{getScoreBadge(vistoria.final_score)}</TableCell>
                      <TableCell>
                        {vistoria.critical_count && vistoria.critical_count > 0 ? (
                          <Badge variant="destructive">{vistoria.critical_count}</Badge>
                        ) : (
                          <Badge variant="outline">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {vistoria.pdf_generated ? (
                          <Badge variant="outline" className="text-emerald-600">PDF gerado</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedVistoria} onOpenChange={() => setSelectedVistoria(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Detalhes da Vistoria
            </DialogTitle>
            <DialogDescription>
              Vistoria realizada em {selectedVistoria && format(new Date(selectedVistoria.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          {selectedVistoria && (
            <div className="space-y-6">
              {/* Property Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="font-medium">{selectedVistoria.logradouro}{selectedVistoria.numero ? `, ${selectedVistoria.numero}` : ''}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bairro</p>
                  <p className="font-medium">{selectedVistoria.bairro}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium capitalize">{selectedVistoria.tipo_vistoria || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Área</p>
                  <p className="font-medium">{selectedVistoria.area_m2 ? `${selectedVistoria.area_m2} m²` : '-'}</p>
                </div>
                {selectedVistoria.proprietario && (
                  <div>
                    <p className="text-sm text-muted-foreground">Proprietário</p>
                    <p className="font-medium">{selectedVistoria.proprietario}</p>
                  </div>
                )}
                {selectedVistoria.vistoriador && (
                  <div>
                    <p className="text-sm text-muted-foreground">Vistoriador</p>
                    <p className="font-medium">{selectedVistoria.vistoriador}</p>
                  </div>
                )}
              </div>

              {/* Score Card */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Score Final</p>
                      <p className="text-3xl font-bold text-primary">{selectedVistoria.final_score?.toFixed(0) || '-'}/100</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Progresso</p>
                      <p className="text-xl font-bold">{selectedVistoria.progress?.toFixed(0) || 0}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Itens Críticos</p>
                      <p className="text-xl font-bold text-destructive">{selectedVistoria.critical_count || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Valuation Impact */}
              {selectedVistoria.valor_avaliacao && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Impacto na Avaliação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Original</p>
                        <p className="font-bold">{formatCurrency(selectedVistoria.valor_avaliacao)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ajuste</p>
                        <p className={`font-bold ${(selectedVistoria.ajuste_percentual || 0) >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                          {(selectedVistoria.ajuste_percentual || 0) >= 0 ? '+' : ''}{(selectedVistoria.ajuste_percentual || 0).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Ajustado</p>
                        <p className="font-bold text-primary">{formatCurrency(selectedVistoria.valor_ajustado || 0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelectedVistoria(null)}>
                  <X className="mr-2 h-4 w-4" />
                  Fechar
                </Button>
                <Button onClick={() => navigate("/vistoria-digital")}>
                  <Eye className="mr-2 h-4 w-4" />
                  Nova Vistoria
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
