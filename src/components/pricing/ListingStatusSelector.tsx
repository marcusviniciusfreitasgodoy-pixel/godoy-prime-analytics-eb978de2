import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Megaphone, ArrowRight } from 'lucide-react';

interface ListingStatusSelectorProps {
  onSelect: (isNew: boolean) => void;
  disabled?: boolean;
}

export function ListingStatusSelector({ onSelect, disabled }: ListingStatusSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-center">
        Este imóvel está sendo anunciado?
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Opção: Novo no mercado */}
        <Card 
          className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={() => !disabled && onSelect(true)}
        >
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-lg">Novo no Mercado</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  O imóvel ainda não foi anunciado para venda
                </p>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) onSelect(true);
                }}
              >
                Selecionar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Opção: Já anunciado */}
        <Card 
          className={`cursor-pointer transition-all hover:border-amber-500 hover:shadow-md ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={() => !disabled && onSelect(false)}
        >
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Megaphone className="h-8 w-8 text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-lg">Já Está Anunciado</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  O imóvel já está sendo anunciado nos portais
                </p>
              </div>
              <Button 
                variant="outline" 
                className="w-full border-amber-500/30 hover:bg-amber-50 hover:text-amber-700"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) onSelect(false);
                }}
              >
                Fazer Diagnóstico
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Selecione a opção que melhor descreve a situação atual do imóvel
      </p>
    </div>
  );
}
