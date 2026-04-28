import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Layers, Grid3X3, Loader2, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TerritorialCondominio, MapBounds, LotePAL } from "@/hooks/useTerritorialData";

interface FocusCoord { lat: number; lng: number; }

interface TerritorialMapProps {
  condominios: TerritorialCondominio[];
  selectedId: string | null;
  onSelect: (condo: TerritorialCondominio) => void;
  onBoundsChange: (bounds: MapBounds) => void;
  showHeatmap: boolean;
  onToggleHeatmap: (v: boolean) => void;
  focusCoord: FocusCoord | null;
  lotes?: LotePAL[];
  showLotes: boolean;
  onToggleLotes: (v: boolean) => void;
  currentZoom: number;
  onZoomChange: (zoom: number) => void;
}

declare global {
  interface Window {
    google: typeof google;
    initTerritorialMap?: () => void;
  }
}

const BARRA_CENTER = { lat: -22.988, lng: -43.32 };
const BARRA_ZOOM = 13;

function getMarkerColor(unidades: number | null): string {
  if (!unidades || unidades === 0) return "#94A3B8";
  if (unidades <= 50) return "#93C5FD";
  if (unidades <= 150) return "#3B82F6";
  if (unidades <= 300) return "#1D4ED8";
  return "#7C3AED";
}

export function TerritorialMap({
  condominios, selectedId, onSelect, onBoundsChange,
  showHeatmap, onToggleHeatmap, focusCoord,
  lotes = [], showLotes, onToggleLotes,
  currentZoom, onZoomChange,
}: TerritorialMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const lotesPolygonsRef = useRef<google.maps.Polygon[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch API key
  useEffect(() => {
    (async () => {
      try {
        const resp = await supabase.functions.invoke("get-google-maps-key");
        if (resp.data?.apiKey) setApiKey(resp.data.apiKey);
      } catch (e) { console.error("Error fetching API key:", e); }
      finally { setLoading(false); }
    })();
  }, []);

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) return;
    if (window.google?.maps?.visualization) { setMapReady(true); return; }

    const existing = document.getElementById("google-maps-script");
    if (existing) {
      if (window.google?.maps?.visualization) { setMapReady(true); return; }
      const handler = () => setMapReady(true);
      existing.addEventListener("load", handler, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker,visualization&callback=initTerritorialMap`;
    script.async = true;
    script.defer = true;
    window.initTerritorialMap = () => setMapReady(true);
    document.head.appendChild(script);
  }, [apiKey]);

  // Init map
  useEffect(() => {
    if (!mapReady || !mapElementRef.current || mapRef.current) return;

    const map = new google.maps.Map(mapElementRef.current, {
      center: BARRA_CENTER, zoom: BARRA_ZOOM,
      mapId: "territorial-map",
      mapTypeControl: false, streetViewControl: true,
      fullscreenControl: true, zoomControl: true,
      styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
    });
    mapRef.current = map;

    const emitBounds = () => {
      const b = map.getBounds();
      if (!b) return;
      onBoundsChange({
        north: b.getNorthEast().lat(), south: b.getSouthWest().lat(),
        east: b.getNorthEast().lng(), west: b.getSouthWest().lng(),
      });
      onZoomChange(map.getZoom() || BARRA_ZOOM);
    };

    map.addListener("idle", emitBounds);
    emitBounds();
  }, [mapReady, onBoundsChange, onZoomChange]);

  // Focus coord
  useEffect(() => {
    if (focusCoord && mapRef.current) {
      mapRef.current.panTo({ lat: focusCoord.lat, lng: focusCoord.lng });
      mapRef.current.setZoom(16);
    }
  }, [focusCoord]);

  // Heatmap
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;

    if (showHeatmap) {
      if (heatmapRef.current) heatmapRef.current.setMap(null);
      const heatData = condominios
        .filter(c => c.latitude != null && c.longitude != null)
        .map(c => ({
          location: new google.maps.LatLng(c.latitude, c.longitude),
          weight: Math.max(0.2, Math.min(1, (c.unidades_estimadas || 50) / 500)),
        }));
      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: heatData, map,
        radius: 50, opacity: 0.85,
        gradient: [
          "rgba(0,0,0,0)",
          "rgba(147,197,253,0.6)",
          "#3B82F6",
          "#1D4ED8",
          "#7C3AED",
          "#DC2626",
        ],
      });
    } else if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
      heatmapRef.current = null;
    }
  }, [showHeatmap, condominios]);

  // Lotes PAL layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;

    // Clear previous
    lotesPolygonsRef.current.forEach(p => p.setMap(null));
    lotesPolygonsRef.current = [];

    if (!showLotes || currentZoom < 15) return;

    lotes.forEach(lote => {
      if (!lote.geom_geojson) return;
      try {
        const geojson = typeof lote.geom_geojson === "string" ? JSON.parse(lote.geom_geojson) : lote.geom_geojson;
        const coords = geojson.type === "Polygon" ? geojson.coordinates[0] :
          geojson.type === "MultiPolygon" ? geojson.coordinates[0][0] : null;
        if (!coords) return;

        const path = coords.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
        const polygon = new google.maps.Polygon({
          paths: path, map,
          strokeColor: "#3B82F6", strokeWeight: 1,
          fillColor: "#3B82F6", fillOpacity: 0.05,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="font-size:11px;"><strong>${lote.logradouro || "Lote"}</strong>${lote.area_lote ? `<br/>${Number(lote.area_lote).toLocaleString("pt-BR")} m²` : ""}</div>`,
        });
        polygon.addListener("click", (e: any) => {
          infoWindow.setPosition(e.latLng);
          infoWindow.open(map);
        });

        lotesPolygonsRef.current.push(polygon);
      } catch { /* skip invalid geojson */ }
    });
  }, [lotes, showLotes, currentZoom]);

  // Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;

    // Clear previous markers
    markersRef.current.forEach(m => m.map = null);
    markersRef.current = [];

    if (showHeatmap) return;

    const zoom = map.getZoom() || BARRA_ZOOM;
    const shouldCluster = zoom < 14;

    type ClusterItem = TerritorialCondominio & { _clusterCount?: number };
    let markersToRender: ClusterItem[];

    if (shouldCluster) {
      const grid: Record<string, TerritorialCondominio[]> = {};
      condominios.forEach(c => {
        if (c.latitude == null || c.longitude == null) return;
        const key = `${Math.round(c.latitude * 100)}_${Math.round(c.longitude * 100)}`;
        if (!grid[key]) grid[key] = [];
        grid[key].push(c);
      });
      markersToRender = Object.values(grid).map(group => ({
        ...group[0], _clusterCount: group.length,
      }));
    } else {
      markersToRender = condominios.filter(c => c.latitude != null && c.longitude != null);
    }

    markersToRender.forEach(c => {
      const hasPrice = c.preco_medio_m2 != null && c.preco_medio_m2 > 0;
      const color = getMarkerColor(c.unidades_estimadas);
      const isSelected = c.id === selectedId;
      const clusterCount = (c as ClusterItem)._clusterCount ?? 1;
      const isCluster = clusterCount > 1;

      const size = isSelected ? 20 : isCluster ? 28 : 14;

      let html: string;
      if (isCluster) {
        html = `<div style="background:hsl(210,80%,45%);color:white;border-radius:50%;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer;">${clusterCount}</div>`;
      } else {
        const opacity = hasPrice ? 0.85 : 0.3;
        const border = isSelected ? "3px solid #F59E0B" : hasPrice ? `2px solid ${color}` : `1px dashed #94A3B8`;
        html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};opacity:${opacity};border:${border};cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.2);"></div>`;
      }

      const markerEl = document.createElement("div");
      markerEl.innerHTML = html;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map, position: { lat: c.latitude, lng: c.longitude },
        content: markerEl,
        title: isCluster ? `${clusterCount} condomínios` : c.nome_condominio || c.logradouro_padrao,
      });

      const infoWindow = new google.maps.InfoWindow();

      if (isCluster) {
        marker.addListener("click", () => {
          map.panTo({ lat: c.latitude, lng: c.longitude });
          map.setZoom(zoom + 2);
        });
      } else {
        marker.addListener("click", () => onSelect(c));

        markerEl.addEventListener("mouseenter", () => {
          const priceText = hasPrice
            ? `<div style="color:#7C3AED;font-weight:700;">R$ ${Number(c.preco_medio_m2).toLocaleString("pt-BR")}/m²</div>`
            : `<div style="font-size:10px;color:#94A3B8;font-style:italic;margin-top:4px;">Sem transações ITBI registradas no raio de 150m.</div>`;
          infoWindow.setContent(`
            <div style="min-width:180px;font-size:12px;line-height:1.5;">
              <div style="font-weight:600;margin-bottom:2px;">${c.nome_condominio || c.logradouro_padrao}</div>
              <div style="font-size:11px;color:#6b7280;">${c.numero_torres ?? "?"} torre(s) · ${c.unidades_estimadas ?? "?"} unidades</div>
              ${priceText}
            </div>
          `);
          infoWindow.open(map, marker);
        });
        markerEl.addEventListener("mouseleave", () => infoWindow.close());
      }

      markersRef.current.push(marker);
    });
  }, [condominios, selectedId, showHeatmap, onSelect]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/30 rounded-lg" style={{ minHeight: "400px" }}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapElementRef} className="h-full w-full rounded-lg" style={{ minHeight: "400px" }} />

      <div className="absolute top-2 right-2 z-[1000]">
        <div className="bg-background rounded-md shadow-md p-1 border border-border">
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => {
              mapRef.current?.panTo(BARRA_CENTER);
              mapRef.current?.setZoom(BARRA_ZOOM);
            }}
            title="Centralizar na Barra"
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <TooltipProvider delayDuration={150}>
        <div className="absolute bottom-16 left-2 md:bottom-4 md:left-4 z-[1000] bg-background/95 backdrop-blur rounded-lg p-2 md:p-3 shadow-md border border-border space-y-1.5 md:space-y-2">
          <div className="flex items-center gap-1.5 md:gap-2">
            <Layers className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
            <Label htmlFor="heatmap-toggle" className="text-[10px] md:text-xs font-medium">Heatmap</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Sobre o Heatmap">
                  <HelpCircle className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] text-xs">
                Mapa de calor ponderado pelo número estimado de unidades. Áreas em vermelho/roxo indicam maior densidade construtiva (mais unidades por região). Útil para identificar polos de adensamento na Barra.
              </TooltipContent>
            </Tooltip>
            <Switch id="heatmap-toggle" checked={showHeatmap} onCheckedChange={onToggleHeatmap} />
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <Grid3X3 className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
            <Label htmlFor="lotes-toggle" className="text-[10px] md:text-xs font-medium">Lotes</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Sobre os Lotes">
                  <HelpCircle className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] text-xs">
                Exibe os contornos dos lotes oficiais (PAL — Projeto de Alinhamento) sobrepostos ao mapa. Disponível apenas a partir do zoom 15. Clique em um lote para ver logradouro e área (m²).
              </TooltipContent>
            </Tooltip>
            <Switch id="lotes-toggle" checked={showLotes} onCheckedChange={onToggleLotes} />
            {showLotes && currentZoom < 15 && (
              <span className="text-[10px] text-muted-foreground ml-1">zoom 15+</span>
            )}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
