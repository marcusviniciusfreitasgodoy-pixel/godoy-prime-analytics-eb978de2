import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Zap, 
  Scale, 
  Crown, 
  Target,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  ListChecks,
  GitCompareArrows,
  FootprintsIcon,
  Camera,
  FileText,
  Sparkles,
  Clock,
  HelpCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { StrategyType, StrategyCalculation } from '@/types/pricingStrategy';
import { formatCurrencyBRL, formatPercentage } from '@/utils/pricingCalculations';

interface PostSelectionDetailsProps {
  estrategia: StrategyType;
  calculos: {
    atracao: StrategyCalculation;
    mercado: StrategyCalculation;
    premium: StrategyCalculation;
  };
  valorItbi: number;
  /** Valor Justo de referência (saída do motor de avaliação) — usado apenas para exibição */
  valorJusto?: number;
  planoAjusteAtivo: boolean;
  onTogglePlanoAjuste: () => void;
  isConfirmed: boolean;
}

const STRATEGY_INFO: Record<StrategyType, { name: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  atracao: {
    name: 'ATRAÇÃO',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  mercado: {
    name: 'MERCADO',
    icon: <Scale className="h-5 w-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  premium: {
    name: 'PREMIUM',
    icon: <Crown className="h-5 w-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
};

const BASE_CHECKLIST = [
  { icon: <Camera className="h-4 w-4" />, text: 'Fotos profissionais' },
  { icon: <Sparkles className="h-4 w-4" />, text: 'Imóvel limpo e organizado' },
  { icon: <FileText className="h-4 w-4" />, text: 'Documentação em ordem' },
  { icon: <Clock className="h-4 w-4" />, text: 'Disponível para visitas' },
  { icon: <ListChecks className="h-4 w-4" />, text: 'Descrição detalhada' },
  { icon: <Target className="h-4 w-4" />, text: 'Diferenciais bem definidos' },
];

const PREMIUM_CHECKLIST = [
  { icon: <Crown className="h-4 w-4" />, text: 'Apresentação premium (materiais de qualidade)' },
  { icon: <Sparkles className="h-4 w-4" />, text: 'Narrativa de diferenciais exclusivos' },
  { icon: <Camera className="h-4 w-4" />, text: 'Tour virtual ou vídeo profissional' },
  { icon: <Target className="h-4 w-4" />, text: 'Acabamentos destacados' },
];

const PROXIMOS_PASSOS = [
  { step: 1, title: 'Confirmar preço e estratégia', desc: 'Validar valores com o proprietário' },
  { step: 2, title: 'Preparar anúncio', desc: 'Fotos, descrição e materiais' },
  { step: 3, title: 'Publicar em portais', desc: 'ZAP, VivaReal, OLX e site próprio' },
  { step: 4, title: 'Marketing e distribuição', desc: 'Redes sociais, WhatsApp, mailing' },
  { step: 5, title: 'Monitorar performance', desc: 'Acompanhar métricas e aplicar ajustes' },
];

export function PostSelectionDetails({
  estrategia,
  calculos,
  valorItbi,
  valorJusto,
  planoAjusteAtivo,
  onTogglePlanoAjuste,
  isConfirmed,
}: PostSelectionDetailsProps) {
  const info = STRATEGY_INFO[estrategia];
  const calc = calculos[estrategia];
  const checklist = estrategia === 'premium' 
    ? [...BASE_CHECKLIST, ...PREMIUM_CHECKLIST] 
    : BASE_CHECKLIST;

  const subtituloEstrategia: Record<StrategyType, string> = {
    atracao: 'Venda rápida — Valor Justo + margem mínima',
    mercado: 'Equilíbrio — Valor Justo + margem padrão',
    premium: 'Maximizar valor — Valor Justo + margem ampliada',
  };

  return (
    <div className="space-y-4">
      {/* Header com estratégia selecionada */}
      <Card className={`border-2 ${
        estrategia === 'atracao' ? 'border-blue-500' :
        estrategia === 'mercado' ? 'border-amber-500' : 'border-purple-500'
      }`}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${info.bgColor} ${info.color}`}>
                {info.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold text-lg ${info.color}`}>{info.name}</h3>
                  {isConfirmed && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Confirmado
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {subtituloEstrategia[estrategia]} ({formatPercentage(calc.percentual)})
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Preço de anúncio</div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrencyBRL(calc.preco_anuncio)}
              </div>
              {valorJusto && valorJusto > 0 && (
                <div className="text-[11px] text-muted-foreground mt-1">
                  Valor Justo: {formatCurrencyBRL(valorJusto)} · Margem: {formatPercentage(calc.percentual)}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plano de ajuste Premium */}
      {estrategia === 'premium' && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Plano de Ajuste Sugerido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Para estratégia Premium, recomendamos ativar o plano de ajuste automático:
            </p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• 30 dias sem proposta → reduzir -4% no preço</li>
              <li>• 60 dias sem proposta → reduzir mais -4%</li>
              <li>• 90 dias → migrar para estratégia MERCADO</li>
            </ul>
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="plano-ajuste" className="text-sm font-medium">
                Ativar plano de ajuste
              </Label>
              <Switch
                id="plano-ajuste"
                checked={planoAjusteAtivo}
                onCheckedChange={onTogglePlanoAjuste}
                disabled={isConfirmed}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accordion com detalhes */}
      <Accordion type="multiple" defaultValue={['margem', 'checklist']} className="space-y-2">
        {/* Seção 1: Margem de Negociação */}
        <AccordionItem value="margem" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="font-medium">Margem de Negociação</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    Piso planejado (97%)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">
                            <strong>97% do preço de anúncio.</strong><br/>
                            Representa o limite mínimo aceitável na negociação (desconto máximo de 3%). 
                            Abaixo deste valor, a estratégia de precificação fica comprometida.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-lg font-semibold">{formatCurrencyBRL(calc.piso_planejado)}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    Líquido mínimo planejado
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">
                            Valor que o vendedor recebe no pior cenário de negociação, 
                            já descontada a corretagem sobre o piso planejado.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-lg font-semibold text-green-600">{formatCurrencyBRL(calc.liquido_min)}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                O piso planejado representa o menor valor de anúncio aceitável em negociação. 
                Valores abaixo podem comprometer a estratégia definida.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Seção 2: Checklist */}
        <AccordionItem value="checklist" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <span className="font-medium">Checklist de Pré-requisitos</span>
              <Badge variant="outline" className="ml-2">{checklist.length} itens</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checklist.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <div className="text-primary">{item.icon}</div>
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Seção 3: Comparativo */}
        <AccordionItem value="comparativo" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <GitCompareArrows className="h-4 w-4 text-primary" />
              <span className="font-medium">Comparativo de Estratégias</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-1 font-medium">Métrica</th>
                    <th className={`text-right py-2 px-1 ${estrategia === 'atracao' ? 'bg-blue-50 font-bold' : ''}`}>
                      ATRAÇÃO
                    </th>
                    <th className={`text-right py-2 px-1 ${estrategia === 'mercado' ? 'bg-amber-50 font-bold' : ''}`}>
                      MERCADO
                    </th>
                    <th className={`text-right py-2 px-1 ${estrategia === 'premium' ? 'bg-purple-50 font-bold' : ''}`}>
                      PREMIUM
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2 px-1 text-muted-foreground">Markup (%)</td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'atracao' ? 'bg-blue-50' : ''}`}>
                      {formatPercentage(calculos.atracao.percentual)}
                    </td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'mercado' ? 'bg-amber-50' : ''}`}>
                      {formatPercentage(calculos.mercado.percentual)}
                    </td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'premium' ? 'bg-purple-50' : ''}`}>
                      {formatPercentage(calculos.premium.percentual)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-1 text-muted-foreground">Preço anúncio</td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'atracao' ? 'bg-blue-50' : ''}`}>
                      {formatCurrencyBRL(calculos.atracao.preco_anuncio)}
                    </td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'mercado' ? 'bg-amber-50' : ''}`}>
                      {formatCurrencyBRL(calculos.mercado.preco_anuncio)}
                    </td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'premium' ? 'bg-purple-50' : ''}`}>
                      {formatCurrencyBRL(calculos.premium.preco_anuncio)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-1 text-muted-foreground">Corretagem (6%)</td>
                    <td className={`text-right py-2 px-1 text-red-600 ${estrategia === 'atracao' ? 'bg-blue-50' : ''}`}>
                      -{formatCurrencyBRL(calculos.atracao.corretagem)}
                    </td>
                    <td className={`text-right py-2 px-1 text-red-600 ${estrategia === 'mercado' ? 'bg-amber-50' : ''}`}>
                      -{formatCurrencyBRL(calculos.mercado.corretagem)}
                    </td>
                    <td className={`text-right py-2 px-1 text-red-600 ${estrategia === 'premium' ? 'bg-purple-50' : ''}`}>
                      -{formatCurrencyBRL(calculos.premium.corretagem)}
                    </td>
                  </tr>
                  <tr className="font-medium">
                    <td className="py-2 px-1">Líquido vendedor</td>
                    <td className={`text-right py-2 px-1 text-green-600 ${estrategia === 'atracao' ? 'bg-blue-50' : ''}`}>
                      {formatCurrencyBRL(calculos.atracao.liquido)}
                    </td>
                    <td className={`text-right py-2 px-1 text-green-600 ${estrategia === 'mercado' ? 'bg-amber-50' : ''}`}>
                      {formatCurrencyBRL(calculos.mercado.liquido)}
                    </td>
                    <td className={`text-right py-2 px-1 text-green-600 ${estrategia === 'premium' ? 'bg-purple-50' : ''}`}>
                      {formatCurrencyBRL(calculos.premium.liquido)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-1 text-muted-foreground flex items-center gap-1">
                      Piso planejado (97%)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">97% do preço de anúncio = desconto máximo de 3%</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'atracao' ? 'bg-blue-50' : ''}`}>
                      {formatCurrencyBRL(calculos.atracao.piso_planejado)}
                    </td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'mercado' ? 'bg-amber-50' : ''}`}>
                      {formatCurrencyBRL(calculos.mercado.piso_planejado)}
                    </td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'premium' ? 'bg-purple-50' : ''}`}>
                      {formatCurrencyBRL(calculos.premium.piso_planejado)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-1 text-muted-foreground flex items-center gap-1">
                      Líquido mínimo
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">Valor líquido ao vendedor após desconto máximo e corretagem</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'atracao' ? 'bg-blue-50' : ''}`}>
                      {formatCurrencyBRL(calculos.atracao.liquido_min)}
                    </td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'mercado' ? 'bg-amber-50' : ''}`}>
                      {formatCurrencyBRL(calculos.mercado.liquido_min)}
                    </td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'premium' ? 'bg-purple-50' : ''}`}>
                      {formatCurrencyBRL(calculos.premium.liquido_min)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-1 text-muted-foreground">Prêmio vs. Avaliação</td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'atracao' ? 'bg-blue-50' : ''}`}>
                      {calculos.atracao.premio_liquido_pct >= 0 ? '+' : ''}{calculos.atracao.premio_liquido_pct.toFixed(1)}%
                    </td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'mercado' ? 'bg-amber-50' : ''}`}>
                      {calculos.mercado.premio_liquido_pct >= 0 ? '+' : ''}{calculos.mercado.premio_liquido_pct.toFixed(1)}%
                    </td>
                    <td className={`text-right py-2 px-1 ${estrategia === 'premium' ? 'bg-purple-50' : ''}`}>
                      {calculos.premium.premio_liquido_pct >= 0 ? '+' : ''}{calculos.premium.premio_liquido_pct.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Seção 4: Próximos Passos */}
        <AccordionItem value="proximos-passos" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <FootprintsIcon className="h-4 w-4 text-primary" />
              <span className="font-medium">Próximos Passos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-3">
              {PROXIMOS_PASSOS.map((passo) => (
                <div key={passo.step} className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    {passo.step}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{passo.title}</div>
                    <div className="text-xs text-muted-foreground">{passo.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
