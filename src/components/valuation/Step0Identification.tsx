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
    <div className="space-y-4 sm:space-y-6">
      {/* Dados do Imóvel */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 space-y-3 sm:space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-primary" />
            Dados do Imóvel
          </h4>
          
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="logradouro" className="text-xs sm:text-sm">Logradouro *</Label>
              <Input
                id="logradouro"
                value={state.logradouro}
                onChange={(e) => updateState({ logradouro: e.target.value })}
                placeholder="Ex: Avenida Lúcio Costa"
                className="h-10 sm:h-9"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <Label htmlFor="numero" className="text-xs sm:text-sm">Número</Label>
                <Input
                  id="numero"
                  value={state.numero}
                  onChange={(e) => updateState({ numero: e.target.value })}
                  placeholder="1000"
                  className="h-10 sm:h-9"
                />
              </div>
              <div>
                <Label htmlFor="complemento" className="text-xs sm:text-sm">Complemento</Label>
                <Input
                  id="complemento"
                  value={state.complemento}
                  onChange={(e) => updateState({ complemento: e.target.value })}
                  placeholder="Bloco A, Apt 101"
                  className="h-10 sm:h-9"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="bairro" className="text-xs sm:text-sm">Bairro</Label>
              <Input
                id="bairro"
                value={state.bairro}
                onChange={(e) => updateState({ bairro: e.target.value })}
                placeholder="BARRA DA TIJUCA"
                className="h-10 sm:h-9"
              />
            </div>
            
            <div>
              <Label htmlFor="nomeCondominio" className="text-xs sm:text-sm">Nome do Condomínio (opcional)</Label>
              <Input
                id="nomeCondominio"
                value={state.nomeCondominio}
                onChange={(e) => updateState({ nomeCondominio: e.target.value })}
                placeholder="Ex: Riserva Golf"
                className="h-10 sm:h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Características Físicas */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 space-y-3 sm:space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            Características Físicas
          </h4>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="col-span-2">
              <Label htmlFor="tipoImovel" className="text-xs sm:text-sm">Tipo de Imóvel *</Label>
              <Select
                value={state.tipoImovel}
                onValueChange={(value) => updateState({ tipoImovel: value })}
              >
                <SelectTrigger className="h-10 sm:h-9">
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
              <Label htmlFor="area_m2" className="text-xs sm:text-sm">Área (m²) *</Label>
              <Input
                id="area_m2"
                type="number"
                value={state.area_m2 || ""}
                onChange={(e) => updateState({ area_m2: Number(e.target.value) || 0 })}
                placeholder="120"
                className="h-10 sm:h-9"
              />
            </div>
            
            <div>
              <Label htmlFor="andar" className="text-xs sm:text-sm">Andar</Label>
              <Input
                id="andar"
                value={state.andar}
                onChange={(e) => updateState({ andar: e.target.value })}
                placeholder="15º"
                className="h-10 sm:h-9"
              />
            </div>
            
            <div>
              <Label htmlFor="quartos" className="text-xs sm:text-sm">Quartos</Label>
              <Input
                id="quartos"
                type="number"
                min="0"
                value={state.quartos || ""}
                onChange={(e) => updateState({ quartos: Number(e.target.value) || 0 })}
                placeholder="3"
                className="h-10 sm:h-9"
              />
            </div>
            
            <div>
              <Label htmlFor="suites" className="text-xs sm:text-sm">Suítes</Label>
              <Input
                id="suites"
                type="number"
                min="0"
                value={state.suites || ""}
                onChange={(e) => updateState({ suites: Number(e.target.value) || 0 })}
                placeholder="1"
                className="h-10 sm:h-9"
              />
            </div>
            
            <div>
              <Label htmlFor="banheiros" className="text-xs sm:text-sm">Banheiros</Label>
              <Input
                id="banheiros"
                type="number"
                min="0"
                value={state.banheiros || ""}
                onChange={(e) => updateState({ banheiros: Number(e.target.value) || 0 })}
                placeholder="2"
                className="h-10 sm:h-9"
              />
            </div>
            
            <div>
              <Label htmlFor="vagas" className="text-xs sm:text-sm">Vagas</Label>
              <Input
                id="vagas"
                type="number"
                min="0"
                value={state.vagas || ""}
                onChange={(e) => updateState({ vagas: Number(e.target.value) || 0 })}
                placeholder="2"
                className="h-10 sm:h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Proprietário */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 space-y-3 sm:space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-primary" />
            Dados do Proprietário (opcional)
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="proprietario" className="text-xs sm:text-sm">Nome do Proprietário</Label>
              <Input
                id="proprietario"
                value={state.proprietario}
                onChange={(e) => updateState({ proprietario: e.target.value })}
                placeholder="Nome completo"
                className="h-10 sm:h-9"
              />
            </div>
            
            <div>
              <Label htmlFor="telefone" className="text-xs sm:text-sm">Telefone</Label>
              <Input
                id="telefone"
                value={state.telefone}
                onChange={(e) => updateState({ telefone: e.target.value })}
                placeholder="(21) 99999-9999"
                className="h-10 sm:h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados da Avaliação */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 space-y-3 sm:space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            Dados da Avaliação
          </h4>
          
          <div>
            <Label htmlFor="dataAvaliacao" className="text-xs sm:text-sm">Data da Avaliação</Label>
            <Input
              id="dataAvaliacao"
              type="date"
              value={state.dataAvaliacao}
              onChange={(e) => updateState({ dataAvaliacao: e.target.value })}
              className="h-10 sm:h-9 w-full sm:w-auto"
            />
          </div>
          
          <div>
            <Label htmlFor="observacoesImovel" className="text-xs sm:text-sm">Observações</Label>
            <Textarea
              id="observacoesImovel"
              value={state.observacoesImovel}
              onChange={(e) => updateState({ observacoesImovel: e.target.value })}
              placeholder="Anotações sobre o imóvel..."
              rows={3}
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
