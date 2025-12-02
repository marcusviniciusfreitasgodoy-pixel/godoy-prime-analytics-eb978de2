import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export function PropertyFilters() {
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
              <Input placeholder="Min" type="number" />
              <span className="text-muted-foreground">-</span>
              <Input placeholder="Max" type="number" />
            </div>
            <Slider defaultValue={[1000000, 5000000]} max={10000000} step={100000} className="mt-2" />
          </div>

          <div className="space-y-2">
            <Label>Tamanho (m²)</Label>
            <div className="flex gap-2 items-center">
              <Input placeholder="Min" type="number" />
              <span className="text-muted-foreground">-</span>
              <Input placeholder="Max" type="number" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Imóvel</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apartamento">Apartamento</SelectItem>
                <SelectItem value="cobertura">Cobertura</SelectItem>
                <SelectItem value="casa">Casa</SelectItem>
                <SelectItem value="terreno">Terreno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Condomínio</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="peninsula">Península</SelectItem>
                <SelectItem value="riserva">Riserva Golf</SelectItem>
                <SelectItem value="majestic">Majestic</SelectItem>
                <SelectItem value="leparc">Le Parc</SelectItem>
                <SelectItem value="ilhapura">Ilha Pura</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="sold">Vendido</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            Aplicar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
