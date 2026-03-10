import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Search, Building2, TrendingUp, Home, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { List as VirtualList, type RowComponentProps } from "react-window";
import { useLogradouroSuggestions, type TerritorialCondominio, type TerritorialKPIs } from "@/hooks/useTerritorialData";
import { cn } from "@/lib/utils";

interface CondoRowProps {
  filtered: TerritorialCondominio[];
  selectedId: string | null;
  onSelect: (condo: TerritorialCondominio) => void;
}

function CondoRow({ index, style, filtered, selectedId, onSelect }: { index: number; style: React.CSSProperties } & CondoRowProps) {
  const c = filtered[index];
  if (!c) return null;
  const conf = c.confianca_identificacao ?? 0;
  const confColor = conf >= 0.8 ? "bg-green-500" : conf >= 0.5 ? "bg-yellow-500" : "bg-muted-foreground/30";

  return (
    <div style={style} className="pr-2 pb-1.5">
      <button
        onClick={() => onSelect(c)}
        className={cn(
          "w-full text-left p-2.5 rounded-md border transition-colors",
          selectedId === c.id
            ? "border-accent bg-accent/10"
            : "border-border hover:border-accent/50 hover:bg-muted/50"
        )}
      >
        <p className="text-sm font-medium text-foreground truncate">
          {c.nome_condominio || (
            c.logradouro_padrao?.includes("não cadastrado") && c.latitude && c.longitude
              ? `📍 ${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`
              : c.logradouro_padrao
          )}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {c.numero_torres ? (
            <span className="text-[10px] text-muted-foreground">{c.numero_torres} torres</span>
          ) : null}
          {c.unidades_estimadas ? (
            <span className="text-[10px] text-muted-foreground">{c.unidades_estimadas} un.</span>
          ) : null}
          <span className={cn("h-1.5 w-1.5 rounded-full ml-auto", confColor)} />
        </div>
        <p className="text-xs mt-0.5">
          {c.preco_medio_m2 ? (
            <span className="text-accent font-semibold">R$ {c.preco_medio_m2.toLocaleString("pt-BR")}/m²</span>
          ) : (
            <span className="text-muted-foreground">Sem histórico</span>
          )}
        </p>
      </button>
    </div>
  );
}

interface TerritorialFiltersProps {
  kpis: TerritorialKPIs | null;
  condominios: TerritorialCondominio[];
  selectedId: string | null;
  onSelect: (condo: TerritorialCondominio) => void;
  onFilteredChange: (filtered: TerritorialCondominio[]) => void;
  isLoading: boolean;
}

export function TerritorialFilters({
  kpis,
  condominios,
  selectedId,
  onSelect,
  onFilteredChange,
  isLoading,
}: TerritorialFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [unidadesRange, setUnidadesRange] = useState([0, 500]);
  const [somenteComItbi, setSomenteComItbi] = useState(true);
  const [fontes, setFontes] = useState<Record<string, boolean>>({
    manual: true,
    algoritmo_pal: true,
    algoritmo_dbscan: true,
  });

  const { data: suggestions } = useLogradouroSuggestions(searchTerm);

  // P1.4: measure list container height for virtualization
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(300);
  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setListHeight(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const looseMatch = (searchValue: string, targetValue: string) => {
    const s = normalizeText(searchValue);
    const t = normalizeText(targetValue);
    if (!s || !t) return false;
    if (t.includes(s)) return true;

    const searchTokens = s.split(" ").filter((token) => token.length >= 3);
    const targetTokens = t.split(" ");

    if (searchTokens.length === 0) return false;

    return searchTokens.every((token) =>
      targetTokens.some(
        (targetToken) =>
          targetToken.includes(token) ||
          token.includes(targetToken) ||
          (token.length >= 5 && targetToken.startsWith(token.slice(0, 5)))
      )
    );
  };

  const filtered = useMemo(() => {
    return condominios.filter((c) => {
      if (
        searchTerm &&
        !looseMatch(searchTerm, c.logradouro_padrao || "") &&
        !looseMatch(searchTerm, c.nome_condominio || "")
      ) return false;
      if (somenteComItbi && (!c.preco_medio_m2 || c.preco_medio_m2 <= 0)) return false;
      const units = c.unidades_estimadas ?? 0;
      if (units < unidadesRange[0] || (unidadesRange[1] < 500 && units > unidadesRange[1])) return false;
      // P1.1: Apply fonte filter
      const activeFontes = Object.entries(fontes).filter(([, v]) => v).map(([k]) => k);
      if (activeFontes.length > 0 && activeFontes.length < Object.keys(fontes).length) {
        if (c.fonte_identificacao && !activeFontes.includes(c.fonte_identificacao)) return false;
      }
      return true;
    });
  }, [condominios, searchTerm, somenteComItbi, unidadesRange, fontes]);

  useEffect(() => {
    onFilteredChange(filtered);
  }, [filtered, onFilteredChange]);

  const kpiCards = [
    { label: "Condomínios", value: kpis?.total_condominios ?? "—", icon: Building2 },
    { label: "Com histórico", value: kpis?.com_historico_precos ?? "—", icon: TrendingUp },
    { label: "Unidades", value: kpis?.unidades_mapeadas?.toLocaleString("pt-BR") ?? "—", icon: Home },
    { label: "R$/m² médio", value: kpis?.preco_medio_m2_barra ? `R$ ${kpis.preco_medio_m2_barra.toLocaleString("pt-BR")}` : "—", icon: DollarSign },
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="bg-card border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className="h-3.5 w-3.5 text-accent" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar logradouro..."
            value={searchTerm}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            className="pl-9 h-9 text-sm"
          />
          {showSuggestions && suggestions && suggestions.length > 0 && searchTerm.length >= 2 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-auto">
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted truncate"
                  onClick={() => {
                    setSearchTerm(s);
                    setShowSuggestions(false);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Unidades: {unidadesRange[0]} — {unidadesRange[1] >= 500 ? "500+" : unidadesRange[1]}
          </Label>
          <Slider
            min={0}
            max={500}
            step={10}
            value={unidadesRange}
            onValueChange={setUnidadesRange}
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch id="itbi-only" checked={somenteComItbi} onCheckedChange={setSomenteComItbi} />
          <Label htmlFor="itbi-only" className="text-xs">Somente com histórico ITBI</Label>
        </div>
      </div>

      {/* Results list — virtualized */}
      <div className="flex-1 min-h-0 flex flex-col">
        <p className="text-xs text-muted-foreground mb-2">{filtered.length} condomínios</p>
        {searchTerm.trim().length >= 2 && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground mb-2">
            Nenhum condomínio mapeado encontrado para este logradouro.
          </p>
        )}
        <div className="flex-1 min-h-0" ref={listContainerRef}>
          <VirtualList
            style={{ height: listHeight }}
            rowCount={filtered.length}
            rowHeight={82}
            overscanCount={5}
            rowComponent={CondoRow as any}
            rowProps={{ filtered, selectedId, onSelect }}
          />
        </div>
      </div>
    </div>
  );
}
