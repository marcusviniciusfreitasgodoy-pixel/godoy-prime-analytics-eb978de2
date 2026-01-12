/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TransactionMapData {
  microbairro: string;
  total_transacoes: number;
  preco_medio_m2: number;
  latitude?: number;
  longitude?: number;
  aproximado?: boolean;
}

interface TransactionMapProps {
  data: TransactionMapData[];
  bairro: string;
  isLoading?: boolean;
}

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

export function TransactionMap({ data, bairro, isLoading }: TransactionMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindow = useRef<google.maps.InfoWindow | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Busca a API key do Google Maps
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        
        if (error) {
          console.error('Error fetching Google Maps API key:', error);
          setError('Erro ao carregar chave do Google Maps');
          return;
        }

        if (data?.apiKey) {
          setApiKey(data.apiKey);
        } else {
          setError('Chave do Google Maps não configurada');
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Erro ao conectar com o servidor');
      } finally {
        setApiKeyLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  // Carrega o script do Google Maps
  useEffect(() => {
    if (!apiKey || document.getElementById('google-maps-script')) return;

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&callback=initGoogleMap`;
    script.async = true;
    script.defer = true;

    window.initGoogleMap = () => {
      setMapReady(true);
    };

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

  // Atualiza marcadores quando data/bairro muda
  useEffect(() => {
    if (!mapReady || !map.current || !data) return;

    // Limpa marcadores anteriores
    markers.current.forEach(marker => {
      marker.map = null;
    });
    markers.current = [];

    if (data.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    data.forEach((item) => {
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
    if (data.length > 1) {
      map.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [data, mapReady, bairro, createCircleMarker]);

  if (error) {
    return (
      <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-border bg-muted/50 flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-sm text-destructive mb-2">{error}</p>
          <p className="text-xs text-muted-foreground">
            Configure GOOGLE_MAPS_API_KEY nas configurações do backend
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-border">
      {/* Mapa */}
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

      {/* Legenda */}
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000] border border-border">
        <div className="text-xs font-semibold mb-2 text-foreground">Preço/m²</div>
        <div className="space-y-1.5">
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
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-[10px] text-muted-foreground">
            Tamanho = volume de transações
          </div>
        </div>
      </div>

      {/* Contador de pontos */}
      {data && data.length > 0 && (
        <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg z-[1000] border border-border">
          <span className="text-xs font-medium text-foreground">{data.length} logradouros</span>
        </div>
      )}
    </div>
  );
}
