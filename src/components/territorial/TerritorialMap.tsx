import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, Layers } from "lucide-react";
import type { TerritorialCondominio, MapBounds } from "@/hooks/useTerritorialData";

interface TerritorialMapProps {
  condominios: TerritorialCondominio[];
  selectedId: string | null;
  onSelect: (condo: TerritorialCondominio) => void;
  onBoundsChange: (bounds: MapBounds) => void;
  showHeatmap: boolean;
  onToggleHeatmap: (v: boolean) => void;
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

function getHeatmapOpacity(unidades: number | null): number {
  if (!unidades) return 0.1;
  return Math.min(0.15 + (unidades / 500) * 0.6, 0.75);
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

export function TerritorialMap({
  condominios,
  selectedId,
  onSelect,
  onBoundsChange,
  showHeatmap,
  onToggleHeatmap,
}: TerritorialMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

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
      mapRef.current = map;

      const emitBounds = () => {
        const b = map.getBounds();
        onBoundsChange({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      };

      emitBounds();
      map.on("moveend", emitBounds);
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersLayerRef.current = null;
    };
  }, [onBoundsChange]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    const L = window.L;
    if (!map || !layer || !L) return;

    layer.clearLayers();

    condominios.forEach((c) => {
      if (c.latitude == null || c.longitude == null) return;

      const hasPrice = c.preco_medio_m2 != null && c.preco_medio_m2 > 0;
      const color = getMarkerColor(c.unidades_estimadas);
      const isSelected = c.id === selectedId;

      const marker = L.circleMarker([c.latitude, c.longitude],
        showHeatmap
          ? {
              radius: Math.max(8, Math.min((c.unidades_estimadas || 10) / 5, 40)),
              fillColor: color,
              fillOpacity: getHeatmapOpacity(c.unidades_estimadas),
              color,
              weight: 0,
            }
          : {
              radius: isSelected ? 10 : 7,
              fillColor: color,
              fillOpacity: hasPrice ? 0.85 : 0.3,
              color: isSelected ? "#F59E0B" : hasPrice ? color : "#94A3B8",
              weight: isSelected ? 3 : hasPrice ? 2 : 1,
              dashArray: hasPrice ? undefined : "4 4",
            }
      );

      marker.on("click", () => onSelect(c));

      if (!showHeatmap) {
        marker.bindPopup(`
          <div style="min-width:200px;font-size:12px;line-height:1.4;">
            <div style="font-weight:600;margin-bottom:4px;">${c.nome_condominio || c.logradouro_padrao}</div>
            <div>Torres: ${c.numero_torres ?? "—"} | Unidades: ${c.unidades_estimadas ?? "—"}</div>
            <div>Preço m²: ${c.preco_medio_m2 ? `R$ ${c.preco_medio_m2.toLocaleString("pt-BR")}` : "Sem dados ITBI"}</div>
          </div>
        `);
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

      <div className="absolute bottom-4 left-4 z-[1000] bg-background/90 backdrop-blur rounded-lg p-3 shadow-md border border-border">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="heatmap-toggle" className="text-xs font-medium">Heatmap</Label>
          <Switch id="heatmap-toggle" checked={showHeatmap} onCheckedChange={onToggleHeatmap} />
        </div>
      </div>
    </div>
  );
}
