/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Loader2, Filter, X, Calendar, DollarSign, ChevronDown, CircleDot, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TransactionMapData {
  microbairro: string;
  total_transacoes: number;
  preco_medio_m2: number;
  latitude?: number;
  longitude?: number;
  aproximado?: boolean;
}

interface MapFilters {
  periodoMeses: number;
  precoMin: number;
  precoMax: number;
}

type ViewMode = 'markers' | 'heatmap';
type HeatmapMetric = 'density' | 'price';

interface TransactionMapProps {
  data: TransactionMapData[];
  bairro: string;
  isLoading?: boolean;
  onFiltersChange?: (filters: MapFilters) => void;
  initialFilters?: Partial<MapFilters>;
}

// Faixas de preço pré-definidas
const PRICE_RANGES = [
  { label: 'Todos', min: 0, max: 100000 },
  { label: 'Até R$ 10.000/m²', min: 0, max: 10000 },
  { label: 'R$ 10.000 - 20.000/m²', min: 10000, max: 20000 },
  { label: 'R$ 20.000 - 35.000/m²', min: 20000, max: 35000 },
  { label: 'Acima de R$ 35.000/m²', min: 35000, max: 100000 },
];

// Períodos disponíveis
const PERIOD_OPTIONS = [
  { value: 3, label: 'Últimos 3 meses' },
  { value: 6, label: 'Últimos 6 meses' },
  { value: 12, label: 'Último ano' },
  { value: 24, label: 'Últimos 2 anos' },
  { value: 36, label: 'Últimos 3 anos' },
];

// Cores por faixa de preço/m²
const getPriceColor = (preco: number): string => {
  if (preco <= 10000) return '#22c55e'; // green-500
  if (preco <= 20000) return '#eab308'; // yellow-500
  if (preco <= 35000) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
};

// Tamanho do círculo baseado no volume de transações
const getRadius = (transacoes: number): number => {
  const minRadius = 15;
  const maxRadius = 40;
  const scale = Math.min(transacoes / 50, 1);
  return minRadius + (maxRadius - minRadius) * scale;
};

// Coordenadas centrais dos bairros
const BAIRRO_CENTERS: Record<string, { lat: number; lng: number }> = {
  'BARRA DA TIJUCA': { lat: -23.0000, lng: -43.3650 },
  'RECREIO DOS BANDEIRANTES': { lat: -23.0250, lng: -43.4650 },
  'JACAREPAGUA': { lat: -22.9500, lng: -43.3500 },
  'COPACABANA': { lat: -22.9700, lng: -43.1850 },
  'IPANEMA': { lat: -22.9850, lng: -43.2000 },
  'LEBLON': { lat: -22.9850, lng: -43.2200 },
  'BOTAFOGO': { lat: -22.9500, lng: -43.1850 },
  'TIJUCA': { lat: -22.9250, lng: -43.2350 },
  'FLAMENGO': { lat: -22.9300, lng: -43.1750 },
  'LARANJEIRAS': { lat: -22.9350, lng: -43.1850 },
  'GAVEA': { lat: -22.9950, lng: -43.2350 },
  'JARDIM BOTANICO': { lat: -22.9700, lng: -43.2250 },
  'LAGOA': { lat: -22.9750, lng: -43.2100 },
  'SAO CONRADO': { lat: -23.0050, lng: -43.2700 },
  'HUMAITA': { lat: -22.9550, lng: -43.1950 },
  'URCA': { lat: -22.9500, lng: -43.1650 },
  'CENTRO': { lat: -22.9050, lng: -43.1800 },
  'VILA ISABEL': { lat: -22.9200, lng: -43.2500 },
  'MEIER': { lat: -22.9050, lng: -43.2800 },
};

declare global {
  interface Window {
    google: typeof google;
    initGoogleMap: () => void;
  }
}

export function TransactionMap({ 
  data, 
  bairro, 
  isLoading, 
  onFiltersChange,
  initialFilters 
}: TransactionMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const heatmapLayer = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const infoWindow = useRef<google.maps.InfoWindow | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Estado de visualização
  const [viewMode, setViewMode] = useState<ViewMode>('markers');
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('density');
  
  // Estado dos filtros
  const [filters, setFilters] = useState<MapFilters>({
    periodoMeses: initialFilters?.periodoMeses || 12,
    precoMin: initialFilters?.precoMin || 0,
    precoMax: initialFilters?.precoMax || 100000,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Atualiza filtros e notifica parent
  const updateFilters = useCallback((newFilters: Partial<MapFilters>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      onFiltersChange?.(updated);
      return updated;
    });
  }, [onFiltersChange]);

  // Filtra os dados localmente baseado nos filtros
  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(item => {
      const preco = item.preco_medio_m2;
      return preco >= filters.precoMin && preco <= filters.precoMax;
    });
  }, [data, filters.precoMin, filters.precoMax]);

  // Verifica se há filtros ativos
  const hasActiveFilters = useMemo(() => {
    return filters.periodoMeses !== 12 || filters.precoMin > 0 || filters.precoMax < 100000;
  }, [filters]);

  // Label do período selecionado
  const selectedPeriodLabel = useMemo(() => {
    return PERIOD_OPTIONS.find(p => p.value === filters.periodoMeses)?.label || 'Último ano';
  }, [filters.periodoMeses]);

  // Label da faixa de preço selecionada
  const selectedPriceLabel = useMemo(() => {
    const range = PRICE_RANGES.find(r => r.min === filters.precoMin && r.max === filters.precoMax);
    if (range) return range.label;
    return `R$ ${(filters.precoMin / 1000).toFixed(0)}k - ${(filters.precoMax / 1000).toFixed(0)}k`;
  }, [filters.precoMin, filters.precoMax]);

  // Limpa todos os filtros
  const clearFilters = useCallback(() => {
    updateFilters({ periodoMeses: 12, precoMin: 0, precoMax: 100000 });
  }, [updateFilters]);

  // Busca a API key do Google Maps
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        console.log('Fetching Google Maps API key...');
        const response = await supabase.functions.invoke('get-google-maps-key');
        
        if (response.error) {
          console.error('Error fetching Google Maps API key:', response.error);
          setError('Erro ao carregar chave do Google Maps');
          return;
        }

        if (response.data?.apiKey) {
          console.log('API key loaded successfully');
          setApiKey(response.data.apiKey);
        } else {
          console.error('No API key in response:', response.data);
          setError('Chave do Google Maps não configurada');
        }
      } catch (err) {
        console.error('Error fetching API key:', err);
        setError('Erro ao conectar com o servidor');
      } finally {
        setApiKeyLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  // Carrega o script do Google Maps com biblioteca de visualização
  useEffect(() => {
    if (!apiKey) return;

    // Se o Google Maps já estiver disponível (script já carregado em outra tela), marcar como pronto
    if (typeof window !== 'undefined' && window.google?.maps?.visualization) {
      setMapReady(true);
      return;
    }

    const existing = document.getElementById('google-maps-script') as HTMLScriptElement | null;
    if (existing) {
      // Script existe mas ainda não carregou: garantir callback e aguardar load
      window.initGoogleMap = () => setMapReady(true);
      existing.addEventListener('load', window.initGoogleMap, { once: true });
      existing.addEventListener('error', () => setError('Erro ao carregar Google Maps'), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    // Adicionar biblioteca de visualização para heatmap
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker,visualization&callback=initGoogleMap`;
    script.async = true;
    script.defer = true;

    window.initGoogleMap = () => {
      setMapReady(true);
    };

    script.addEventListener('error', () => setError('Erro ao carregar Google Maps'));

    document.head.appendChild(script);

    return () => {
      // Cleanup não remove o script para evitar recarregamento
    };
  }, [apiKey]);

  // Inicializa o mapa quando o script estiver carregado
  useEffect(() => {
    if (!mapReady || !mapContainer.current || map.current) return;

    const center = BAIRRO_CENTERS[bairro.toUpperCase()] || BAIRRO_CENTERS['BARRA DA TIJUCA'];
    
    map.current = new google.maps.Map(mapContainer.current, {
      center: center,
      zoom: 14,
      mapId: 'transaction-map',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    infoWindow.current = new google.maps.InfoWindow();
  }, [mapReady, bairro]);

  // Atualiza centro quando bairro muda
  useEffect(() => {
    if (!map.current) return;
    
    const center = BAIRRO_CENTERS[bairro.toUpperCase()] || BAIRRO_CENTERS['BARRA DA TIJUCA'];
    map.current.setCenter(center);
    map.current.setZoom(14);
  }, [bairro]);

  // Cria marcador circular customizado
  const createCircleMarker = useCallback((color: string, radius: number, label: string) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius * 2}" viewBox="0 0 ${radius * 2} ${radius * 2}">
        <circle cx="${radius}" cy="${radius}" r="${radius - 2}" fill="${color}" fill-opacity="0.8" stroke="white" stroke-width="2"/>
      </svg>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = svg;
    div.style.cursor = 'pointer';
    div.title = label;
    
    return div;
  }, []);

  // Limpa marcadores
  const clearMarkers = useCallback(() => {
    markers.current.forEach(marker => {
      marker.map = null;
    });
    markers.current = [];
  }, []);

  // Limpa heatmap
  const clearHeatmap = useCallback(() => {
    if (heatmapLayer.current) {
      heatmapLayer.current.setMap(null);
      heatmapLayer.current = null;
    }
  }, []);

  // Cria os marcadores
  const createMarkers = useCallback(() => {
    if (!mapReady || !map.current || !filteredData) return;

    clearMarkers();
    
    if (filteredData.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    filteredData.forEach((item) => {
      if (!item.latitude || !item.longitude) return;

      const color = getPriceColor(item.preco_medio_m2);
      const radius = getRadius(item.total_transacoes);
      const position = { lat: item.latitude, lng: item.longitude };

      const markerElement = createCircleMarker(color, radius, item.microbairro);
      
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: map.current,
        position: position,
        content: markerElement,
        title: item.microbairro,
      });

      // Evento de clique para mostrar InfoWindow
      marker.addListener('click', () => {
        if (!infoWindow.current || !map.current) return;

        const content = `
          <div style="min-width: 200px; font-family: system-ui, sans-serif; padding: 8px;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
              ${item.microbairro}
            </h4>
            <div style="display: grid; gap: 4px; font-size: 12px; color: #666;">
              <div style="display: flex; justify-content: space-between;">
                <span>Preço médio:</span>
                <strong style="color: ${color};">R$ ${item.preco_medio_m2.toLocaleString('pt-BR')}/m²</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Transações:</span>
                <strong>${item.total_transacoes}</strong>
              </div>
              ${item.aproximado ? '<div style="color: #f59e0b; font-size: 11px;">📍 Localização aproximada</div>' : ''}
            </div>
          </div>
        `;

        infoWindow.current.setContent(content);
        infoWindow.current.open(map.current, marker);
      });

      markers.current.push(marker);
      bounds.extend(position);
    });

    // Ajusta o zoom para mostrar todos os marcadores
    if (filteredData.length > 1) {
      map.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [filteredData, mapReady, createCircleMarker, clearMarkers]);

  // Cria o heatmap
  const createHeatmap = useCallback(() => {
    if (!mapReady || !map.current || !filteredData || !window.google?.maps?.visualization) return;

    clearHeatmap();
    
    if (filteredData.length === 0) return;

    // Cria pontos ponderados para o heatmap
    const heatmapData = filteredData
      .filter(item => item.latitude && item.longitude)
      .map(item => {
        const location = new google.maps.LatLng(item.latitude!, item.longitude!);
        // Peso baseado na métrica selecionada
        let weight: number;
        if (heatmapMetric === 'density') {
          // Volume de transações
          weight = item.total_transacoes;
        } else {
          // Preço normalizado (0-1 baseado no range)
          weight = Math.min(item.preco_medio_m2 / 50000, 1) * 100;
        }
        return { location, weight };
      });

    // Gradiente de cores baseado na métrica
    const gradient = heatmapMetric === 'density' 
      ? [
          'rgba(0, 255, 255, 0)',
          'rgba(0, 255, 255, 1)',
          'rgba(0, 191, 255, 1)',
          'rgba(0, 127, 255, 1)',
          'rgba(0, 63, 255, 1)',
          'rgba(0, 0, 255, 1)',
          'rgba(0, 0, 223, 1)',
          'rgba(0, 0, 191, 1)',
          'rgba(0, 0, 159, 1)',
          'rgba(0, 0, 127, 1)',
          'rgba(63, 0, 91, 1)',
          'rgba(127, 0, 63, 1)',
          'rgba(191, 0, 31, 1)',
          'rgba(255, 0, 0, 1)',
        ]
      : [
          'rgba(34, 197, 94, 0)',     // green transparent
          'rgba(34, 197, 94, 0.8)',   // green
          'rgba(132, 204, 22, 0.8)',  // lime
          'rgba(234, 179, 8, 0.8)',   // yellow
          'rgba(249, 115, 22, 0.8)',  // orange
          'rgba(239, 68, 68, 0.9)',   // red
          'rgba(220, 38, 38, 1)',     // red darker
        ];

    heatmapLayer.current = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: map.current,
      radius: 50,
      opacity: 0.7,
      gradient: gradient,
    });

    // Ajusta o zoom
    if (filteredData.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      filteredData.forEach(item => {
        if (item.latitude && item.longitude) {
          bounds.extend({ lat: item.latitude, lng: item.longitude });
        }
      });
      map.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [filteredData, mapReady, heatmapMetric, clearHeatmap]);

  // Atualiza visualização quando modo ou dados mudam
  useEffect(() => {
    if (!mapReady || !map.current) return;

    if (viewMode === 'markers') {
      clearHeatmap();
      createMarkers();
    } else {
      clearMarkers();
      createHeatmap();
    }
  }, [viewMode, filteredData, mapReady, bairro, createMarkers, createHeatmap, clearMarkers, clearHeatmap]);

  // Atualiza heatmap quando métrica muda
  useEffect(() => {
    if (viewMode === 'heatmap' && mapReady && map.current) {
      createHeatmap();
    }
  }, [heatmapMetric, viewMode, mapReady, createHeatmap]);


  return (
    <div className="flex flex-col gap-4">
      {/* Barra de controles acima do mapa */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/50 rounded-lg p-3 border border-border">
        {/* Lado esquerdo - Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn(
                  "border-border",
                  hasActiveFilters && "border-primary"
                )}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                    {(filters.periodoMeses !== 12 ? 1 : 0) + (filters.precoMin > 0 || filters.precoMax < 100000 ? 1 : 0)}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Filtros do Mapa</h4>
                  {hasActiveFilters && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearFilters}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Filtro de Período */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Período
                  </label>
                  <Select 
                    value={String(filters.periodoMeses)} 
                    onValueChange={(val) => updateFilters({ periodoMeses: Number(val) })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de Faixa de Preço */}
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Faixa de Preço/m²
                  </label>
                  
                  {/* Botões rápidos de faixa */}
                  <div className="grid grid-cols-2 gap-2">
                    {PRICE_RANGES.map(range => (
                      <Button
                        key={range.label}
                        variant={filters.precoMin === range.min && filters.precoMax === range.max ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => updateFilters({ precoMin: range.min, precoMax: range.max })}
                      >
                        {range.label.replace('R$ ', '').replace('/m²', '')}
                      </Button>
                    ))}
                  </div>

                  {/* Slider customizado */}
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>R$ {(filters.precoMin / 1000).toFixed(0)}k</span>
                      <span>R$ {(filters.precoMax / 1000).toFixed(0)}k</span>
                    </div>
                    <Slider
                      value={[filters.precoMin, filters.precoMax]}
                      min={0}
                      max={100000}
                      step={5000}
                      onValueChange={([min, max]) => updateFilters({ precoMin: min, precoMax: max })}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Resumo de resultados */}
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Exibindo <strong className="text-foreground">{filteredData.length}</strong> de {data?.length || 0} logradouros
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Badges de filtros ativos */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5">
              {filters.periodoMeses !== 12 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs cursor-pointer hover:bg-secondary/80"
                  onClick={() => updateFilters({ periodoMeses: 12 })}
                >
                  {selectedPeriodLabel}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {(filters.precoMin > 0 || filters.precoMax < 100000) && (
                <Badge 
                  variant="secondary" 
                  className="text-xs cursor-pointer hover:bg-secondary/80"
                  onClick={() => updateFilters({ precoMin: 0, precoMax: 100000 })}
                >
                  {selectedPriceLabel}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Lado direito - Toggle de visualização e contador */}
        <div className="flex items-center gap-3">
          {/* Contador de pontos */}
          {filteredData && filteredData.length > 0 && (
            <span className="text-xs text-muted-foreground">
              <strong className="text-foreground">{filteredData.length}</strong> logradouros
            </span>
          )}

          {/* Toggle de Visualização */}
          <TooltipProvider>
            <div className="flex gap-2">
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(v) => v && setViewMode(v as ViewMode)}
                className="border border-border rounded-md"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="markers" size="sm" className="px-3">
                      <CircleDot className="h-4 w-4" />
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Marcadores</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value="heatmap" size="sm" className="px-3">
                      <Flame className="h-4 w-4" />
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Mapa de calor</p>
                  </TooltipContent>
                </Tooltip>
              </ToggleGroup>

              {/* Seletor de métrica do heatmap */}
              {viewMode === 'heatmap' && (
                <Select value={heatmapMetric} onValueChange={(v) => setHeatmapMetric(v as HeatmapMetric)}>
                  <SelectTrigger className="w-[120px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="density">Volume</SelectItem>
                    <SelectItem value="price">Preço/m²</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Mapa */}
      <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-border">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {/* Loading overlay */}
        {(isLoading || apiKeyLoading || !mapReady) && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-[1000]">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {apiKeyLoading ? 'Carregando configurações...' : 'Carregando mapa...'}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-[1000]">
            <div className="text-center p-4">
              <p className="text-sm text-destructive mb-2">{error}</p>
              <p className="text-xs text-muted-foreground">
                Configure GOOGLE_MAPS_API_KEY nas configurações do backend
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legenda abaixo do mapa */}
      <div className="flex flex-wrap items-start justify-between gap-4 bg-muted/50 rounded-lg p-3 border border-border">
        {viewMode === 'markers' ? (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs font-semibold text-foreground">Preço/m²:</span>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
                <span className="text-xs text-muted-foreground">Até R$ 10.000</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#eab308]" />
                <span className="text-xs text-muted-foreground">R$ 10.000 - 20.000</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#f97316]" />
                <span className="text-xs text-muted-foreground">R$ 20.000 - 35.000</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                <span className="text-xs text-muted-foreground">Acima de R$ 35.000</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Tamanho do marcador = volume de transações
            </span>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs font-semibold text-foreground">
                {heatmapMetric === 'density' ? 'Volume de Transações:' : 'Preço/m²:'}
              </span>
              <div className="flex items-center gap-2">
                <div 
                  className="w-24 h-3 rounded"
                  style={{
                    background: heatmapMetric === 'density'
                      ? 'linear-gradient(to right, rgba(0,255,255,0.8), rgba(0,0,255,0.8), rgba(127,0,63,0.8), rgba(255,0,0,0.9))'
                      : 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444)'
                  }}
                />
              </div>
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                <span>{heatmapMetric === 'density' ? 'Baixo' : 'Menor'}</span>
                <span>→</span>
                <span>{heatmapMetric === 'density' ? 'Alto' : 'Maior'}</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {heatmapMetric === 'density' 
                ? 'Áreas com mais transações' 
                : 'Cores quentes = preços mais altos'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
