import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, User, Calendar, MapPin } from "lucide-react";
import type { ValuationState } from "@/types/valuation";

interface Props {
  state: ValuationState;
  updateState: (updates: Partial<ValuationState>) => void;
}

const TIPOS_IMOVEL = [
  "Apartamento",
  "Casa",
  "Cobertura",
  "Cobertura Duplex",
  "Cobertura Linear",
  "Casa em Condomínio",
  "Loja",
  "Sala Comercial",
];

export function Step0Identification({ state, updateState }: Props) {
  return (
    <div className="space-y-6">
      {/* Dados do Imóvel */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6 space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-primary" />
            Dados do Imóvel
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="logradouro">Logradouro *</Label>
              <Input
                id="logradouro"
                value={state.logradouro}
                onChange={(e) => updateState({ logradouro: e.target.value })}
                placeholder="Ex: Avenida Lúcio Costa"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={state.numero}
                  onChange={(e) => updateState({ numero: e.target.value })}
                  placeholder="1000"
                />
              </div>
              <div>
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={state.complemento}
                  onChange={(e) => updateState({ complemento: e.target.value })}
                  placeholder="Bloco A, Apt 101"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={state.bairro}
                onChange={(e) => updateState({ bairro: e.target.value })}
                placeholder="BARRA DA TIJUCA"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="nomeCondominio">Nome do Condomínio (opcional)</Label>
              <Input
                id="nomeCondominio"
                value={state.nomeCondominio}
                onChange={(e) => updateState({ nomeCondominio: e.target.value })}
                placeholder="Ex: Riserva Golf"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Características Físicas */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6 space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            Características Físicas
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <Label htmlFor="tipoImovel">Tipo de Imóvel *</Label>
              <Select
                value={state.tipoImovel}
                onValueChange={(value) => updateState({ tipoImovel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_IMOVEL.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="area_m2">Área (m²) *</Label>
              <Input
                id="area_m2"
                type="number"
                value={state.area_m2 || ""}
                onChange={(e) => updateState({ area_m2: Number(e.target.value) || 0 })}
                placeholder="120"
              />
            </div>
            
            <div>
              <Label htmlFor="andar">Andar</Label>
              <Input
                id="andar"
                value={state.andar}
                onChange={(e) => updateState({ andar: e.target.value })}
                placeholder="15º"
              />
            </div>
            
            <div>
              <Label htmlFor="quartos">Quartos</Label>
              <Input
                id="quartos"
                type="number"
                min="0"
                value={state.quartos || ""}
                onChange={(e) => updateState({ quartos: Number(e.target.value) || 0 })}
                placeholder="3"
              />
            </div>
            
            <div>
              <Label htmlFor="suites">Suítes</Label>
              <Input
                id="suites"
                type="number"
                min="0"
                value={state.suites || ""}
                onChange={(e) => updateState({ suites: Number(e.target.value) || 0 })}
                placeholder="1"
              />
            </div>
            
            <div>
              <Label htmlFor="banheiros">Banheiros</Label>
              <Input
                id="banheiros"
                type="number"
                min="0"
                value={state.banheiros || ""}
                onChange={(e) => updateState({ banheiros: Number(e.target.value) || 0 })}
                placeholder="2"
              />
            </div>
            
            <div>
              <Label htmlFor="vagas">Vagas</Label>
              <Input
                id="vagas"
                type="number"
                min="0"
                value={state.vagas || ""}
                onChange={(e) => updateState({ vagas: Number(e.target.value) || 0 })}
                placeholder="2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Proprietário */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6 space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-primary" />
            Dados do Proprietário (opcional)
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="proprietario">Nome do Proprietário</Label>
              <Input
                id="proprietario"
                value={state.proprietario}
                onChange={(e) => updateState({ proprietario: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={state.telefone}
                onChange={(e) => updateState({ telefone: e.target.value })}
                placeholder="(21) 99999-9999"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados da Avaliação */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6 space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            Dados da Avaliação
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dataAvaliacao">Data da Avaliação</Label>
              <Input
                id="dataAvaliacao"
                type="date"
                value={state.dataAvaliacao}
                onChange={(e) => updateState({ dataAvaliacao: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="observacoesImovel">Observações</Label>
            <Textarea
              id="observacoesImovel"
              value={state.observacoesImovel}
              onChange={(e) => updateState({ observacoesImovel: e.target.value })}
              placeholder="Anotações sobre o imóvel..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
