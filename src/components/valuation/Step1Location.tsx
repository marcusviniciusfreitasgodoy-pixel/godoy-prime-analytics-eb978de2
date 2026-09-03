import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, TrendingUp, TrendingDown, Minus, Search, Building2, Plus, X, Calculator, CheckCircle2, Database, Loader2, AlertTriangle, Info, ExternalLink, HelpCircle, BarChart3 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOfficialStreetSuggestions, type OfficialStreetSuggestion } from "@/hooks/useOfficialStreetSuggestions";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLogradouroInteligencia } from "@/hooks/useLogradouroInteligencia";
import type { ValuationState } from "@/types/valuation";
import type { CombinedPrices, ITBIData, AnuncioData } from "@/utils/valuationCalculations";
import { supabase } from "@/integrations/supabase/client";
import { getOutlierLimits } from "@/lib/outlierLimits";
import {
  MAX_ROWS,
  MIN_ROWS_FOR_TIPOLOGIA,
  MIN_ROWS_SCOPE,
  RADIUS_STEPS_M,
  MAX_WINDOW_MONTHS,
  WINDOW_MONTHS_OPTIONS,
  DEFAULT_WINDOW_MONTHS,
  buildRollingWindow,
  selectRollingWindowRows,
  calculateITBIData as computeITBIData,
  collectBairros,
  deflateRows,
  isScopeSufficient,
  mapTipoImovelToTipologia,
  pickFallbackSample,
  radiusSource,
  type DataSource,
  type MarketRow,
  type PriceIndexPoint,
  type RadiusStep,
  type WindowMonths,
} from "@/utils/itbiMarketStats";
import { fetchPriceIndex } from "@/utils/priceIndex";

interface Props {
  state: ValuationState;
  updateState: (updates: Partial<ValuationState>) => void;
  combined: CombinedPrices | null;
  onAutoValidated?: () => void;
}

interface AnuncioEntry {
  id: string;
  valor_total: number;
  area_m2: number;
  fonte?: string; // Link ou fonte do anúncio (opcional)
}

export function Step1Location({ state, updateState, combined, onAutoValidated }: Props) {
  // Usa logradouro do Step 0 se disponível, senão permite busca
  const [searchTerm, setSearchTerm] = useState(state.logradouro || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [useCustomSearch, setUseCustomSearch] = useState(!state.logradouro);
  
  // Configurações da empresa (método de filtro)
  const { settings } = useCompanySettings();
  
  // Hook oficial para autocomplete
  const { data: suggestions = [], isLoading: loading } = useOfficialStreetSuggestions(
    useCustomSearch ? searchTerm : "",
    state.bairro
  );
  
  // Hook para dados de inteligência do logradouro (IPTU 2025 + ITBI)
  const { data: logradouroInfo, loading: logradouroInfoLoading } = useLogradouroInteligencia(state.logradouro);
  
  // Estado para anúncios de referência - inicializa com dados existentes ou vazio
  const [anuncios, setAnuncios] = useState<AnuncioEntry[]>(() => {
    // Se já temos fontes salvas no state, restaura elas
    if (state.anuncioData?.fontes && state.anuncioData.fontes.length > 0) {
      return state.anuncioData.fontes.map((f, idx) => ({
        id: `saved-${idx}`,
        valor_total: f.valor || 0,
        area_m2: f.area || 0,
        fonte: f.fonte || ""
      }));
    }
    return [{ id: "1", valor_total: 0, area_m2: 0, fonte: "" }];
  });
  const [anunciosInitialized, setAnunciosInitialized] = useState(false);
  const [autoFetchLoading, setAutoFetchLoading] = useState(false);
  // Janela de análise: padrão 12 meses, com opção de ampliar até 60 meses.
  const [janelaMeses, setJanelaMeses] = useState<WindowMonths>(
    (state.janelaMeses as WindowMonths) || DEFAULT_WINDOW_MONTHS
  );
  // Última amostra bruta (sempre buscada no máximo de meses) para recortar a
  // janela sem precisar refazer a consulta.
  const [lastMarket, setLastMarket] = useState<MarketFetchResult | null>(null);
  const [lastPriceIndex, setLastPriceIndex] = useState<PriceIndexPoint[] | null>(null);

  const buildStreetSearchTerms = (logradouro: string): string[] => {
    const sanitize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[,%]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const normalized = sanitize(logradouro);
    const withoutNumber = sanitize(logradouro.replace(/\b\d+[A-Z]?\b/g, " "));
    const withoutPrefix = withoutNumber
      .replace(/^(AVENIDA|AVN|AV\.?|RUA|R\.?|ESTRADA|EST\.?|TRAVESSA|TV\.?|ALAMEDA|AL\.?|PRAÇA|PRACA|PRC|PÇ\.?|LARGO|LGO|LADEIRA|LAD)\s+/i, "")
      .trim();

    return Array.from(
      new Set([normalized, withoutNumber, withoutPrefix].filter((term) => term.length >= 2))
    );
  };

  interface PontoReferencia {
    lat: number;
    lng: number;
    fonte: string;
  }

  interface MarketFetchResult {
    rows: MarketRow[];
    source: DataSource;
    tipologiaFiltro: string | null;
    tipologiaFallback: boolean;
    piso: number;
    teto: number;
    raioM?: number | null;
    ponto?: PontoReferencia | null;
  }

  /**
   * Ponto de referência do imóvel para o raio: média das coordenadas do
   * logradouro (RPC itbi_ponto_logradouro, fonte ITBI ou logradouros_geo).
   * Para condomínio usa o logradouro padrão. Devolve null sem coordenadas.
   */
  const fetchPontoReferencia = async (logradouro: string, bairro: string): Promise<PontoReferencia | null> => {
    const { data, error } = await supabase.rpc("itbi_ponto_logradouro", {
      p_logradouro: logradouro,
      p_bairro: bairro,
    });
    if (error) {
      console.warn("[Step1] itbi_ponto_logradouro indisponível:", error.message);
      return null;
    }
    const ponto = Array.isArray(data) ? data[0] : data;
    if (!ponto || !Number.isFinite(Number(ponto.lat)) || !Number.isFinite(Number(ponto.lng))) return null;
    return { lat: Number(ponto.lat), lng: Number(ponto.lng), fonte: String(ponto.fonte ?? "") };
  };

  /**
   * Busca a amostra de mercado ITBI para o imóvel.
   *
   * Regras (docs/auditoria-motor-avaliacao.md, Fase 1 e seção 11):
   * - janela de 5 anos fechados + ano corrente (a seleção final é feita em calculateITBIData);
   * - piso e teto de R$/m² do bairro do imóvel (src/lib/outlierLimits.ts), nunca um valor fixo;
   * - ordenação explícita e limite de 5000 linhas, para o resultado ser reprodutível;
   * - tipologia compatível com o tipo do imóvel; relaxa para "Residencial" quando a amostra
   *   tem menos de MIN_ROWS_FOR_TIPOLOGIA linhas, registrando o fallback;
   * - com o fallback por raio ativado, uma rua com menos de MIN_ROWS_SCOPE linhas é
   *   complementada pelos raios de 100 m e 300 m em torno do ponto do logradouro; entre
   *   rua e raios, vale o primeiro suficiente ou, se nenhum for, o de maior amostra;
   * - o bairro inteiro só substitui quando rua e raios não têm nenhuma ocorrência.
   */
  const fetchMarketRows = async (
    bairro: string,
    logradouro: string,
    tipoImovel: string,
    ruasInternas?: string[]
  ): Promise<MarketFetchResult> => {
    // A consulta sempre traz o máximo de meses; o recorte da janela escolhida
    // é feito depois, em calculateITBIData.
    const window = buildRollingWindow(MAX_WINDOW_MONTHS);
    const tipologiaDesejada = mapTipoImovelToTipologia(tipoImovel);
    // Piso e teto calibrados por bairro × tipologia (P1/P99 da base, com margem).
    const { piso, teto } = getOutlierLimits(bairro, tipologiaDesejada);
    const isCondominio = !!(ruasInternas && ruasInternas.length > 0);

    const createBaseQuery = (withBairro: boolean, tipologia: string | null) => {
      let q = supabase
        .from("itbi_transactions")
        .select("valor_m2, valor_transacao, total_transacoes, data_transacao, bairro, tipologia")
        .eq("uso", "Residencial")
        .gte("percentual_transferido", 90)
        .not("valor_m2", "is", null)
        .gte("valor_m2", piso)
        .lte("valor_m2", teto)
        .gte("data_transacao", window.start)
        .lte("data_transacao", window.end)
        .order("data_transacao", { ascending: false })
        .order("logradouro", { ascending: true })
        .order("tipologia", { ascending: true })
        .limit(MAX_ROWS);
      if (withBairro) q = q.ilike("bairro", bairro);
      if (tipologia) q = q.eq("tipologia", tipologia);
      return q;
    };

    const applyStreetFilter = (query: ReturnType<typeof createBaseQuery>) => {
      if (isCondominio) {
        const normalizedRuas = ruasInternas!
          .map((rua) => rua.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
          .filter(Boolean);
        if (normalizedRuas.length > 0) {
          const orFilter = normalizedRuas.map((rua) => `logradouro.ilike.%${rua}%`).join(",");
          return query.or(orFilter);
        }
        return query;
      }
      const streetTerms = buildStreetSearchTerms(logradouro);
      if (streetTerms.length > 0) {
        const streetFilter = streetTerms.map((term) => `logradouro.ilike.%${term}%`).join(",");
        return query.or(streetFilter);
      }
      return query;
    };

    const queryRadius = async (ponto: PontoReferencia, raio: RadiusStep, tipologia: string | null): Promise<MarketRow[]> => {
      const { data, error } = await supabase.rpc("itbi_amostra_raio", {
        p_lat: ponto.lat,
        p_lng: ponto.lng,
        p_raio_m: raio,
        p_inicio: window.start,
        p_fim: window.end,
        p_tipologia: tipologia ?? undefined,
        p_piso: piso,
        p_teto: teto,
        p_limite: MAX_ROWS,
      });
      if (error) {
        // Função ainda não aplicada no banco: o fluxo segue sem o degrau de raio.
        console.warn(`[Step1] itbi_amostra_raio indisponível (raio ${raio} m):`, error.message);
        return [];
      }
      return (data || []).map((r) => ({
        valor_m2: r.valor_m2 === null ? null : Number(r.valor_m2),
        valor_transacao: r.valor_transacao == null ? null : Number(r.valor_transacao),
        total_transacoes: r.total_transacoes,
        data_transacao: r.data_transacao,
        bairro: r.bairro ?? null,
        tipologia: r.tipologia ?? null,
      }));
    };

    const tipologias: (string | null)[] = tipologiaDesejada ? [tipologiaDesejada, null] : [null];

    // Dentro de um escopo, prefere a amostra com tipologia; relaxa só se ela for pequena.
    const searchWith = async (
      source: DataSource,
      run: (tipologia: string | null) => Promise<MarketRow[]>,
      extra: Pick<MarketFetchResult, "raioM" | "ponto"> = {}
    ): Promise<MarketFetchResult | null> => {
      let smallest: MarketFetchResult | null = null;
      for (const tipologia of tipologias) {
        const rows = await run(tipologia);
        if (rows.length === 0) continue;
        const result: MarketFetchResult = {
          rows,
          source,
          tipologiaFiltro: tipologia,
          tipologiaFallback: tipologiaDesejada !== null && tipologia === null,
          piso,
          teto,
          ...extra,
        };
        if (rows.length >= MIN_ROWS_FOR_TIPOLOGIA) return result;
        if (!smallest) smallest = result;
      }
      return smallest;
    };

    const runTable = (scope: "logradouro" | "bairro") => async (tipologia: string | null): Promise<MarketRow[]> => {
      // Condomínio mantém o filtro de bairro (rua interna é genérica); logradouro busca cross-bairro.
      const query =
        scope === "logradouro"
          ? applyStreetFilter(createBaseQuery(isCondominio, tipologia))
          : createBaseQuery(true, tipologia);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MarketRow[];
    };

    const streetResult = await searchWith("logradouro", runTable("logradouro"));
    if (streetResult && isScopeSufficient(streetResult.rows)) return streetResult;

    // Degraus intermediários por raio (seção 11): só com a configuração ligada.
    const candidates: (MarketFetchResult | null)[] = [streetResult];
    if (settings.radius_fallback_enabled) {
      const pontoLogradouro = isCondominio ? state.condominioSelecionado?.logradouro_padrao || logradouro : logradouro;
      const ponto = await fetchPontoReferencia(pontoLogradouro, bairro);
      if (ponto) {
        for (const raio of RADIUS_STEPS_M) {
          const radiusResult = await searchWith(radiusSource(raio), (t) => queryRadius(ponto, raio, t), { raioM: raio, ponto });
          candidates.push(radiusResult);
          if (radiusResult && isScopeSufficient(radiusResult.rows)) break;
        }
      } else {
        console.warn("[Step1] Sem ponto de referência para", pontoLogradouro, "- fallback por raio ignorado.");
      }
    }

    // Entre rua e raios: o primeiro com MIN_ROWS_SCOPE linhas ou, se nenhum, o maior.
    const best = pickFallbackSample(candidates);
    if (best) return best;

    const bairroResult = await searchWith("bairro", runTable("bairro"));
    if (bairroResult) return bairroResult;

    return { rows: [], source: "bairro", tipologiaFiltro: tipologiaDesejada, tipologiaFallback: false, piso, teto };
  };

  // Sincroniza searchTerm quando logradouro muda
  useEffect(() => {
    if (state.logradouro && !useCustomSearch) {
      setSearchTerm(state.logradouro);
    }
  }, [state.logradouro, useCustomSearch]);

  // Auto-busca ITBI quando chega na etapa com logradouro já preenchido (vindo do Step 0)
  useEffect(() => {
    const autoFetchITBI = async () => {
      // Só executa se: tem logradouro, tem bairro, mas NÃO tem dados ITBI ainda
      if (!state.logradouro || !state.bairro || state.itbiData) return;

      setAutoFetchLoading(true);
      try {
        const ruasInternas = state.condominioSelecionado?.ruas_internas;
        const [market, priceIndex] = await Promise.all([
          fetchMarketRows(state.bairro, state.logradouro, state.tipoImovel, ruasInternas),
          fetchPriceIndex(),
        ]);

        console.log(
          "[Step1] Auto-fetch ITBI para:",
          state.logradouro,
          "bairro:",
          state.bairro,
          "resultados:",
          market.rows.length,
          "fonte:",
          market.source,
          "tipologia:",
          market.tipologiaFiltro
        );

        setLastMarket(market);
        setLastPriceIndex(priceIndex);
        const itbiData = calculateITBIData(market, priceIndex);
        if (itbiData) {
          updateState({ itbiData });
          onAutoValidated?.();
        }
      } catch (error) {
        console.error("Erro ao auto-buscar dados ITBI:", error);
      } finally {
        setAutoFetchLoading(false);
      }
    };

    autoFetchITBI();
  }, [
    state.logradouro,
    state.bairro,
    state.itbiData,
    state.condominioSelecionado?.nome,
    state.condominioSelecionado?.ruas_internas,
    state.tipoImovel,
    settings.outlier_filter_method,
    updateState,
    onAutoValidated,
  ]);

  // Restaura anúncios quando state.anuncioData mudar (edição de avaliação)
  useEffect(() => {
    if (!anunciosInitialized && state.anuncioData?.fontes && state.anuncioData.fontes.length > 0) {
      setAnuncios(state.anuncioData.fontes.map((f, idx) => ({
        id: `restored-${idx}`,
        valor_total: f.valor || 0,
        area_m2: f.area || 0,
        fonte: f.fonte || ""
      })));
      setAnunciosInitialized(true);
    }
  }, [state.anuncioData, anunciosInitialized]);

  // Calcula R$/m² dos anúncios quando mudam
  useEffect(() => {
    const validAnuncios = anuncios.filter(a => a.valor_total > 0 && a.area_m2 > 0);
    
    if (validAnuncios.length === 0) {
      updateState({ anuncioData: null });
      return;
    }

    // Calcula R$/m² para cada anúncio
    const valoresM2 = validAnuncios.map(a => a.valor_total / a.area_m2).sort((a, b) => a - b);
    
    const min_m2 = valoresM2[0];
    const max_m2 = valoresM2[valoresM2.length - 1];
    const mid = Math.floor(valoresM2.length / 2);
    const med_m2 = valoresM2.length % 2 ? valoresM2[mid] : (valoresM2[mid - 1] + valoresM2[mid]) / 2;

    // Coleta as fontes dos anúncios para rastreabilidade
    const fontes = validAnuncios.map(a => ({
      valor: a.valor_total,
      area: a.area_m2,
      fonte: a.fonte || undefined
    }));

    updateState({
      anuncioData: {
        min_m2: Math.round(min_m2),
        med_m2: Math.round(med_m2),
        max_m2: Math.round(max_m2),
        fontes
      }
    });
  }, [anuncios]);

  /**
   * Aplica a regra de janela (anos fechados, expandindo para o ano corrente quando a
   * amostra é fina) e calcula a estatística ponderada com os metadados de rastreabilidade.
   * A matemática vive em src/utils/itbiMarketStats.ts, coberta por testes.
   */
  const calculateITBIData = (
    market: MarketFetchResult,
    priceIndex: PriceIndexPoint[] | null,
    meses: WindowMonths = janelaMeses
  ): ITBIData | null => {
    if (!market.rows || market.rows.length === 0) return null;
    const selection = selectRollingWindowRows(market.rows, meses);
    if (selection.rows.length === 0) return null;
    // Correção temporal: cada linha é trazida ao trimestre de referência pelo índice
    // próprio. Sem índice disponível, calcula sem correção e registra nos metadados.
    const deflation = deflateRows(selection.rows, priceIndex);
    return computeITBIData(deflation.rows, {
      method: settings.outlier_filter_method,
      meta: {
        data_source: market.source,
        raio_m: market.raioM ?? null,
        ponto_referencia: market.ponto ?? null,
        bairros_incluidos: collectBairros(selection.rows),
        janela_inicio: selection.janelaInicio,
        janela_fim: selection.janelaFim,
        ano_corrente_incluido: selection.anoCorrenteIncluido,
        tipologia_filtro: market.tipologiaFiltro,
        tipologia_fallback: market.tipologiaFallback,
        piso_m2: market.piso,
        teto_m2: market.teto,
        truncado: market.rows.length >= MAX_ROWS,
        deflacionado: deflation.aplicado,
        trimestre_referencia: deflation.trimestreReferencia,
        janela_meses: selection.janelaMeses,
        janela_meses_solicitada: selection.janelaSolicitadaMeses,
        janela_expandida: selection.expandidoAutomaticamente,
      },
    });
  };

  const handleSelectStreet = async (suggestion: OfficialStreetSuggestion) => {
    // Usa o logradouro normalizado para ITBI se disponível
    const logradouroParaBusca = suggestion.logradouro_itbi || suggestion.logradouro;
    
    // Se é cross-bairro, atualizar o bairro no state
    const targetBairro = suggestion.bairro_origem || state.bairro;
    if (suggestion.bairro_origem) {
      updateState({ bairro: suggestion.bairro_origem });
    }
    
    // Buscar dados ITBI para o logradouro selecionado (com fallback automático para dados do bairro)
    try {
      const [market, priceIndex] = await Promise.all([
        fetchMarketRows(targetBairro, logradouroParaBusca, state.tipoImovel),
        fetchPriceIndex(),
      ]);

      console.log(
        "[Step1] handleSelectStreet ITBI para:",
        logradouroParaBusca,
        "bairro:",
        targetBairro,
        "resultados:",
        market.rows.length,
        "fonte:",
        market.source,
        "tipologia:",
        market.tipologiaFiltro
      );

      setLastMarket(market);
      setLastPriceIndex(priceIndex);
      updateState({
        logradouro: suggestion.logradouro,
        itbiData: calculateITBIData(market, priceIndex),
      });
    } catch (error) {
      console.error("Erro ao buscar dados ITBI:", error);
      updateState({
        logradouro: suggestion.logradouro,
        itbiData: null,
      });
    }
    
    setSearchTerm(suggestion.logradouro);
    setShowSuggestions(false);
  };

  /** Troca a janela de análise e recalcula a estatística com a mesma amostra. */
  const handleJanelaChange = async (meses: WindowMonths) => {
    setJanelaMeses(meses);
    updateState({ janelaMeses: meses });

    let market = lastMarket;
    let priceIndex = lastPriceIndex;
    if (!market) {
      if (!state.bairro || !state.logradouro) return;
      setAutoFetchLoading(true);
      try {
        const [fetched, index] = await Promise.all([
          fetchMarketRows(state.bairro, state.logradouro, state.tipoImovel, state.condominioSelecionado?.ruas_internas),
          fetchPriceIndex(),
        ]);
        market = fetched;
        priceIndex = index;
        setLastMarket(fetched);
        setLastPriceIndex(index);
      } catch (error) {
        console.error("Erro ao recalcular janela ITBI:", error);
        setAutoFetchLoading(false);
        return;
      }
      setAutoFetchLoading(false);
    }
    updateState({ itbiData: calculateITBIData(market, priceIndex, meses) });
  };

  const addAnuncio = () => {
    if (anuncios.length < 5) {
      setAnuncios([...anuncios, { id: Date.now().toString(), valor_total: 0, area_m2: 0, fonte: "" }]);
    }
  };

  const removeAnuncio = (id: string) => {
    if (anuncios.length > 1) {
      setAnuncios(anuncios.filter(a => a.id !== id));
    }
  };

  const updateAnuncio = (id: string, field: 'valor_total' | 'area_m2' | 'fonte', value: number | string) => {
    setAnuncios(anuncios.map(a => 
      a.id === id ? { ...a, [field]: value } : a
    ));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const TrendIcon = combined?.trend_direction === "UP" 
    ? TrendingUp 
    : combined?.trend_direction === "DOWN" 
    ? TrendingDown 
    : Minus;

  const trendColor = combined?.trend_direction === "UP"
    ? "text-emerald-600"
    : combined?.trend_direction === "DOWN"
    ? "text-red-600"
    : "text-muted-foreground";

  const getAnuncioM2 = (anuncio: AnuncioEntry) => {
    if (anuncio.valor_total > 0 && anuncio.area_m2 > 0) {
      return anuncio.valor_total / anuncio.area_m2;
    }
    return null;
  };

  const getFonteBadge = (fonte: OfficialStreetSuggestion['fonte']) => {
    switch (fonte) {
      case 'combinado':
        return (
          <Badge variant="default" className="text-[10px] shrink-0 bg-green-500/20 text-green-700 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verificado
          </Badge>
        );
      case 'oficial':
        return (
          <Badge variant="outline" className="text-[10px] shrink-0 text-blue-600 border-blue-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Oficial
          </Badge>
        );
      case 'itbi':
        return (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            <Database className="h-3 w-3 mr-1" />
            Transações
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Loading indicator - só aparece durante carregamento automático */}
      {autoFetchLoading && state.logradouro && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-2.5 sm:p-3">
          <p className="text-xs sm:text-sm flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" />
            <span className="truncate">
              Carregando dados de mercado para: <strong className="break-words">{state.logradouro}</strong>
            </span>
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            Aguarde enquanto buscamos os preços...
          </p>
        </div>
      )}

      {/* Search input */}
      <div className="space-y-2">
        <Label htmlFor="street-search" className="flex items-center gap-2 text-xs sm:text-sm">
          <MapPin className="h-4 w-4" />
          {state.itbiData ? "Logradouro Selecionado" : "Buscar Logradouro ou Condomínio"}
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="street-search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
              setUseCustomSearch(true);
            }}
            onFocus={() => {
              setShowSuggestions(true);
              // Sempre habilita busca customizada ao focar para permitir validação
              if (searchTerm.length >= 2) {
                setUseCustomSearch(true);
              }
            }}
            placeholder="Digite o nome da rua..."
            className="pl-10 h-10 sm:h-9"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          
          {/* Suggestions dropdown */}
          {showSuggestions && suggestions && suggestions.length > 0 && (
            <Card className="absolute z-50 w-full mt-1 shadow-lg max-h-[60vh] overflow-y-auto">
              <CardContent className="p-0">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={`${suggestion.logradouro}-${idx}`}
                    onClick={() => handleSelectStreet(suggestion)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-muted/50 border-b last:border-0 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium text-xs sm:text-sm truncate block">
                            {suggestion.logradouro}
                          </span>
                          {suggestion.nome_condominio && (
                            <span className="text-[10px] text-muted-foreground truncate block">
                              🏢 {suggestion.nome_condominio}
                            </span>
                          )}
                          {suggestion.hierarquia && (
                            <span className="text-[10px] text-muted-foreground">
                              Via {suggestion.hierarquia}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {suggestion.bairro_origem ? (
                          <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-50">
                            <MapPin className="h-3 w-3 mr-0.5" />
                            {suggestion.bairro_origem}
                          </Badge>
                        ) : (
                          getFonteBadge(suggestion.fonte)
                        )}
                        {suggestion.transaction_count && suggestion.transaction_count > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {suggestion.transaction_count} transações
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
          <span>{state.bairro} • Mínimo de 3 anúncios publicados</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 cursor-help hover:text-primary transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-sm">
                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-primary">💡 Sem anúncios? Sem problema!</p>
                  <p>Você pode prosseguir usando <strong>apenas dados oficiais de transações</strong>. Essa opção oferece uma avaliação baseada em transações reais de compra e venda, sem influência de preços de anúncio — ideal para uma referência de mercado mais objetiva.</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </p>
      </div>

      {/* Card informativo de inteligência do logradouro */}
      {logradouroInfo && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 sm:p-4 space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs sm:text-sm font-semibold text-foreground">
                {logradouroInfo.nome_completo_oficial || logradouroInfo.logradouro}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {logradouroInfo.tot_imoveis_oficial != null && (
                <span>{logradouroInfo.tot_imoveis_oficial.toLocaleString("pt-BR")} unidades</span>
              )}
              {logradouroInfo.area_media_unidade != null && (
                <span>Área média: {logradouroInfo.area_media_unidade}m²</span>
              )}
              {logradouroInfo.preco_real_medio_itbi != null && (
                <span>
                  Preço real médio: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(logradouroInfo.preco_real_medio_itbi)}/m²
                </span>
              )}
              {logradouroInfo.valor_venal_medio != null && (
                <span>
                  Venal médio: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(logradouroInfo.valor_venal_medio)}/m²
                </span>
              )}
              {logradouroInfo.desconto_venal_percentual != null && (
                <span>{Math.abs(logradouroInfo.desconto_venal_percentual).toFixed(0)}% acima do venal</span>
              )}
              {logradouroInfo.total_transacoes_itbi != null && (
                <span>{logradouroInfo.total_transacoes_itbi} transações (5 anos)</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/60">Fonte: IPTU 2025 + ITBI geocodificado</p>
          </CardContent>
        </Card>
      )}

      {/* Detalhes de preços por m² */}
      {state.itbiData && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 sm:pt-5 px-3 sm:px-6 space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <Label className="text-xs sm:text-sm">Faixa de Preços por m²</Label>
              </div>
              {/* Janela de análise: padrão 12 meses, ampliável até 60 meses. */}
              <div className="flex items-center gap-1.5">
                <Label className="text-[10px] sm:text-xs text-muted-foreground">Período</Label>
                <Select
                  value={String(janelaMeses)}
                  onValueChange={(v) => handleJanelaChange(Number(v) as WindowMonths)}
                  disabled={autoFetchLoading}
                >
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WINDOW_MONTHS_OPTIONS.map((m) => (
                      <SelectItem key={m} value={String(m)} className="text-xs">
                        Últimos {m} meses{m === DEFAULT_WINDOW_MONTHS ? " (padrão)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grid de preços - responsivo */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
              <div className="text-center p-2 sm:p-3 bg-background rounded-lg">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">P10</p>
                <p className="font-semibold text-red-600 text-xs sm:text-sm">
                  {formatCurrency(state.itbiData.min_m2)}
                </p>
                <p className="text-[10px] text-muted-foreground hidden sm:block">/m²</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-primary/10 rounded-lg border-2 border-primary/30">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Mediana</p>
                <p className="font-bold text-primary text-xs sm:text-base">
                  {formatCurrency(state.itbiData.med_m2)}
                </p>
                <p className="text-[10px] text-muted-foreground hidden sm:block">RECOMENDADO</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-background rounded-lg">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">P95</p>
                <p className="font-semibold text-emerald-600 text-xs sm:text-sm">
                  {formatCurrency(state.itbiData.max_m2)}
                </p>
                <p className="text-[10px] text-muted-foreground hidden sm:block">/m²</p>
              </div>
            </div>

            {/* Rastreabilidade da amostra (Fase 1 da auditoria) */}
            {state.itbiData.meta && (() => {
              const m = state.itbiData.meta;
              const fmtData = (iso: string) => iso.split("-").reverse().join("/");
              const corte = m.outlier_method === "iqr" ? "IQR (1,5×)" : m.outlier_method === "mad" ? "MAD em log (2,5× / 3×)" : m.outlier_method === "percentile" ? "sem corte, faixa P10/P95" : "sem corte (amostra pequena)";
              const fonteLabel: Record<DataSource, string> = {
                logradouro: "logradouro",
                raio100: "raio de 100 m em torno do logradouro",
                raio300: "raio de 300 m em torno do logradouro",
                bairro: "bairro inteiro",
              };
              const avisos: string[] = [];
              if (m.data_source === "bairro") avisos.push("Sem transações na rua nem nas proximidades: amostra do bairro inteiro.");
              if (m.data_source === "raio100" || m.data_source === "raio300") avisos.push(`Rua com menos de ${MIN_ROWS_SCOPE} registros: amostra ampliada para ${m.raio_m} m em torno do logradouro.`);
              if (m.tipologia_fallback) avisos.push("Poucas transações da tipologia do imóvel: amostra inclui casas e apartamentos.");
              if (m.janela_expandida && m.janela_meses)
                avisos.push(
                  `Poucas transações em ${m.janela_meses_solicitada} meses: janela ampliada automaticamente para ${m.janela_meses} meses.`
                );
              if (m.truncado) avisos.push("Amostra parcial: a consulta atingiu o limite de registros e considerou os mais recentes.");
              return (
                <div className="text-[10px] sm:text-xs text-muted-foreground space-y-1">
                  <p>
                    Fonte: {fonteLabel[m.data_source] ?? m.data_source}
                    {m.bairros_incluidos.length > 1 ? ` (${m.bairros_incluidos.join(", ")})` : ""}
                    {" · "}Tipologia: {m.tipologia_filtro || "todas (residencial)"}
                    {" · "}Janela: últimos {m.janela_meses ?? janelaMeses} meses ({fmtData(m.janela_inicio)} a {fmtData(m.janela_fim)})
                    {m.ano_corrente_incluido ? " (inclui ano corrente)" : ""}
                    {" · "}{m.linhas_agregadas} registros agregados
                    {m.linhas_descartadas > 0 ? `, ${m.linhas_descartadas} descartados` : ""}
                    {" · "}Corte: {corte}
                    {" · "}Faixa aceita: {formatCurrency(m.piso_m2)} a {formatCurrency(m.teto_m2)}/m²
                    {" · "}{m.deflacionado && m.trimestre_referencia ? `Corrigido pelo índice para ${fmtData(m.trimestre_referencia).slice(3)}` : "Sem correção temporal"}
                  </p>
                  {avisos.length > 0 && (
                    <p className="text-amber-600">{avisos.join(" ")}</p>
                  )}
                </div>
              );
            })()}

            {/* Anúncios de Referência */}
            <div className="pt-3 sm:pt-4 border-t">
              <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                <Label className="text-xs sm:text-sm">
                  Anúncios de Referência <span className="hidden sm:inline">(opcional, sinal de mercado)</span>
                </Label>
                {anuncios.length < 5 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addAnuncio}
                    className="h-8 sm:h-7 text-xs px-2 sm:px-3"
                  >
                    <Plus className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Adicionar</span>
                  </Button>
                )}
              </div>
              
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">
                Informe imóveis similares anunciados
              </p>

              <div className="space-y-2 sm:space-y-3">
                {anuncios.map((anuncio, index) => {
                  const m2Calculado = getAnuncioM2(anuncio);
                  return (
                    <div key={anuncio.id} className="p-2 sm:p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">#{index + 1}</span>
                        {m2Calculado && (
                          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-primary ml-auto">
                            <Calculator className="h-3 w-3" />
                            <span className="font-semibold">{formatCurrency(m2Calculado)}/m²</span>
                          </div>
                        )}
                        {anuncios.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive ml-auto sm:ml-0"
                            onClick={() => removeAnuncio(anuncio.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] sm:text-xs mb-1 block">Valor</Label>
                          <CurrencyInput
                            placeholder="R$ 1.500.000"
                            value={anuncio.valor_total?.toString() || ""}
                            onChange={(value) => updateAnuncio(anuncio.id, 'valor_total', Number(value) || 0)}
                            className="h-9 sm:h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] sm:text-xs mb-1 block">Área (m²)</Label>
                          <Input
                            type="number"
                            placeholder="100"
                            value={anuncio.area_m2 || ""}
                            onChange={(e) => updateAnuncio(anuncio.id, 'area_m2', Number(e.target.value) || 0)}
                            className="h-9 sm:h-8 text-sm"
                          />
                        </div>
                      </div>
                      
                      {/* Campo de fonte/link */}
                      <div className="mt-2">
                        <Label className="text-[10px] sm:text-xs mb-1 flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Fonte/Link <span className="text-muted-foreground">(recomendado)</span>
                        </Label>
                        <Input
                          type="url"
                          placeholder="https://..."
                          value={anuncio.fonte || ""}
                          onChange={(e) => updateAnuncio(anuncio.id, 'fonte', e.target.value)}
                          className="h-9 sm:h-8 text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resumo dos anúncios calculados */}
              {state.anuncioData && state.anuncioData.med_m2 > 0 && (
                <>
                  <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-[10px] sm:text-xs font-medium text-amber-800 dark:text-amber-200 mb-1.5 sm:mb-2">
                      📊 Valores calculados:
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Mín</p>
                        <p className="text-xs sm:text-sm font-semibold">{formatCurrency(state.anuncioData.min_m2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Méd</p>
                        <p className="text-xs sm:text-sm font-semibold text-primary">{formatCurrency(state.anuncioData.med_m2)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Máx</p>
                        <p className="text-xs sm:text-sm font-semibold">{formatCurrency(state.anuncioData.max_m2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Alerta de qualidade da amostra */}
                  {(() => {
                    const validAnuncios = anuncios.filter(a => a.valor_total > 0 && a.area_m2 > 0);
                    const numAnuncios = validAnuncios.length;
                    const itbiCount = state.itbiData?.transaction_count || 0;
                    const rawTrend = state.itbiData 
                      ? ((state.anuncioData.med_m2 - state.itbiData.med_m2) / state.itbiData.med_m2) * 100 
                      : 0;
                    const absRawTrend = Math.abs(rawTrend);
                    
                    // Alertas baseados na qualidade dos dados
                    if (numAnuncios < 3 && absRawTrend > 30) {
                      return (
                        <Alert variant="destructive" className="mt-2 py-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            <strong>Atenção:</strong> Apenas {numAnuncios} anúncio(s) com variação de {rawTrend.toFixed(0)}% vs dados oficiais ({itbiCount} transações). 
                            Amostra insuficiente para representatividade. Adicione mais anúncios comparáveis.
                          </AlertDescription>
                        </Alert>
                      );
                    }
                    
                    if (absRawTrend > 50) {
                      return (
                        <Alert className="mt-2 py-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30">
                          <Info className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                            <strong>Nota:</strong> Diferença de {rawTrend.toFixed(0)}% será limitada a ±50% no cálculo. 
                            Causas comuns: anúncios com preços supervalorizados ou características muito distintas dos dados oficiais.
                          </AlertDescription>
                        </Alert>
                      );
                    }

                    if (numAnuncios < 3) {
                      return (
                        <Alert className="mt-2 py-2">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Recomendamos pelo menos 3 anúncios para melhor representatividade do mercado.
                          </AlertDescription>
                        </Alert>
                      );
                    }

                    return null;
                  })()}
                </>
              )}

              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                Os anúncios não entram no valor de referência (100% transações reais). Eles medem o gap entre preço pedido e preço fechado.
              </p>
            </div>

            {/* Trend indicator */}
            {combined && combined.trend_percentage !== null && combined.trend_percentage !== 0 && (
              <div className={`flex flex-col gap-1 p-2 sm:p-3 rounded-lg bg-background ${trendColor}`}>
                <div className="flex items-center gap-2">
                  <TrendIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-xs sm:text-sm">
                      TREND: {combined.trend_percentage! > 0 ? "+" : ""}
                      {combined.trend_percentage!.toFixed(1)}%
                    </span>
                    <span className="text-[10px] sm:text-sm ml-1 sm:ml-2">
                      ({combined.trend_direction === "UP" ? "ALTA" : combined.trend_direction === "DOWN" ? "BAIXA" : "ESTÁVEL"})
                    </span>
                  </div>
                </div>
                {/* Alerta quando trend foi limitado */}
                {combined.trend_capped && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    ⚠ Valor original: {combined.trend_original?.toFixed(1)}% (limitado a ±50% por baixa representatividade)
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
