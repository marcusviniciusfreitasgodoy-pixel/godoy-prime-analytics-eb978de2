import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search, DollarSign, Bot, Loader2 } from "lucide-react";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useLocationSearch, useTransactionSearch } from "@/hooks/useLocationSearch";
import { useValuationWeights } from "@/hooks/useValuationWeights";
import { Badge } from "./ui/badge";

export function SearchTools() {
  // Location search state
  const [locationQuery, setLocationQuery] = useState("");
  const [tipologia, setTipologia] = useState<string>("");
  const [finalidade, setFinalidade] = useState<string>("");
  const [areaMin, setAreaMin] = useState<string>("");
  const [areaMax, setAreaMax] = useState<string>("");
  const [searchLocation, setSearchLocation] = useState(false);

  // Transaction search state
  const [valorMin, setValorMin] = useState<string>("");
  const [valorMax, setValorMax] = useState<string>("");
  const [searchTransactions, setSearchTransactions] = useState(false);

  // Valuation state
  const [valLocalizacao, setValLocalizacao] = useState("");
  const [valArea, setValArea] = useState("");
  const [valQuartos, setValQuartos] = useState("");
  const [valVagas, setValVagas] = useState("");
  const [valSol, setValSol] = useState("");
  const [valVista, setValVista] = useState("");
  const [valEstado, setValEstado] = useState("");
  const [valuationResult, setValuationResult] = useState<{
    min: number;
    justo: number;
    max: number;
    confianca: number;
    mercado: string;
  } | null>(null);

  // Queries
  const { data: locationResult, isLoading: locationLoading } = useLocationSearch(
    {
      query: locationQuery,
      tipologia: tipologia || undefined,
      finalidade: finalidade || undefined,
      areaMin: areaMin ? parseFloat(areaMin) : undefined,
      areaMax: areaMax ? parseFloat(areaMax) : undefined,
    },
    searchLocation
  );

  const { data: transactionResult, isLoading: transactionLoading } = useTransactionSearch(
    {
      valorMin: valorMin ? parseFloat(valorMin) : undefined,
      valorMax: valorMax ? parseFloat(valorMax) : undefined,
    },
    searchTransactions
  );

  const { data: weights } = useValuationWeights();

  const handleLocationSearch = () => {
    setSearchLocation(true);
  };

  const handleTransactionSearch = () => {
    setSearchTransactions(true);
  };

  const calculateValuation = () => {
    if (!valArea || !locationResult) return;

    const area = parseFloat(valArea);
    const basePrice = locationResult.mediana_m2;
    
    // Apply multipliers based on weights
    let multiplier = 1.0;
    
    if (valVista === 'mar') multiplier += 0.25;
    else if (valVista === 'verde') multiplier += 0.10;
    
    if (valSol === 'dia-todo') multiplier += 0.08;
    else if (valSol === 'manha') multiplier += 0.05;
    
    if (valEstado === 'novo') multiplier += 0.15;
    else if (valEstado === 'reformado') multiplier += 0.10;
    else if (valEstado === 'reformar') multiplier -= 0.15;

    const quartos = parseInt(valQuartos) || 3;
    if (quartos >= 4) multiplier += 0.05;

    const vagas = parseInt(valVagas) || 2;
    if (vagas >= 3) multiplier += 0.05;

    const precoJusto = Math.round(basePrice * multiplier * area);
    const precoMin = Math.round(precoJusto * 0.9);
    const precoMax = Math.round(precoJusto * 1.15);

    // Calculate confidence based on sample size
    const confianca = Math.min(95, 50 + locationResult.total_transacoes * 3);

    // Market temperature
    const desvioRelativo = locationResult.desvio_padrao / locationResult.media_m2;
    const mercado = desvioRelativo < 0.15 ? 'Estável' : desvioRelativo < 0.25 ? 'Aquecido' : 'Volátil';

    setValuationResult({
      min: precoMin,
      justo: precoJusto,
      max: precoMax,
      confianca,
      mercado,
    });
  };

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
                value={locationQuery}
                onChange={(e) => {
                  setLocationQuery(e.target.value);
                  setSearchLocation(false);
                }}
                placeholder="Digite o nome da rua ou condomínio..." 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipologia">Tipologia</Label>
                <Select value={tipologia} onValueChange={setTipologia}>
                  <SelectTrigger id="tipologia">
                    <SelectValue placeholder="Todas" />
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
                <Select value={finalidade} onValueChange={setFinalidade}>
                  <SelectTrigger id="finalidade">
                    <SelectValue placeholder="Todas" />
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
                <Input 
                  id="area-min" 
                  type="number" 
                  placeholder="0" 
                  value={areaMin}
                  onChange={(e) => setAreaMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area-max">Área Máxima (m²)</Label>
                <Input 
                  id="area-max" 
                  type="number" 
                  placeholder="1000" 
                  value={areaMax}
                  onChange={(e) => setAreaMax(e.target.value)}
                />
              </div>
            </div>
            
            <Button className="w-full" onClick={handleLocationSearch} disabled={locationLoading || !locationQuery}>
              {locationLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Buscar
            </Button>
            
            {locationResult ? (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">{locationResult.logradouro}</span>
                  <Badge variant="secondary">{locationResult.total_transacoes} transações</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Mediana:</span>
                    <span className="ml-2 font-semibold">R$ {locationResult.mediana_m2.toLocaleString('pt-BR')}/m²</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Média:</span>
                    <span className="ml-2 font-semibold">R$ {locationResult.media_m2.toLocaleString('pt-BR')}/m²</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Desvio Padrão:</span>
                    <span className="ml-2 font-semibold">R$ {locationResult.desvio_padrao.toLocaleString('pt-BR')}/m²</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
                Digite uma localização para ver as transações oficiais
              </div>
            )}
          </TabsContent>

          <TabsContent value="transacoes" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor-min">Valor Mínimo</Label>
                <Input 
                  id="valor-min" 
                  type="number" 
                  placeholder="0" 
                  value={valorMin}
                  onChange={(e) => {
                    setValorMin(e.target.value);
                    setSearchTransactions(false);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor-max">Valor Máximo</Label>
                <Input 
                  id="valor-max" 
                  type="number" 
                  placeholder="10000000" 
                  value={valorMax}
                  onChange={(e) => {
                    setValorMax(e.target.value);
                    setSearchTransactions(false);
                  }}
                />
              </div>
            </div>
            
            <Button className="w-full" onClick={handleTransactionSearch} disabled={transactionLoading}>
              {transactionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              Buscar Transações
            </Button>
            
            {transactionResult && transactionResult.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">Microbairros por liquidez:</p>
                {transactionResult.map((item, idx) => (
                  <div key={item.microbairro} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                    <span className="truncate max-w-[200px]">{idx + 1}. {item.microbairro}</span>
                    <div className="flex gap-4 text-muted-foreground">
                      <span>{item.total_transacoes} trans.</span>
                      <span className="font-medium text-foreground">R$ {(item.preco_medio_m2 / 1000).toFixed(1)}k/m²</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
                Defina a faixa de preço para ver os microbairros disponíveis
              </div>
            )}
          </TabsContent>

          <TabsContent value="valuation" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="val-localizacao">Localização</Label>
              <Input 
                id="val-localizacao" 
                placeholder="Rua ou condomínio" 
                value={valLocalizacao}
                onChange={(e) => {
                  setValLocalizacao(e.target.value);
                  setLocationQuery(e.target.value);
                  setSearchLocation(false);
                  setValuationResult(null);
                }}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setSearchLocation(true)}
                disabled={!valLocalizacao}
              >
                Validar Localização
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="val-area">Área (m²)</Label>
                <Input 
                  id="val-area" 
                  type="number" 
                  placeholder="150" 
                  value={valArea}
                  onChange={(e) => setValArea(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="val-quartos">Quartos</Label>
                <Input 
                  id="val-quartos" 
                  type="number" 
                  placeholder="3" 
                  value={valQuartos}
                  onChange={(e) => setValQuartos(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="val-vagas">Vagas</Label>
                <Input 
                  id="val-vagas" 
                  type="number" 
                  placeholder="2" 
                  value={valVagas}
                  onChange={(e) => setValVagas(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="val-sol">Sol</Label>
                <Select value={valSol} onValueChange={setValSol}>
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
                <Select value={valVista} onValueChange={setValVista}>
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
              <Select value={valEstado} onValueChange={setValEstado}>
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
            
            <Button 
              className="w-full" 
              onClick={calculateValuation}
              disabled={!locationResult || !valArea}
            >
              <Bot className="h-4 w-4 mr-2" />
              Calcular Valuation
            </Button>
            
            {valuationResult ? (
              <div className="p-4 border rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Preço Sugerido</p>
                  <p className="text-3xl font-bold text-accent">
                    R$ {valuationResult.justo.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Min: R$ {valuationResult.min.toLocaleString('pt-BR')} | 
                    Max: R$ {valuationResult.max.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-card rounded-lg">
                    <p className="text-xs text-muted-foreground">Mercado</p>
                    <p className="font-semibold text-foreground">{valuationResult.mercado}</p>
                  </div>
                  <div className="p-3 bg-card rounded-lg">
                    <p className="text-xs text-muted-foreground">Confiança</p>
                    <p className="font-semibold text-foreground">{valuationResult.confianca}%</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
                {locationResult 
                  ? "Preencha a área e calcule o valuation" 
                  : "Valide a localização primeiro para obter uma avaliação"}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
