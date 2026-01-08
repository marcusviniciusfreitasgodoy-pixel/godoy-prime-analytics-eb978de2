import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';

// Fix for default markers in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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
  const minRadius = 8;
  const maxRadius = 25;
  const scale = Math.min(transacoes / 50, 1);
  return minRadius + (maxRadius - minRadius) * scale;
};

// Coordenadas centrais dos bairros
const BAIRRO_CENTERS: Record<string, [number, number]> = {
  'BARRA DA TIJUCA': [-23.0000, -43.3650],
  'RECREIO DOS BANDEIRANTES': [-23.0250, -43.4650],
  'JACAREPAGUA': [-22.9500, -43.3500],
  'COPACABANA': [-22.9700, -43.1850],
  'IPANEMA': [-22.9850, -43.2000],
  'LEBLON': [-22.9850, -43.2200],
  'BOTAFOGO': [-22.9500, -43.1850],
  'TIJUCA': [-22.9250, -43.2350],
  'FLAMENGO': [-22.9300, -43.1750],
  'LARANJEIRAS': [-22.9350, -43.1850],
  'GAVEA': [-22.9950, -43.2350],
  'JARDIM BOTANICO': [-22.9700, -43.2250],
  'LAGOA': [-22.9750, -43.2100],
  'SAO CONRADO': [-23.0050, -43.2700],
  'HUMAITA': [-22.9550, -43.1950],
  'URCA': [-22.9500, -43.1650],
  'CENTRO': [-22.9050, -43.1800],
  'VILA ISABEL': [-22.9200, -43.2500],
  'MEIER': [-22.9050, -43.2800],
};

export function TransactionMap({ data, bairro, isLoading }: TransactionMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Inicializa o mapa
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const center = BAIRRO_CENTERS[bairro.toUpperCase()] || BAIRRO_CENTERS['BARRA DA TIJUCA'];
    
    map.current = L.map(mapContainer.current, {
      center: center,
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    // Tile layer do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map.current);

    // Layer para os marcadores
    markersLayer.current = L.layerGroup().addTo(map.current);
    
    setMapReady(true);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Atualiza centro quando bairro muda
  useEffect(() => {
    if (!map.current) return;
    
    const center = BAIRRO_CENTERS[bairro.toUpperCase()] || BAIRRO_CENTERS['BARRA DA TIJUCA'];
    map.current.setView(center, 14);
  }, [bairro]);

  // Atualiza marcadores quando data muda
  useEffect(() => {
    if (!mapReady || !markersLayer.current || !data) return;

    // Limpa marcadores anteriores
    markersLayer.current.clearLayers();

    if (data.length === 0) return;

    const bounds: L.LatLngBounds = L.latLngBounds([]);

    data.forEach((item) => {
      if (!item.latitude || !item.longitude) return;

      const color = getPriceColor(item.preco_medio_m2);
      const radius = getRadius(item.total_transacoes);

      const marker = L.circleMarker([item.latitude, item.longitude], {
        radius: radius,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      });

      // Popup com detalhes
      const popupContent = `
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
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

      marker.bindPopup(popupContent);
      
      // Tooltip no hover
      marker.bindTooltip(`${item.microbairro}`, {
        permanent: false,
        direction: 'top',
        className: 'custom-tooltip',
      });

      markersLayer.current?.addLayer(marker);
      bounds.extend([item.latitude, item.longitude]);
    });

    // Ajusta o zoom para mostrar todos os marcadores
    if (bounds.isValid() && data.length > 1) {
      map.current?.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [data, mapReady]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-border">
      {/* Mapa */}
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-[1000]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Carregando mapa...</span>
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
