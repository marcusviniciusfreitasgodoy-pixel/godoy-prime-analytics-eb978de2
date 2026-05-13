import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Zap, 
  Scale, 
  Crown, 
  Star, 
  Check,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

import { StrategyType, StrategyCalculation } from '@/types/pricingStrategy';
import { formatCurrencyBRL, formatPercentage } from '@/utils/pricingCalculations';

interface StrategyCardsProps {
  calculos: {
    atracao: StrategyCalculation;
    mercado: StrategyCalculation;
    premium: StrategyCalculation;
  };
  recomendada: StrategyType | null;
  valorItbi: number;
  onSelect: (strategy: StrategyType) => void;
}

interface StrategyCardData {
  key: StrategyType;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  objetivo: string;
  velocidade: 'Alta' | 'Média' | 'Baixa';
  negociacao: 'Baixa' | 'Média' | 'Alta';
}

const STRATEGY_DATA: StrategyCardData[] = [
  {
    key: 'atracao',
    name: 'ATRAÇÃO',
    icon: <Zap className="h-6 w-6" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    objetivo: 'Venda rápida — Valor Justo + margem mínima',
    velocidade: 'Alta',
    negociacao: 'Baixa',
  },
  {
    key: 'mercado',
    name: 'MERCADO',
    icon: <Scale className="h-6 w-6" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-500',
    objetivo: 'Equilíbrio — Valor Justo + margem padrão',
    velocidade: 'Média',
    negociacao: 'Média',
  },
  {
    key: 'premium',
    name: 'PREMIUM',
    icon: <Crown className="h-6 w-6" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500',
    objetivo: 'Maximizar valor — Valor Justo + margem ampliada',
    velocidade: 'Baixa',
    negociacao: 'Alta',
  },
];

function VelocityIndicator({ level }: { level: 'Alta' | 'Média' | 'Baixa' }) {
  const icons = {
    Alta: <TrendingUp className="h-4 w-4 text-green-600" />,
    Média: <Minus className="h-4 w-4 text-amber-600" />,
    Baixa: <TrendingDown className="h-4 w-4 text-red-600" />,
  };
  const colors = {
    Alta: 'text-green-600',
    Média: 'text-amber-600',
    Baixa: 'text-red-600',
  };

  return (
    <div className="flex items-center gap-1">
      {icons[level]}
      <span className={`text-xs ${colors[level]}`}>{level}</span>
    </div>
  );
}

export function StrategyCards({ calculos, recomendada, valorItbi, onSelect }: StrategyCardsProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Escolha sua Estratégia</h3>
        <p className="text-sm text-muted-foreground">
          Selecione a estratégia que melhor atende seus objetivos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STRATEGY_DATA.map((strategy) => {
          const calc = calculos[strategy.key];
          const isRecomendada = recomendada === strategy.key;

          return (
            <Card 
              key={strategy.key}
              className={`relative transition-all hover:shadow-lg cursor-pointer ${
                isRecomendada 
                  ? `${strategy.borderColor} border-2 shadow-md` 
                  : 'border hover:border-primary/50'
              }`}
              onClick={() => onSelect(strategy.key)}
            >
              {/* Badge recomendado */}
              {isRecomendada && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-sm">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Recomendado
                  </Badge>
                </div>
              )}

              <CardHeader className={`pb-2 ${isRecomendada ? 'pt-6' : ''}`}>
                <CardTitle className="flex items-center justify-center gap-2">
                  <div className={`p-2 rounded-full ${strategy.bgColor} ${strategy.color}`}>
                    {strategy.icon}
                  </div>
                </CardTitle>
                <div className="text-center">
                  <h4 className={`font-bold text-lg ${strategy.color}`}>
                    {strategy.name}
                  </h4>
                  <Badge 
                    className={`mt-2 text-sm font-bold px-3 py-1 ${strategy.bgColor} ${strategy.color} border ${strategy.borderColor}`}
                  >
                    {formatPercentage(calc.percentual)} sobre Avaliação
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-xs text-center text-muted-foreground">
                  {strategy.objetivo}
                </p>

                {/* Indicadores de velocidade/negociação */}
                <div className="flex justify-center gap-4 text-xs">
                  <div className="text-center">
                    <span className="text-muted-foreground">Velocidade</span>
                    <VelocityIndicator level={strategy.velocidade} />
                  </div>
                  <div className="text-center">
                    <span className="text-muted-foreground">Negociação</span>
                    <VelocityIndicator level={strategy.negociacao} />
                  </div>
                </div>

                <Separator />

                {/* Valores */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preço anúncio</span>
                    <span className="font-semibold">{formatCurrencyBRL(calc.preco_anuncio)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Corretagem (6%)</span>
                    <span className="text-red-600">-{formatCurrencyBRL(calc.corretagem)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Líquido vendedor</span>
                    <span className="text-green-600">{formatCurrencyBRL(calc.liquido)}</span>
                  </div>
                </div>

                {/* Prêmio vs Avaliação */}
                <div className={`text-center p-2 rounded-lg ${strategy.bgColor}`}>
                  <span className="text-xs text-muted-foreground">Prêmio líquido vs. Avaliação</span>
                  <div className={`font-bold ${calc.premio_liquido_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {calc.premio_liquido_pct >= 0 ? '+' : ''}{calc.premio_liquido_pct.toFixed(1)}%
                  </div>
                </div>

                {/* Botão selecionar */}
                <Button 
                  className={`w-full ${isRecomendada ? '' : 'variant-outline'}`}
                  variant={isRecomendada ? 'default' : 'outline'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(strategy.key);
                  }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Selecionar
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
