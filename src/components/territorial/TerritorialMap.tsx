import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, Layers, Grid3X3 } from "lucide-react";
import type { TerritorialCondominio, MapBounds, LotePAL } from "@/hooks/useTerritorialData";

interface FocusCoord {
  lat: number;
  lng: number;
}

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
    L?: any;
  }
}

const BARRA_CENTER: [number, number] = [-22.988, -43.32];
const BARRA_ZOOM = 13;

function getMarkerColor(unidades: number | null): string {
  if (!unidades || unidades === 0) return "#94A3B8";
  if (unidades <= 50) return "#93C5FD";
  if (unidades <= 150) return "#3B82F6";
  if (unidades <= 300) return "#1D4ED8";
  return "#7C3AED";
}

async function ensureLeafletLoaded() {
  if (window.L) return window.L;

  if (!document.getElementById("leaflet-css")) {
    const css = document.createElement("link");
    css.id = "leaflet-css";
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("leaflet-js") as HTMLScriptElement | null;
    if (existing) {
      if (window.L) resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar mapa"));
    document.body.appendChild(script);
  });

  return window.L;
}

async function ensureHeatLoaded() {
  if ((window.L as any)?.heatLayer) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("leaflet-heat-js");
    if (existing) {
      if ((window.L as any)?.heatLayer) resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "leaflet-heat-js";
    script.src = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar heatmap"));
    document.body.appendChild(script);
  });
}

export function TerritorialMap({
  condominios,
  selectedId,
  onSelect,
  onBoundsChange,
  showHeatmap,
  onToggleHeatmap,
  focusCoord,
  lotes = [],
  showLotes,
  onToggleLotes,
  currentZoom,
  onZoomChange,
}: TerritorialMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const lotesLayerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      if (!mapElementRef.current || mapRef.current) return;

      const L = await ensureLeafletLoaded();
      if (cancelled || !mapElementRef.current) return;

      const map = L.map(mapElementRef.current, {
        center: BARRA_CENTER,
        zoom: BARRA_ZOOM,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      lotesLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      const emitBounds = () => {
        const b = map.getBounds();
        onBoundsChange({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
        onZoomChange(map.getZoom());
      };

      emitBounds();
      map.on("moveend", emitBounds);
    };

    initMap();

    return () => {
      cancelled = true;
      if (heatLayerRef.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersLayerRef.current = null;
      lotesLayerRef.current = null;
    };
  }, [onBoundsChange, onZoomChange]);

  // flyTo when focusCoord changes
  useEffect(() => {
    if (focusCoord && mapRef.current) {
      mapRef.current.flyTo([focusCoord.lat, focusCoord.lng], 16, { duration: 1.5 });
    }
  }, [focusCoord]);

  // P2.2: Real heatmap with leaflet.heat
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (showHeatmap) {
      ensureHeatLoaded().then(() => {
        const L = window.L;
        if (!L?.heatLayer || !mapRef.current) return;

        // Remove previous
        if (heatLayerRef.current) {
          heatLayerRef.current.remove();
        }

        const heatPoints = condominios
          .filter(c => c.latitude != null && c.longitude != null)
          .map(c => [
            c.latitude,
            c.longitude,
            Math.min(1, (c.unidades_estimadas || 1) / 500),
          ]);

        heatLayerRef.current = (L as any).heatLayer(heatPoints, {
          radius: 35,
          blur: 25,
          maxZoom: 16,
          max: 1.0,
          gradient: {
            0.2: "#93C5FD",
            0.5: "#3B82F6",
            0.8: "#1D4ED8",
            1.0: "#7C3AED",
          },
        }).addTo(mapRef.current);
      }).catch(console.error);
    } else {
      if (heatLayerRef.current) {
        heatLayerRef.current.remove();
        heatLayerRef.current = null;
      }
    }
  }, [showHeatmap, condominios]);

  // P2.1: Lotes PAL layer
  useEffect(() => {
    const lotesLayer = lotesLayerRef.current;
    const L = window.L;
    if (!lotesLayer || !L) return;

    lotesLayer.clearLayers();

    if (!showLotes || currentZoom < 15) return;

    lotes.forEach((lote) => {
      if (!lote.geom_geojson) return;
      try {
        const geoLayer = L.geoJSON(lote.geom_geojson, {
          style: {
            color: "#3B82F6",
            weight: 1,
            fillOpacity: 0.05,
            fillColor: "#3B82F6",
          },
        });
        geoLayer.bindTooltip(
          `<div style="font-size:11px;">
            <strong>${lote.logradouro || "Lote"}</strong>
            ${lote.area_lote ? `<br/>${Number(lote.area_lote).toLocaleString("pt-BR")} m²` : ""}
          </div>`,
          { sticky: true }
        );
        geoLayer.addTo(lotesLayer);
      } catch (e) {
        // Skip invalid geojson
      }
    });
  }, [lotes, showLotes, currentZoom]);

  // Markers layer
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    const L = window.L;
    if (!map || !layer || !L) return;

    layer.clearLayers();

    // When heatmap is active, don't show markers
    if (showHeatmap) return;

    const zoom = map.getZoom();
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
        ...group[0],
        _clusterCount: group.length,
      }));
    } else {
      markersToRender = condominios.filter(c => c.latitude != null && c.longitude != null);
    }

    markersToRender.forEach((c) => {
      const hasPrice = c.preco_medio_m2 != null && c.preco_medio_m2 > 0;
      const color = getMarkerColor(c.unidades_estimadas);
      const isSelected = c.id === selectedId;
      const clusterCount = (c as ClusterItem)._clusterCount ?? 1;
      const isCluster = clusterCount > 1;

      const marker = L.circleMarker([c.latitude, c.longitude], {
        radius: isSelected ? 10 : 7,
        fillColor: color,
        fillOpacity: hasPrice ? 0.85 : 0.3,
        color: isSelected ? "#F59E0B" : hasPrice ? color : "#94A3B8",
        weight: isSelected ? 3 : hasPrice ? 2 : 1,
        dashArray: hasPrice ? undefined : "4 4",
      });

      if (isCluster) {
        marker.on("click", () => {
          map.flyTo([c.latitude, c.longitude], zoom + 2, { duration: 0.8 });
        });
        marker.bindTooltip(
          `<div style="font-size:12px;font-weight:600;text-align:center;">${clusterCount} condomínios<br/><span style="font-weight:400;font-size:11px;">Clique para zoom</span></div>`,
          { sticky: true, direction: "top" }
        );
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:hsl(var(--accent));color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);">${clusterCount}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([c.latitude, c.longitude], { icon }).addTo(layer).on("click", () => {
          map.flyTo([c.latitude, c.longitude], zoom + 2, { duration: 0.8 });
        });
      } else {
        marker.on("click", () => onSelect(c));
        const priceText = hasPrice
          ? `<div style="color:hsl(var(--accent));font-weight:700;">R$ ${Number(c.preco_medio_m2).toLocaleString("pt-BR")}/m²</div>`
          : "";
        marker.bindTooltip(
          `<div style="min-width:160px;font-size:12px;line-height:1.5;">
            <div style="font-weight:600;margin-bottom:2px;">${c.nome_condominio || c.logradouro_padrao}</div>
            <div style="font-size:11px;color:#6b7280;">${c.numero_torres ?? "?"} torre(s) · ${c.unidades_estimadas ?? "?"} unidades</div>
            ${priceText}
          </div>`,
          { sticky: true, direction: "top" }
        );
      }

      marker.addTo(layer);
    });
  }, [condominios, selectedId, showHeatmap, onSelect]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapElementRef} className="h-full w-full rounded-lg" style={{ minHeight: "400px" }} />

      <div className="absolute top-2 right-2 z-[1000]">
        <div className="bg-background rounded-md shadow-md p-1 border border-border">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => mapRef.current?.setView(BARRA_CENTER, BARRA_ZOOM)}
            title="Centralizar na Barra"
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] bg-background/90 backdrop-blur rounded-lg p-3 shadow-md border border-border space-y-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="heatmap-toggle" className="text-xs font-medium">Heatmap</Label>
          <Switch id="heatmap-toggle" checked={showHeatmap} onCheckedChange={onToggleHeatmap} />
        </div>
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="lotes-toggle" className="text-xs font-medium">Lotes PAL</Label>
          <Switch id="lotes-toggle" checked={showLotes} onCheckedChange={onToggleLotes} />
          {showLotes && currentZoom < 15 && (
            <span className="text-[10px] text-muted-foreground ml-1">zoom 15+</span>
          )}
        </div>
      </div>
    </div>
  );
}
