import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Map, BarChart3, Building2, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerritorialMap } from "@/components/territorial/TerritorialMap";
import { TerritorialFilters } from "@/components/territorial/TerritorialFilters";
import { CondominioDetailPanel } from "@/components/territorial/CondominioDetailPanel";
import { TerritorialRanking } from "@/components/territorial/TerritorialRanking";
import { TerritorialLogradouros } from "@/components/territorial/TerritorialLogradouros";
import { TerritorialAdmin } from "@/components/territorial/TerritorialAdmin";
import {
  useTerritorialKPIs,
  useCondominiosBbox,
  type TerritorialCondominio,
  type MapBounds,
} from "@/hooks/useTerritorialData";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export default function InteligenciaTerritorial() {
  const { isAdmin, role } = useAuthContext();
  const isSuperadmin = role === "superadmin";
  const showAdmin = isAdmin || isSuperadmin;

  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [selectedCondo, setSelectedCondo] = useState<TerritorialCondominio | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [detailOpen, setDetailOpen] = useState(true);

  const { data: kpis } = useTerritorialKPIs();
  const { data: condominios = [], isLoading } = useCondominiosBbox(bounds);

  const handleBoundsChange = useCallback((b: MapBounds) => {
    setBounds(b);
  }, []);

  const handleSelectCondo = useCallback((condo: TerritorialCondominio) => {
    setSelectedCondo(condo);
    setDetailOpen(true);
  }, []);

  return (
    <>
      <Helmet>
        <title>Inteligência Territorial | Godoy Prime Analytics</title>
        <meta name="description" content="Análise geoespacial de condomínios, preços e transações ITBI na Barra da Tijuca." />
      </Helmet>

      <div className="h-[calc(100vh-8rem)]">
        <Tabs defaultValue="mapa" className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-foreground">Inteligência Territorial</h1>
            <TabsList className="bg-muted">
              <TabsTrigger value="mapa" className="gap-1.5 text-xs">
                <Map className="h-3.5 w-3.5" /> Mapa
              </TabsTrigger>
              <TabsTrigger value="ranking" className="gap-1.5 text-xs">
                <BarChart3 className="h-3.5 w-3.5" /> Ranking
              </TabsTrigger>
              <TabsTrigger value="logradouros" className="gap-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5" /> Por Logradouro
              </TabsTrigger>
              {showAdmin && (
                <TabsTrigger value="admin" className="gap-1.5 text-xs">
                  <Settings className="h-3.5 w-3.5" /> Admin
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Tab: Mapa */}
          <TabsContent value="mapa" className="flex-1 min-h-0 mt-0">
            <div className="flex h-full gap-0 rounded-lg border border-border overflow-hidden">
              {/* Left: Filters */}
              <div className="w-[280px] shrink-0 border-r border-border bg-card p-3 flex flex-col overflow-hidden">
                <TerritorialFilters
                  kpis={kpis ?? null}
                  condominios={condominios}
                  selectedId={selectedCondo?.id ?? null}
                  onSelect={handleSelectCondo}
                  isLoading={isLoading}
                />
              </div>

              {/* Center: Map */}
              <div className="flex-1 min-w-0">
                <TerritorialMap
                  condominios={condominios}
                  selectedId={selectedCondo?.id ?? null}
                  onSelect={handleSelectCondo}
                  onBoundsChange={handleBoundsChange}
                  showHeatmap={showHeatmap}
                  onToggleHeatmap={setShowHeatmap}
                />
              </div>

              {/* Right: Detail panel */}
              {selectedCondo && detailOpen && (
                <div className="w-[360px] shrink-0">
                  <CondominioDetailPanel
                    condominio={selectedCondo}
                    onClose={() => { setDetailOpen(false); setSelectedCondo(null); }}
                  />
                </div>
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
