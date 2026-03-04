import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, Layers } from "lucide-react";
import type { TerritorialCondominio, MapBounds } from "@/hooks/useTerritorialData";
import "leaflet/dist/leaflet.css";
import type { LatLngExpression } from "leaflet";

interface TerritorialMapProps {
  condominios: TerritorialCondominio[];
  selectedId: string | null;
  onSelect: (condo: TerritorialCondominio) => void;
  onBoundsChange: (bounds: MapBounds) => void;
  showHeatmap: boolean;
  onToggleHeatmap: (v: boolean) => void;
}

const BARRA_CENTER: LatLngExpression = [-22.988, -43.320];
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

function BoundsTracker({ onBoundsChange }: { onBoundsChange: (b: MapBounds) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    },
  });

  useEffect(() => {
    const b = map.getBounds();
    onBoundsChange({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }, []);

  return null;
}

function CenterButton() {
  const map = useMap();
  return (
    <div className="leaflet-top leaflet-right" style={{ zIndex: 1000 }}>
      <div className="leaflet-control leaflet-bar bg-background rounded-md shadow-md p-1 m-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => map.setView(BARRA_CENTER, BARRA_ZOOM)}
          title="Centralizar na Barra"
        >
          <MapPin className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function TerritorialMap({
  condominios,
  selectedId,
  onSelect,
  onBoundsChange,
  showHeatmap,
  onToggleHeatmap,
}: TerritorialMapProps) {
  const markers = useMemo(() => {
    if (showHeatmap) {
      return condominios.map((c) => {
        const center: LatLngExpression = [c.latitude, c.longitude];
        return (
          <CircleMarker
            key={c.id}
            center={center}
            pathOptions={{
              radius: Math.max(8, Math.min((c.unidades_estimadas || 10) / 5, 40)),
              fillColor: getMarkerColor(c.unidades_estimadas),
              fillOpacity: getHeatmapOpacity(c.unidades_estimadas),
              color: getMarkerColor(c.unidades_estimadas),
              weight: 0,
            } as any}
          />
        );
      });
    }

    return condominios.map((c) => {
      const hasPrice = c.preco_medio_m2 != null && c.preco_medio_m2 > 0;
      const color = getMarkerColor(c.unidades_estimadas);
      const isSelected = c.id === selectedId;
      const center: LatLngExpression = [c.latitude, c.longitude];

      return (
        <CircleMarker
          key={c.id}
          center={center}
          pathOptions={{
            radius: isSelected ? 10 : 7,
            fillColor: color,
            fillOpacity: hasPrice ? 0.85 : 0.3,
            color: isSelected ? "#F59E0B" : hasPrice ? color : "#94A3B8",
            weight: isSelected ? 3 : hasPrice ? 2 : 1,
            dashArray: hasPrice ? undefined : "4 4",
          } as any}
          eventHandlers={{ click: () => onSelect(c) }}
        >
          <Popup>
            <div className="min-w-[200px] text-sm">
              <p className="font-semibold mb-1">
                {c.nome_condominio || c.logradouro_padrao}
              </p>
              <div className="space-y-0.5 text-xs" style={{ color: "#666" }}>
                <p>Torres: {c.numero_torres ?? "—"} | Unidades: {c.unidades_estimadas ?? "—"}</p>
                <p>
                  Preço m²:{" "}
                  {c.preco_medio_m2
                    ? `R$ ${c.preco_medio_m2.toLocaleString("pt-BR")}`
                    : "Sem dados ITBI"}
                </p>
                {c.ultima_transacao_itbi && (
                  <p>Última transação: {new Date(c.ultima_transacao_itbi).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</p>
                )}
              </div>
              <button
                className="mt-2 w-full text-xs py-1 px-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => onSelect(c)}
              >
                Ver detalhes
              </button>
            </div>
          </Popup>
        </CircleMarker>
      );
    });
  }, [condominios, selectedId, showHeatmap, onSelect]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        {...{ center: BARRA_CENTER, zoom: BARRA_ZOOM } as any}
        className="h-full w-full rounded-lg"
        style={{ minHeight: "400px" }}
      >
        <TileLayer
          {...{
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          } as any}
        />
        <BoundsTracker onBoundsChange={onBoundsChange} />
        <CenterButton />
        {markers}
      </MapContainer>

      {/* Map controls overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-background/90 backdrop-blur rounded-lg p-3 shadow-md border border-border">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="heatmap-toggle" className="text-xs font-medium">Heatmap</Label>
          <Switch
            id="heatmap-toggle"
            checked={showHeatmap}
            onCheckedChange={onToggleHeatmap}
          />
        </div>
      </div>
    </div>
  );
}
