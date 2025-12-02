import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search, DollarSign, Bot } from "lucide-react";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function SearchTools() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ferramentas de Busca</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="localizacao" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="localizacao">
              <Search className="h-4 w-4 mr-2" />
              Localização
            </TabsTrigger>
            <TabsTrigger value="transacoes">
              <DollarSign className="h-4 w-4 mr-2" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="valuation">
              <Bot className="h-4 w-4 mr-2" />
              IA Valuation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="localizacao" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="rua">Rua ou Condomínio</Label>
              <Input 
                id="rua"
                placeholder="Digite o nome da rua ou condomínio..." 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipologia">Tipologia</Label>
                <Select>
                  <SelectTrigger id="tipologia">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartamento">Apartamento</SelectItem>
                    <SelectItem value="casa">Casa</SelectItem>
                    <SelectItem value="cobertura">Cobertura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="finalidade">Finalidade</Label>
                <Select>
                  <SelectTrigger id="finalidade">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residencial">Residencial</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area-min">Área Mínima (m²)</Label>
                <Input id="area-min" type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area-max">Área Máxima (m²)</Label>
                <Input id="area-max" type="number" placeholder="1000" />
              </div>
            </div>
            
            <Button className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
            
            <div className="p-4 border rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
              Digite uma localização para ver as transações oficiais
            </div>
          </TabsContent>

          <TabsContent value="transacoes" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor-min">Valor Mínimo</Label>
                <Input id="valor-min" type="number" placeholder="R$ 0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor-max">Valor Máximo</Label>
                <Input id="valor-max" type="number" placeholder="R$ 10.000.000" />
              </div>
            </div>
            
            <Button className="w-full">
              <DollarSign className="h-4 w-4 mr-2" />
              Buscar Transações
            </Button>
            
            <div className="p-4 border rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
              Defina a faixa de preço para ver os microbairros disponíveis
            </div>
          </TabsContent>

          <TabsContent value="valuation" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="val-localizacao">Localização</Label>
              <Input id="val-localizacao" placeholder="Rua ou condomínio" />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="val-area">Área (m²)</Label>
                <Input id="val-area" type="number" placeholder="150" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="val-quartos">Quartos</Label>
                <Input id="val-quartos" type="number" placeholder="3" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="val-vagas">Vagas</Label>
                <Input id="val-vagas" type="number" placeholder="2" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="val-sol">Sol</Label>
                <Select>
                  <SelectTrigger id="val-sol">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manha">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="dia-todo">Dia Todo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="val-vista">Vista</Label>
                <Select>
                  <SelectTrigger id="val-vista">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mar">Mar</SelectItem>
                    <SelectItem value="verde">Verde</SelectItem>
                    <SelectItem value="urbana">Urbana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="val-estado">Estado de Conservação</Label>
              <Select>
                <SelectTrigger id="val-estado">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="reformado">Reformado</SelectItem>
                  <SelectItem value="bom">Bom Estado</SelectItem>
                  <SelectItem value="reformar">A Reformar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button className="w-full">
              <Bot className="h-4 w-4 mr-2" />
              Calcular Valuation
            </Button>
            
            <div className="p-4 border rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
              Preencha os dados para obter uma avaliação estimada
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
