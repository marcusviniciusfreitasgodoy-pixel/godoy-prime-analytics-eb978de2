import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  History, 
  Search, 
  FileDown, 
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
  MapPin,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Valuation {
  id: string;
  created_at: string;
  logradouro: string;
  numero: string | null;
  bairro: string;
  property_area_m2: number;
  property_type: string | null;
  final_value_min: number;
  final_value_med: number;
  final_value_max: number;
  confidence_level: string;
  confidence_score: number;
  total_adjustment: number;
  spread_percentage: number;
  documentation_status: string;
  recommendation_title: string | null;
  trend_direction: string | null;
  trend_percentage: number | null;
  pdf_generated: boolean | null;
}

export default function HistoricoAvaliacoes() {
  const { user, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: avaliacoes, isLoading } = useQuery({
    queryKey: ["avaliacoes-historico", user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("valuations")
        .select("*")
        .order("created_at", { ascending: false });
      
      // Se não for admin, filtrar apenas avaliações do usuário
      if (!isAdmin && user?.id) {
        query = query.eq("user_id", user.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Valuation[];
    },
    enabled: !!user?.id,
  });

  const filteredAvaliacoes = avaliacoes?.filter(av => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      av.logradouro.toLowerCase().includes(term) ||
      av.bairro.toLowerCase().includes(term) ||
      av.numero?.toLowerCase().includes(term)
    );
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getConfidenceBadge = (level: string) => {
    switch (level) {
      case "green":
        return <Badge className="bg-emerald-500">Alta</Badge>;
      case "yellow_high":
        return <Badge className="bg-amber-500">Média-Alta</Badge>;
      case "yellow":
        return <Badge className="bg-yellow-500">Média</Badge>;
      case "red":
        return <Badge variant="destructive">Baixa</Badge>;
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  const TrendIcon = ({ direction }: { direction: string | null }) => {
    if (direction === "UP") return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (direction === "DOWN") return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  // Estatísticas
  const stats = {
    total: avaliacoes?.length || 0,
    thisMonth: avaliacoes?.filter(av => {
      const date = new Date(av.created_at);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length || 0,
    avgValue: avaliacoes?.length 
      ? avaliacoes.reduce((sum, av) => sum + av.final_value_med, 0) / avaliacoes.length 
      : 0,
    highConfidence: avaliacoes?.filter(av => av.confidence_level === "green").length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <History className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Histórico de Avaliações</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {isAdmin ? "Todas as avaliações realizadas" : "Suas avaliações realizadas"}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-muted-foreground">Este Mês</p>
            </div>
            <p className="text-2xl font-bold">{stats.thisMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <p className="text-sm text-muted-foreground">Valor Médio</p>
            </div>
            <p className="text-xl font-bold">{formatCurrency(stats.avgValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-muted-foreground">Alta Confiança</p>
            </div>
            <p className="text-2xl font-bold">{stats.highConfidence}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">Avaliações Realizadas</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAvaliacoes && filteredAvaliacoes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Data</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Área</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Confiança</TableHead>
                    <TableHead className="text-center hidden lg:table-cell">Trend</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAvaliacoes.map((av) => (
                    <TableRow key={av.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(av.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">
                              {av.logradouro}{av.numero ? `, ${av.numero}` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">{av.bairro}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{av.property_area_m2} m²</TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {formatCurrency(av.final_value_med)}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {getConfidenceBadge(av.confidence_level)}
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-1">
                          <TrendIcon direction={av.trend_direction} />
                          {av.trend_percentage && (
                            <span className="text-xs">
                              {av.trend_percentage > 0 ? "+" : ""}{av.trend_percentage.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {av.documentation_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "Nenhuma avaliação encontrada com esse filtro" : "Nenhuma avaliação realizada ainda"}
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.href = "/avaliacao-imobiliaria"}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Realizar Nova Avaliação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            <strong>Legenda:</strong> Confiança indica a precisão estimada da avaliação. 
            Trend mostra a tendência de mercado na região comparando anúncios vs transações ITBI.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
