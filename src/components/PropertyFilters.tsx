import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useFilters } from "@/contexts/FiltersContext";
import { useCondominios } from "@/hooks/useCondominios";
import { Skeleton } from "@/components/ui/skeleton";

export function PropertyFilters() {
  const { filters, setFilters, resetFilters } = useFilters();
  const { data: condominios, isLoading } = useCondominios();
  
  const [localFilters, setLocalFilters] = useState({
    priceMin: filters.priceMin?.toString() || "",
    priceMax: filters.priceMax?.toString() || "",
    sizeMin: filters.sizeMin?.toString() || "",
    sizeMax: filters.sizeMax?.toString() || "",
    type: filters.type || "",
    condominio: filters.condominio || "",
    status: filters.status || "",
  });

  const handleApplyFilters = () => {
    setFilters({
      priceMin: localFilters.priceMin ? Number(localFilters.priceMin) : undefined,
      priceMax: localFilters.priceMax ? Number(localFilters.priceMax) : undefined,
      sizeMin: localFilters.sizeMin ? Number(localFilters.sizeMin) : undefined,
      sizeMax: localFilters.sizeMax ? Number(localFilters.sizeMax) : undefined,
      type: localFilters.type || undefined,
      condominio: localFilters.condominio || undefined,
      status: localFilters.status || undefined,
    });
  };

  const handleReset = () => {
    setLocalFilters({
      priceMin: "",
      priceMax: "",
      sizeMin: "",
      sizeMax: "",
      type: "",
      condominio: "",
      status: "",
    });
    resetFilters();
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-4">Filtros Avançados</h3>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Faixa de Preço</Label>
            <div className="flex gap-2 items-center">
              <Input 
                placeholder="Min" 
                type="number"
                value={localFilters.priceMin}
                onChange={(e) => setLocalFilters({ ...localFilters, priceMin: e.target.value })}
              />
              <span className="text-muted-foreground">-</span>
              <Input 
                placeholder="Max" 
                type="number"
                value={localFilters.priceMax}
                onChange={(e) => setLocalFilters({ ...localFilters, priceMax: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tamanho (m²)</Label>
            <div className="flex gap-2 items-center">
              <Input 
                placeholder="Min" 
                type="number"
                value={localFilters.sizeMin}
                onChange={(e) => setLocalFilters({ ...localFilters, sizeMin: e.target.value })}
              />
              <span className="text-muted-foreground">-</span>
              <Input 
                placeholder="Max" 
                type="number"
                value={localFilters.sizeMax}
                onChange={(e) => setLocalFilters({ ...localFilters, sizeMax: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Imóvel</Label>
            <Select value={localFilters.type} onValueChange={(value) => setLocalFilters({ ...localFilters, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="Apartamento">Apartamento</SelectItem>
                <SelectItem value="Cobertura">Cobertura</SelectItem>
                <SelectItem value="Casa">Casa</SelectItem>
                <SelectItem value="Terreno">Terreno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Condomínio</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={localFilters.condominio} onValueChange={(value) => setLocalFilters({ ...localFilters, condominio: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {condominios?.map((cond) => (
                    <SelectItem key={cond.id} value={cond.nome_condominio || ""}>
                      {cond.nome_condominio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={localFilters.status} onValueChange={(value) => setLocalFilters({ ...localFilters, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="sold">Vendido</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleApplyFilters}
            >
              Aplicar Filtros
            </Button>
            <Button 
              variant="outline"
              onClick={handleReset}
            >
              Limpar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
