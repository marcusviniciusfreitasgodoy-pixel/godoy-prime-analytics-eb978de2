import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Map, BarChart3, Building2, Settings, ChevronLeft, ChevronRight, X, SlidersHorizontal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TerritorialMap } from "@/components/territorial/TerritorialMap";
import { TerritorialFilters } from "@/components/territorial/TerritorialFilters";
import { CondominioDetailPanel } from "@/components/territorial/CondominioDetailPanel";
import { TerritorialRanking } from "@/components/territorial/TerritorialRanking";
import { TerritorialLogradouros } from "@/components/territorial/TerritorialLogradouros";
import { TerritorialAdmin } from "@/components/territorial/TerritorialAdmin";
import {
  useTerritorialKPIs,
  useCondominiosBbox,
  useLotesPALBbox,
  type TerritorialCondominio,
  type MapBounds,
} from "@/hooks/useTerritorialData";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export default function InteligenciaTerritorial() {
  const { isAdmin, role } = useAuthContext();
  const isSuperadmin = role === "superadmin";
  const showAdmin = isAdmin || isSuperadmin;
  const isMobile = useIsMobile();

  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [selectedCondo, setSelectedCondo] = useState<TerritorialCondominio | null>(null);
  const [filteredCondos, setFilteredCondos] = useState<TerritorialCondominio[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [detailOpen, setDetailOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [focusCoord, setFocusCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [showLotes, setShowLotes] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(13);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const { data: kpis } = useTerritorialKPIs();
  const { data: condominios = [], isLoading } = useCondominiosBbox(bounds);
  const { data: lotes = [] } = useLotesPALBbox(bounds, showLotes && currentZoom >= 15);

  const handleBoundsChange = useCallback((b: MapBounds) => {
    setBounds(b);
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom);
  }, []);

  const handleSelectCondo = useCallback((condo: TerritorialCondominio) => {
    setSelectedCondo(condo);
    setDetailOpen(true);
    setIsCollapsed(false);
    setMobileDetailOpen(true);
    if (isMobile) setMobileFiltersOpen(false);
    if (condo.latitude != null && condo.longitude != null) {
      setFocusCoord({ lat: condo.latitude, lng: condo.longitude });
    }
  }, [isMobile]);

  const handleFilteredChange = useCallback((filtered: TerritorialCondominio[]) => {
    setFilteredCondos(filtered);
  }, []);

  const handleClosePanel = useCallback(() => {
    setDetailOpen(false);
    setSelectedCondo(null);
    setIsCollapsed(false);
    setMobileDetailOpen(false);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const filtersContent = (
    <TerritorialFilters
      kpis={kpis ?? null}
      condominios={condominios}
      selectedId={selectedCondo?.id ?? null}
      onSelect={handleSelectCondo}
      onFilteredChange={handleFilteredChange}
      isLoading={isLoading}
    />
  );

  return (
    <>
      <Helmet>
        <title>Inteligência Territorial | Godoy Prime Analytics</title>
        <meta name="description" content="Análise geoespacial de condomínios, preços e transações ITBI na Barra da Tijuca." />
      </Helmet>

      <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-8rem)]">
        <Tabs defaultValue="mapa" className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-2 md:mb-3 gap-2">
            <h1 className="text-lg md:text-xl font-bold text-foreground truncate">Inteligência Territorial</h1>
            <TabsList className="bg-muted shrink-0">
              <TabsTrigger value="mapa" className="gap-1 text-[10px] md:text-xs px-2 md:px-3">
                <Map className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span className="hidden sm:inline">Mapa</span>
              </TabsTrigger>
              <TabsTrigger value="ranking" className="gap-1 text-[10px] md:text-xs px-2 md:px-3">
                <BarChart3 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span className="hidden sm:inline">Ranking</span>
              </TabsTrigger>
              <TabsTrigger value="logradouros" className="gap-1 text-[10px] md:text-xs px-2 md:px-3">
                <Building2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span className="hidden sm:inline">Ruas</span>
              </TabsTrigger>
              {showAdmin && (
                <TabsTrigger value="admin" className="gap-1 text-[10px] md:text-xs px-2 md:px-3">
                  <Settings className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Tab: Mapa */}
          <TabsContent value="mapa" className="flex-1 min-h-0 mt-0">
            <div className="flex h-full gap-0 rounded-lg border border-border overflow-hidden relative">
              {/* Left: Filters — hidden on mobile, shown via Sheet */}
              {!isMobile && (
                <div className="w-[280px] shrink-0 border-r border-border bg-card p-3 flex flex-col overflow-hidden">
                  {filtersContent}
                </div>
              )}

              {/* Mobile: FAB to open filters */}
              {isMobile && (
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button
                      size="icon"
                      className="absolute top-2 left-2 z-[1001] h-10 w-10 rounded-full shadow-lg bg-background border border-border"
                      variant="outline"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[85vw] max-w-[320px] p-3 flex flex-col">
                    <SheetHeader className="mb-2">
                      <SheetTitle className="text-sm">Filtros e Condomínios</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 min-h-0 overflow-auto">
                      {filtersContent}
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              {/* Center: Map */}
              <div className="flex-1 min-w-0">
                <TerritorialMap
                  condominios={filteredCondos.length > 0 || condominios.length === 0 ? filteredCondos : condominios}
                  selectedId={selectedCondo?.id ?? null}
                  onSelect={handleSelectCondo}
                  onBoundsChange={handleBoundsChange}
                  showHeatmap={showHeatmap}
                  onToggleHeatmap={setShowHeatmap}
                  focusCoord={focusCoord}
                  lotes={lotes}
                  showLotes={showLotes}
                  onToggleLotes={setShowLotes}
                  currentZoom={currentZoom}
                  onZoomChange={handleZoomChange}
                />
              </div>

              {/* Right: Detail panel — desktop */}
              {!isMobile && selectedCondo && detailOpen && (
                isCollapsed ? (
                  <div className="w-[40px] shrink-0 border-l border-border bg-card flex flex-col items-center py-2 gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggleCollapse} title="Expandir painel">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClosePanel} title="Fechar painel">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
                        {(selectedCondo.nome_condominio || selectedCondo.logradouro_padrao).slice(0, 30)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-[360px] shrink-0 relative">
                    <div className="absolute top-2 left-2 z-10 flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggleCollapse} title="Colapsar painel">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <CondominioDetailPanel condominio={selectedCondo} onClose={handleClosePanel} />
                  </div>
                )
              )}

              {/* Mobile: Detail panel as bottom Sheet */}
              {isMobile && selectedCondo && (
                <Sheet open={mobileDetailOpen} onOpenChange={(open) => { setMobileDetailOpen(open); if (!open) handleClosePanel(); }}>
                  <SheetContent side="bottom" className="h-[75vh] rounded-t-xl p-0 overflow-hidden">
                    <div className="h-full overflow-auto">
                      <CondominioDetailPanel condominio={selectedCondo} onClose={handleClosePanel} />
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </TabsContent>

          {/* Tab: Ranking */}
          <TabsContent value="ranking" className="flex-1 min-h-0 mt-0 overflow-auto">
            <TerritorialRanking />
          </TabsContent>

          {/* Tab: Por Logradouro */}
          <TabsContent value="logradouros" className="flex-1 min-h-0 mt-0 overflow-auto">
            <TerritorialLogradouros />
          </TabsContent>

          {/* Tab: Admin */}
          {showAdmin && (
            <TabsContent value="admin" className="flex-1 min-h-0 mt-0 overflow-auto">
              <TerritorialAdmin />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </>
  );
}
