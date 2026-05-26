import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Calendar,
  ClipboardCheck,
  X,
  FileText,
  RefreshCw,
  HelpCircle,
  Trash2,
  CheckSquare,
  Target,
  Share2,
  Copy,
  Loader2
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { exportValuationEnginePDF } from "@/utils/valuationPdfExport";
import { uploadValuationPdfPublic } from "@/utils/valuationShareLink";
import type { ValuationState, HistoricalAnalysis, FutureProjection } from "@/types/valuation";
import type { ValuationResult } from "@/utils/valuationCalculations";
import { supabase } from "@/integrations/supabase/client";
import { GerarAutorizacaoButton } from "@/components/autorizacoes/GerarAutorizacaoButton";
import { useAutorizacoesByValuationIds } from "@/hooks/useAutorizacoes";
import { valuationRowToState } from "@/utils/autorizacaoMapper";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_AVALIACOES } from "@/data/demoData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface PricingStrategy {
  id: string;
  valor_itbi: number;
  estrategia_selecionada: string | null;
  estrategia_recomendada: string;
  preco_anuncio_atracao: number | null;
  preco_anuncio_mercado: number | null;
  preco_anuncio_premium: number | null;
  liquido_atracao: number | null;
  liquido_mercado: number | null;
  liquido_premium: number | null;
  status: string;
}

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
  documentation_factor?: number;
  documentation_notes?: string | null;
  recommendation_title: string | null;
  trend_direction: string | null;
  trend_percentage: number | null;
  pdf_generated: boolean | null;
  // Dados ITBI
  itbi_min_m2?: number;
  itbi_med_m2?: number;
  itbi_max_m2?: number;
  itbi_transaction_count?: number | null;
  // Dados Anúncio
  anuncio_min_m2?: number | null;
  anuncio_med_m2?: number | null;
  anuncio_max_m2?: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  anuncio_fontes?: any; // JSONB do banco - será parseado ao usar
  // Campos extras
  area_terreno_m2?: number | null;
  proporcao_terreno?: number | null;
  bonus_terreno?: number | null;
  base_price_selected?: string | null;
  auto_capped?: boolean | null;
  // Campos de identificação do imóvel
  complemento?: string | null;
  nome_condominio?: string | null;
  quartos?: number | null;
  suites?: number | null;
  banheiros?: number | null;
  vagas?: number | null;
  andar?: string | null;
  proprietario?: string | null;
  telefone?: string | null;
  observacoes_imovel?: string | null;
  // Estratégia de precificação vinculada
  pricing_strategies?: PricingStrategy[];
  // Tipo de avaliação
  tipo_avaliacao?: string | null;
}

// Função para gerar dados históricos sintéticos para o PDF
// Usa os dados salvos da avaliação para criar uma projeção visual
function generateSyntheticHistoricalAnalysis(valuation: Valuation, trendPercentage: number): HistoricalAnalysis {
  const currentYear = new Date().getFullYear();
  const medM2 = valuation.itbi_med_m2 || valuation.final_value_med / valuation.property_area_m2;
  
  // Calcular taxas baseadas no trend
  const probableRate = Math.max(3, Math.min(10, 6 + trendPercentage * 0.1));
  const optimisticRate = probableRate + 3;
  const pessimisticRate = Math.max(1, probableRate - 3);
  
  // Gerar dados anuais sintéticos (5 anos)
  const yearlyData = [];
  for (let i = 4; i >= 0; i--) {
    const year = currentYear - i;
    const factor = 1 - (i * (probableRate / 100));
    yearlyData.push({
      ano: year,
      transacoes: Math.max(5, Math.round((valuation.itbi_transaction_count || 20) * (0.8 + Math.random() * 0.4))),
      valorMedioM2: Math.round(medM2 * factor),
      valorMinM2: Math.round(medM2 * factor * 0.85),
      valorMaxM2: Math.round(medM2 * factor * 1.15),
    });
  }
  
  // Projeção futura
  const futureProjection: FutureProjection = {
    oneYear: {
      optimistic: 1 + optimisticRate / 100,
      probable: 1 + probableRate / 100,
      pessimistic: 1 + pessimisticRate / 100,
    },
    twoYears: {
      optimistic: Math.pow(1 + optimisticRate / 100, 2),
      probable: Math.pow(1 + probableRate / 100, 2),
      pessimistic: Math.pow(1 + pessimisticRate / 100, 2),
    },
    threeYears: {
      optimistic: Math.pow(1 + optimisticRate / 100, 3),
      probable: Math.pow(1 + probableRate / 100, 3),
      pessimistic: Math.pow(1 + pessimisticRate / 100, 3),
    },
    optimisticRate,
    probableRate,
    pessimisticRate,
    confidence: trendPercentage > 10 ? 'alta' : trendPercentage > 0 ? 'media' : 'baixa',
    disclaimer: 'Projeção estimada baseada em tendências históricas. Valores sujeitos a variações de mercado.',
  };
  
  return {
    yearlyData,
    transactionTrend: trendPercentage > 5 ? 'crescente' : trendPercentage < -5 ? 'decrescente' : 'estavel',
    priceTrend: trendPercentage > 5 ? 'alta' : trendPercentage < -5 ? 'baixa' : 'estavel',
    liquidityScore: Math.min(100, Math.max(20, valuation.confidence_score)),
    liquidityLevel: valuation.confidence_score > 60 ? 'alta' : valuation.confidence_score > 30 ? 'media' : 'baixa',
    transactionGrowth: trendPercentage * 0.5,
    priceGrowth: probableRate,
    diagnostico: trendPercentage > 5 
      ? 'Mercado em valorização. Região apresenta tendência positiva de preços.'
      : trendPercentage < -5
        ? 'Mercado em correção. Região apresenta ajuste nos preços.'
        : 'Mercado estável. Região apresenta equilíbrio entre oferta e demanda.',
    alertas: [],
    futureProjection,
  };
}

export default function HistoricoAvaliacoes() {
  const { isDemo } = useDemo();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedValuation, setSelectedValuation] = useState<Valuation | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: avaliacoes, isLoading } = useQuery({
    queryKey: ["avaliacoes-historico", user?.id, isAdmin],
    queryFn: async () => {
      if (isDemo) return DEMO_AVALIACOES as Valuation[];

      let query = supabase
        .from("valuations")
        .select(`
          *,
          pricing_strategies (
            id,
            valor_itbi,
            estrategia_selecionada,
            estrategia_recomendada,
            preco_anuncio_atracao,
            preco_anuncio_mercado,
            preco_anuncio_premium,
            liquido_atracao,
            liquido_mercado,
            liquido_premium,
            status
          )
        `)
        .order("created_at", { ascending: false });
      
      if (!isAdmin && user?.id) {
        query = query.eq("user_id", user.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Valuation[];
    },
    enabled: isDemo || !!user?.id,
    staleTime: isDemo ? Infinity : 0,
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

  // Indexar autorizações por valuation_id para mostrar "Ver Autorização" se já existir
  const valuationIds = (filteredAvaliacoes || []).map((a) => a.id);
  const { data: autorizacoesMap } = useAutorizacoesByValuationIds(valuationIds);

  // Funções de seleção
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!filteredAvaliacoes) return;
    if (selectedIds.size === filteredAvaliacoes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAvaliacoes.map(av => av.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      const idsArray = Array.from(selectedIds);
      
      // Primeiro deletar as estratégias de precificação associadas
      const { error: pricingError } = await supabase
        .from("pricing_strategies")
        .delete()
        .in("valuation_id", idsArray);
      
      if (pricingError) {
        console.error("Erro ao deletar estratégias:", pricingError);
      }
      
      // Depois deletar as respostas associadas
      const { error: responsesError } = await supabase
        .from("valuation_responses")
        .delete()
        .in("valuation_id", idsArray);
      
      if (responsesError) {
        console.error("Erro ao deletar respostas:", responsesError);
      }
      
      // Por fim deletar as avaliações
      const { error } = await supabase
        .from("valuations")
        .delete()
        .in("id", idsArray);
      
      if (error) throw error;
      
      toast.success(`${selectedIds.size} avaliação(ões) excluída(s) com sucesso`);
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["avaliacoes-historico"] });
    } catch (error) {
      console.error("Erro ao excluir avaliações:", error);
      toast.error("Erro ao excluir avaliações");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    try {
      // Primeiro deletar estratégia de precificação
      await supabase
        .from("pricing_strategies")
        .delete()
        .eq("valuation_id", id);
      
      // Depois deletar as respostas associadas
      await supabase
        .from("valuation_responses")
        .delete()
        .eq("valuation_id", id);
      
      // Por fim deletar a avaliação
      const { error } = await supabase
        .from("valuations")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Avaliação excluída com sucesso");
      setSelectedValuation(null);
      queryClient.invalidateQueries({ queryKey: ["avaliacoes-historico"] });
    } catch (error) {
      console.error("Erro ao excluir avaliação:", error);
      toast.error("Erro ao excluir avaliação");
    }
  };

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
        return <Badge className="bg-success text-success-foreground">Alta</Badge>;
      case "yellow_high":
        return <Badge className="bg-accent text-accent-foreground">Média-Alta</Badge>;
      case "yellow_medium":
        return <Badge className="bg-accent/80 text-accent-foreground">Média</Badge>;
      case "yellow":
        return <Badge className="bg-accent/80 text-accent-foreground">Média</Badge>;
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

  const handleRowClick = (valuation: Valuation) => {
    setSelectedValuation(valuation);
  };

  const handleGoToVistoria = () => {
    if (!selectedValuation) return;
    
    // Prepara dados para transferir para Vistoria Digital
    const vistoriaData = {
      logradouro: selectedValuation.logradouro,
      numero: selectedValuation.numero || "",
      complemento: "",
      bairro: selectedValuation.bairro,
      nomeCondominio: "",
      tipoImovel: selectedValuation.property_type || "",
      areaM2: selectedValuation.property_area_m2.toString(),
      quartos: "",
      suites: "",
      banheiros: "",
      vagas: "",
      proprietario: "",
      telefone: "",
      observacoes: "",
      // Dados da avaliação para referência
      avaliacaoData: {
        valorProvavel: selectedValuation.final_value_med,
        valorPessimista: selectedValuation.final_value_min,
        valorOtimista: selectedValuation.final_value_max,
        confidenceLevel: selectedValuation.confidence_level,
        dataAvaliacao: selectedValuation.created_at,
      }
    };

    toast.success("Dados transferidos para Vistoria Digital!");
    
    navigate("/vistoria-digital", {
      state: {
        fromAvaliacao: true,
        propertyData: vistoriaData
      }
    });
  };

  const handleExportPDF = (tipoOverride?: "simples" | "completa") => {
    if (!selectedValuation) return;

    // Cap de trend para evitar distorções (valores antigos salvos sem cap)
    const TREND_CAP = 50;
    let trendPercentage = selectedValuation.trend_percentage || 0;
    let trendWasCapped = false;
    
    if (Math.abs(trendPercentage) > TREND_CAP) {
      trendWasCapped = true;
      trendPercentage = trendPercentage > 0 ? TREND_CAP : -TREND_CAP;
    }

    // Reconstruir o state com todos os dados do imóvel salvos no banco
    const state: ValuationState = {
      numero: selectedValuation.numero || "",
      complemento: selectedValuation.complemento || "",
      nomeCondominio: selectedValuation.nome_condominio || "",
      condominioSelecionado: null,
      tipoImovel: selectedValuation.property_type || "",
      quartos: selectedValuation.quartos || 0,
      suites: selectedValuation.suites || 0,
      banheiros: selectedValuation.banheiros || 0,
      vagas: selectedValuation.vagas || 0,
      andar: selectedValuation.andar || "",
      proprietario: selectedValuation.proprietario || "",
      telefone: selectedValuation.telefone || "",
      proprietario_cpf: (selectedValuation as any).proprietario_cpf || "",
      proprietario_rg: (selectedValuation as any).proprietario_rg || "",
      proprietario_rg_orgao: (selectedValuation as any).proprietario_rg_orgao || "",
      proprietario_email: (selectedValuation as any).proprietario_email || "",
      cep: (selectedValuation as any).cep || "",
      cidade: (selectedValuation as any).cidade || "Rio de Janeiro",
      valor_condominio: (selectedValuation as any).valor_condominio || 0,
      valor_iptu: (selectedValuation as any).valor_iptu || 0,
      dataAvaliacao: selectedValuation.created_at.split('T')[0],
      observacoesImovel: selectedValuation.observacoes_imovel || "",
      logradouro: selectedValuation.logradouro,
      bairro: selectedValuation.bairro,
      itbiData: selectedValuation.itbi_transaction_count ? {
        min_m2: selectedValuation.itbi_min_m2 || 0,
        med_m2: selectedValuation.itbi_med_m2 || 0,
        max_m2: selectedValuation.itbi_max_m2 || 0,
        transaction_count: selectedValuation.itbi_transaction_count,
      } : null,
      anuncioData: selectedValuation.anuncio_med_m2 ? {
        min_m2: selectedValuation.anuncio_min_m2 || 0,
        med_m2: selectedValuation.anuncio_med_m2 || 0,
        max_m2: selectedValuation.anuncio_max_m2 || 0,
        fontes: selectedValuation.anuncio_fontes || [],
      } : null,
      area_m2: selectedValuation.property_area_m2,
      baseSelected: (selectedValuation.base_price_selected as "min" | "med" | "max" | "custom") || "med",
      customBaseM2: null,
      area_terreno_m2: selectedValuation.area_terreno_m2 || 0,
      proporcao_terreno: selectedValuation.proporcao_terreno || 0,
      bonus_terreno: selectedValuation.bonus_terreno || 0,
      responses: [],
      docStatus: selectedValuation.documentation_status,
      docFactor: selectedValuation.documentation_factor || 1,
      docNotes: selectedValuation.documentation_notes || "",
      result: null,
      // Gerar dados históricos sintéticos para o PDF baseados nos dados salvos
      historicalAnalysis: generateSyntheticHistoricalAnalysis(selectedValuation, trendPercentage),
      tipoAvaliacao: tipoOverride || (selectedValuation.tipo_avaliacao as "simples" | "completa") || "completa",
    };

    // Limpa o título de possíveis emojis corrompidos
    const cleanTitle = (title: string | null) => {
      if (!title) return "Avaliação Concluída";
      // Remove caracteres não-ASCII (emojis corrompidos)
      return title.replace(/[^\x00-\x7F]/g, '').trim() || "Avaliação Concluída";
    };

    // Determina o ícone correto baseado no status/trend
    const getRecommendationIcon = () => {
      if (trendPercentage > 5) return "[^]"; // Mercado em alta
      if (trendPercentage < -5) return "[v]"; // Mercado em baixa
      return "[OK]"; // Normal
    };

    // Reconstruir o result usando os tipos corretos
    const result: ValuationResult = {
      pessimista: selectedValuation.final_value_min,
      provavel: selectedValuation.final_value_med,
      otimista: selectedValuation.final_value_max,
      spread_percentage: selectedValuation.spread_percentage,
      confidence_score: selectedValuation.confidence_score,
      confidence_level: selectedValuation.confidence_level as "green" | "yellow_high" | "yellow_medium" | "red",
      total_adjustment: selectedValuation.total_adjustment,
      auto_capped: false,
      recommendation: {
        status: trendPercentage > 5 ? "WAIT_30_DAYS" : "PROCEED",
        icon: getRecommendationIcon(),
        title: cleanTitle(selectedValuation.recommendation_title),
        message: trendWasCapped 
          ? `Trend original de ${selectedValuation.trend_percentage?.toFixed(1)}% limitado a ±${TREND_CAP}% (poucos dados de anúncios na região).`
          : "",
      },
    };

    // Combined prices com campos obrigatórios para CombinedPrices
    const combined = {
      med_m2: selectedValuation.final_value_med / selectedValuation.property_area_m2,
      min_m2: selectedValuation.final_value_min / selectedValuation.property_area_m2,
      max_m2: selectedValuation.final_value_max / selectedValuation.property_area_m2,
      trend_percentage: trendPercentage,
      trend_direction: (trendPercentage > 5 ? "UP" : trendPercentage < -5 ? "DOWN" : "STABLE") as "UP" | "DOWN" | "STABLE",
      // Novos campos obrigatórios para Gap de Mercado
      market_gap_percentage: trendPercentage,
      market_alignment: (Math.abs(trendPercentage) <= 10 ? 'EQUILIBRADO' : 
                         Math.abs(trendPercentage) <= 20 ? 'MODERADO' : 
                         Math.abs(trendPercentage) <= 35 ? 'DESALINHADO' : 'CRITICO') as 'EQUILIBRADO' | 'MODERADO' | 'DESALINHADO' | 'CRITICO',
      gap_impact: Math.abs(trendPercentage) <= 10 ? 'Mercado equilibrado' : 
                  Math.abs(trendPercentage) <= 20 ? 'Margem de negociação típica' : 
                  'Anúncios acima das transações reais',
    };

    try {
      exportValuationEnginePDF(result, state, combined);
      if (trendWasCapped) {
        toast.info(`Trend corrigido de ${selectedValuation.trend_percentage?.toFixed(1)}% para ${TREND_CAP}%`);
      }
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o PDF");
    }
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

      {/* Filtro e Ações */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Avaliações Realizadas</CardTitle>
              {isSelectionMode && selectedIds.size > 0 && (
                <Badge variant="secondary">{selectedIds.size} selecionada(s)</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={isSelectionMode ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedIds(new Set());
                }}
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                {isSelectionMode ? "Cancelar" : "Selecionar"}
              </Button>
              {isSelectionMode && selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir ({selectedIds.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAvaliacoes && filteredAvaliacoes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isSelectionMode && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={filteredAvaliacoes.length > 0 && selectedIds.size === filteredAvaliacoes.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead className="whitespace-nowrap">Data</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Área</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Confiança</TableHead>
                    <TableHead className="text-center hidden lg:table-cell">Trend</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-right">Autorização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAvaliacoes.map((av) => (
                    <TableRow 
                      key={av.id}
                      className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedIds.has(av.id) ? 'bg-primary/10' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isSelectionMode) {
                          toggleSelection(av.id);
                        } else {
                          handleRowClick(av);
                        }
                      }}
                    >
                      {isSelectionMode && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(av.id)}
                            onCheckedChange={() => toggleSelection(av.id)}
                          />
                        </TableCell>
                      )}
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
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <GerarAutorizacaoButton
                          state={valuationRowToState(av)}
                          valuationId={av.id}
                          defaultValorAvaliacao={av.final_value_med}
                          existingAutorizacao={autorizacoesMap?.get(av.id) || null}
                          variant="outline"
                          size="sm"
                          label="Gerar"
                        />
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
                onClick={() => navigate("/avaliacao-imobiliaria")}
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
            Trend mostra a tendência de mercado na região comparando anúncios vs transações oficiais.
            <span className="block mt-1 text-primary font-medium">Clique em uma linha para ver detalhes e seguir para vistoria.</span>
          </p>
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={!!selectedValuation} onOpenChange={(open) => {
        if (!open) setSelectedValuation(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Detalhes da Avaliação
            </DialogTitle>
            <DialogDescription>
              {selectedValuation?.logradouro}{selectedValuation?.numero ? `, ${selectedValuation.numero}` : ""}
            </DialogDescription>
          </DialogHeader>
          
          {selectedValuation && (
            <div className="space-y-4">
              {/* Valores */}
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Valor Provável</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(selectedValuation.final_value_med)}
                </p>
                <div className="flex justify-center gap-4 mt-2 text-sm">
                  <span className="text-red-600">Mín: {formatCurrency(selectedValuation.final_value_min)}</span>
                  <span className="text-emerald-600">Máx: {formatCurrency(selectedValuation.final_value_max)}</span>
                </div>
              </div>

              {/* Informações */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Bairro</p>
                  <p className="font-medium">{selectedValuation.bairro}</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Área</p>
                  <p className="font-medium">{selectedValuation.property_area_m2} m²</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Tipo</p>
                  <p className="font-medium">{selectedValuation.property_type || "Não informado"}</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">
                    {format(new Date(selectedValuation.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {/* Métricas */}
              <div className="flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Confiança:</span>
                  {getConfidenceBadge(selectedValuation.confidence_level)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Trend:</span>
                  <TrendIcon direction={selectedValuation.trend_direction} />
                  {selectedValuation.trend_percentage && (
                    <span className={`text-sm font-medium ${Math.abs(selectedValuation.trend_percentage) > 50 ? 'text-amber-600' : ''}`}>
                      {selectedValuation.trend_percentage > 0 ? "+" : ""}{selectedValuation.trend_percentage.toFixed(1)}%
                      {Math.abs(selectedValuation.trend_percentage) > 50 && " *"}
                    </span>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          <strong>Trend (Tendência de Mercado)</strong><br />
                          Compara o preço médio dos anúncios atuais com o valor de transações oficiais (ITBI).<br /><br />
                          <span className="text-emerald-500">▲ Positivo:</span> Anúncios acima das transações oficiais (mercado aquecido)<br />
                          <span className="text-red-500">▼ Negativo:</span> Anúncios abaixo das transações oficiais (mercado retraído)<br />
                          <span className="text-muted-foreground">— Neutro:</span> Valores alinhados (mercado estável)
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Alerta de trend alto */}
              {selectedValuation.trend_percentage && Math.abs(selectedValuation.trend_percentage) > 50 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>⚠ Atenção:</strong> Trend de {selectedValuation.trend_percentage.toFixed(1)}% indica possível baixa representatividade 
                    de anúncios na região. Na reemissão do PDF será aplicado limite de ±50%.
                  </p>
                </div>
              )}

              {/* Recomendação */}
              {selectedValuation.recommendation_title && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {/* Remove emojis corrompidos do título */}
                    {selectedValuation.recommendation_title.replace(/[^\x00-\x7F]/g, '').trim() || "Avaliação Concluída"}
                  </p>
                </div>
              )}

              {/* Estratégia de Precificação */}
              {(() => {
                const pricing = selectedValuation.pricing_strategies?.[0];
                if (!pricing) return null;
                
                const getStrategyLabel = (s: string | null) => {
                  if (s === 'atracao') return 'Atração';
                  if (s === 'mercado') return 'Mercado';
                  if (s === 'premium') return 'Premium';
                  return s || '-';
                };
                
                const getSelectedValue = () => {
                  if (!pricing.estrategia_selecionada) return null;
                  switch (pricing.estrategia_selecionada) {
                    case 'atracao': return pricing.preco_anuncio_atracao;
                    case 'mercado': return pricing.preco_anuncio_mercado;
                    case 'premium': return pricing.preco_anuncio_premium;
                    default: return null;
                  }
                };
                
                const selectedValue = getSelectedValue();
                
                return (
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                        Estratégia de Precificação
                      </span>
                      <Badge variant={pricing.status === 'confirmado' ? 'default' : 'secondary'} className="ml-auto text-xs">
                        {pricing.status === 'confirmado' ? 'Confirmada' : 'Pendente'}
                      </Badge>
                    </div>
                    
                    {pricing.estrategia_selecionada && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Estratégia:</span>
                          <p className="font-medium">{getStrategyLabel(pricing.estrategia_selecionada)}</p>
                        </div>
                        {selectedValue && (
                          <div>
                            <span className="text-muted-foreground text-xs">Preço Anúncio:</span>
                            <p className="font-medium text-emerald-700 dark:text-emerald-300">
                              {formatCurrency(selectedValue)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!pricing.estrategia_selecionada && (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma estratégia selecionada ainda
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Ações */}
              <div className="flex flex-col gap-2 pt-2">
                <Button 
                  onClick={async () => {
                    // Buscar as respostas dos fatores de avaliação
                    let savedResponses: { char_id: string; char_code: string; response: string; weight_applied: number }[] = [];
                    
                    try {
                      const { data: responsesData, error: responsesError } = await supabase
                        .from("valuation_responses")
                        .select(`
                          characteristic_id,
                          response_value,
                          weight_applied,
                          valuation_characteristics (
                            char_code
                          )
                        `)
                        .eq("valuation_id", selectedValuation.id);
                      
                      if (!responsesError && responsesData) {
                        savedResponses = responsesData.map((r: any) => ({
                          char_id: r.characteristic_id,
                          char_code: r.valuation_characteristics?.char_code || "",
                          response: r.response_value as "sim" | "nao" | "nao_aplica",
                          weight_applied: r.weight_applied || 0,
                        }));
                        console.log(`${savedResponses.length} fatores carregados`);
                      }
                    } catch (err) {
                      console.error("Erro ao carregar respostas:", err);
                    }
                    
                    // Prepara dados completos para editar avaliação
                    const editarData = {
                      id: selectedValuation.id,
                      logradouro: selectedValuation.logradouro,
                      numero: selectedValuation.numero || "",
                      bairro: selectedValuation.bairro,
                      tipoImovel: selectedValuation.property_type || "",
                      area_m2: selectedValuation.property_area_m2,
                      // Dados ITBI
                      itbiData: {
                        min_m2: selectedValuation.itbi_min_m2 || 0,
                        med_m2: selectedValuation.itbi_med_m2 || 0,
                        max_m2: selectedValuation.itbi_max_m2 || 0,
                        transaction_count: selectedValuation.itbi_transaction_count || 0,
                      },
                      // Dados Anúncio (se existirem, com fontes)
                      anuncioData: selectedValuation.anuncio_med_m2 ? {
                        min_m2: selectedValuation.anuncio_min_m2 || 0,
                        med_m2: selectedValuation.anuncio_med_m2 || 0,
                        max_m2: selectedValuation.anuncio_max_m2 || 0,
                        fontes: selectedValuation.anuncio_fontes || undefined,
                      } : null,
                      // Campos extras
                      docStatus: selectedValuation.documentation_status,
                      docFactor: selectedValuation.documentation_factor || 1,
                      docNotes: selectedValuation.documentation_notes || "",
                      area_terreno_m2: selectedValuation.area_terreno_m2 || 0,
                      proporcao_terreno: selectedValuation.proporcao_terreno || 0,
                      bonus_terreno: selectedValuation.bonus_terreno || 0,
                      baseSelected: selectedValuation.base_price_selected || "med",
                      // Campos de identificação do imóvel
                      complemento: selectedValuation.complemento || "",
                      nomeCondominio: selectedValuation.nome_condominio || "",
                      quartos: selectedValuation.quartos || 0,
                      suites: selectedValuation.suites || 0,
                      banheiros: selectedValuation.banheiros || 0,
                      vagas: selectedValuation.vagas || 0,
                      andar: selectedValuation.andar || "",
                      proprietario: selectedValuation.proprietario || "",
                      telefone: selectedValuation.telefone || "",
                      observacoesImovel: selectedValuation.observacoes_imovel || "",
                      // Respostas dos fatores de avaliação
                      responses: savedResponses,
                    };
                    toast.success(`Dados carregados para edição (${savedResponses.length} fatores)`);
                    navigate("/avaliacao-imobiliaria", {
                      state: { editarAvaliacao: true, avaliacaoData: editarData }
                    });
                  }}
                  variant="default"
                  className="w-full bg-primary"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Editar e Gerar Nova Avaliação
                </Button>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button 
                    onClick={handleGoToVistoria}
                    variant="secondary"
                    size="sm"
                  >
                    <ClipboardCheck className="h-4 w-4 mr-1.5" />
                    Vistoria
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleExportPDF("completa")}
                    size="sm"
                  >
                    <FileText className="h-4 w-4 mr-1.5" />
                    PDF Completo
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => handleExportPDF("simples")}
                    size="sm"
                  >
                    <FileText className="h-4 w-4 mr-1.5" />
                    PDF Simples
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="ghost"
                    onClick={() => setSelectedValuation(null)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Fechar
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleDeleteSingle(selectedValuation.id)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão em lote */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} avaliação(ões)?
              <br />
              <span className="text-destructive font-medium">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : `Excluir ${selectedIds.size} avaliação(ões)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}