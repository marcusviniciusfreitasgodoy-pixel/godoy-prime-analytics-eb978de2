import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { 
  PricingStrategyState, 
  initialPricingStrategyState,
  DiagnosticAnswers,
  StrategyType 
} from '@/types/pricingStrategy';
import { 
  calculateAllStrategies, 
  determineRecommendedStrategy,
  isDiagnosticComplete,
  formatCurrencyBRL
} from '@/utils/pricingCalculations';

import { ListingStatusSelector } from './ListingStatusSelector';
import { DiagnosticQuestionnaire } from './DiagnosticQuestionnaire';
import { StrategyCards } from './StrategyCards';
import { PostSelectionDetails } from './PostSelectionDetails';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';

interface PricingStrategyModuleProps {
  valuationId?: string;
  valorItbiInicial?: number;
  /** Estratégia existente para edição */
  existingStrategy?: PricingStrategyState | null;
  onComplete?: (state: PricingStrategyState) => void;
  onBack?: () => void;
}

export function PricingStrategyModule({ 
  valuationId, 
  valorItbiInicial,
  existingStrategy,
  onComplete,
  onBack
}: PricingStrategyModuleProps) {
  const { user } = useAuthContext();
  const [state, setState] = useState<PricingStrategyState>(() => {
    // Se existir uma estratégia existente, usá-la
    if (existingStrategy) {
      return existingStrategy;
    }
    return {
      ...initialPricingStrategyState,
      valuation_id: valuationId,
      valor_itbi: valorItbiInicial || 0
    };
  });
  const [saving, setSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(!!existingStrategy);

  // Busca estratégia existente do banco quando valuationId é fornecido
  useEffect(() => {
    const loadExistingStrategy = async () => {
      if (!valuationId || isLoaded || existingStrategy) return;
      
      try {
        const { data, error } = await supabase
          .from('pricing_strategies')
          .select('*')
          .eq('valuation_id', valuationId)
          .maybeSingle();
        
        if (data && !error) {
          console.log('Estratégia de precificação carregada:', data.id);
          setState({
            id: data.id,
            valuation_id: data.valuation_id || undefined,
            valor_itbi: data.valor_itbi,
            is_new_listing: data.is_new_listing,
            diagnostico: {
              q1_tempo_mercado: data.q1_tempo_mercado,
              q2_concorrencia: data.q2_concorrencia,
              q3_prioridade: data.q3_prioridade,
              q4_horizonte_tempo: data.q4_horizonte_tempo,
              q5_situacao_financeira: data.q5_situacao_financeira,
              q6_estado_mercado: data.q6_estado_mercado,
              q7_clientes_potenciais: data.q7_clientes_potenciais,
              q8_pronto_vender: data.q8_pronto_vender,
              q9_padrao_imovel: data.q9_padrao_imovel,
            },
            estrategia_recomendada: data.estrategia_recomendada as StrategyType | null,
            estrategia_selecionada: data.estrategia_selecionada as StrategyType | null,
            calculos: data.preco_anuncio_mercado ? {
              atracao: {
                percentual: data.p_atracao,
                preco_anuncio: data.preco_anuncio_atracao || 0,
                corretagem: data.corretagem_atracao || 0,
                liquido: data.liquido_atracao || 0,
                piso_planejado: data.piso_planejado_atracao || 0,
                liquido_min: data.liquido_min_atracao || 0,
                premio_liquido_pct: data.premio_liquido_pct_atracao || 0,
              },
              mercado: {
                percentual: data.p_mercado,
                preco_anuncio: data.preco_anuncio_mercado || 0,
                corretagem: data.corretagem_mercado || 0,
                liquido: data.liquido_mercado || 0,
                piso_planejado: data.piso_planejado_mercado || 0,
                liquido_min: data.liquido_min_mercado || 0,
                premio_liquido_pct: data.premio_liquido_pct_mercado || 0,
              },
              premium: {
                percentual: data.p_premium,
                preco_anuncio: data.preco_anuncio_premium || 0,
                corretagem: data.corretagem_premium || 0,
                liquido: data.liquido_premium || 0,
                piso_planejado: data.piso_planejado_premium || 0,
                liquido_min: data.liquido_min_premium || 0,
                premio_liquido_pct: data.premio_liquido_pct_premium || 0,
              },
            } : null,
            plano_ajuste_ativo: data.plano_ajuste_ativo || false,
            status: data.status as PricingStrategyState['status'] || 'inicial',
          });
        }
        setIsLoaded(true);
      } catch (err) {
        console.error('Erro ao carregar estratégia:', err);
        setIsLoaded(true);
      }
    };
    
    loadExistingStrategy();
  }, [valuationId, isLoaded, existingStrategy]);

  // Atualiza o diagnóstico
  const updateDiagnostic = (key: keyof DiagnosticAnswers, value: string) => {
    setState(prev => ({
      ...prev,
      diagnostico: { ...prev.diagnostico, [key]: value }
    }));
  };

  // Define se é novo ou já anunciado
  const handleListingStatus = (isNew: boolean) => {
    setState(prev => ({
      ...prev,
      is_new_listing: isNew,
      status: isNew ? 'analisado' : 'diagnostico'
    }));

    // Se for novo, calcula imediatamente com defaults
    if (isNew && state.valor_itbi > 0) {
      analyzeStrategies(true);
    }
  };

  // Analisa as estratégias
  const analyzeStrategies = (isNewListing: boolean = false) => {
    if (state.valor_itbi <= 0) {
      toast.error('Informe o valor de avaliação');
      return;
    }

    if (!isNewListing && !isDiagnosticComplete(state.diagnostico)) {
      toast.error('Responda todas as 9 perguntas do diagnóstico');
      return;
    }

    const calculos = calculateAllStrategies(state.valor_itbi, state.diagnostico);
    const recomendada = isNewListing ? 'mercado' : determineRecommendedStrategy(state.diagnostico);

    setState(prev => ({
      ...prev,
      calculos,
      estrategia_recomendada: recomendada,
      status: 'analisado'
    }));

    saveToDatabase({ ...state, calculos, estrategia_recomendada: recomendada, status: 'analisado' });
  };

  // Seleciona uma estratégia
  const handleSelectStrategy = (strategy: StrategyType) => {
    setState(prev => ({
      ...prev,
      estrategia_selecionada: strategy,
      status: 'selecionado',
      plano_ajuste_ativo: strategy === 'premium' ? prev.plano_ajuste_ativo : false
    }));

    saveToDatabase({ ...state, estrategia_selecionada: strategy, status: 'selecionado' });
  };

  // Ativa/desativa plano de ajuste Premium
  const togglePlanoAjuste = () => {
    setState(prev => ({
      ...prev,
      plano_ajuste_ativo: !prev.plano_ajuste_ativo
    }));
  };

  // Confirma a estratégia
  const handleConfirm = () => {
    setState(prev => ({ ...prev, status: 'confirmado' }));
    saveToDatabase({ ...state, status: 'confirmado' });
    
    if (onComplete) {
      onComplete(state);
    }
    
    toast.success('Estratégia de precificação confirmada!');
  };

  // Volta para seleção (permite trocar estratégia)
  const handleChangeStrategy = () => {
    setState(prev => ({
      ...prev,
      estrategia_selecionada: null,
      status: 'analisado'
    }));
  };

  // Salva no Supabase
  const saveToDatabase = async (currentState: PricingStrategyState) => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const data = {
        valuation_id: valuationId || null,
        user_id: user.id,
        valor_itbi: currentState.valor_itbi,
        is_new_listing: currentState.is_new_listing ?? true,
        ...currentState.diagnostico,
        estrategia_recomendada: currentState.estrategia_recomendada || 'mercado',
        estrategia_selecionada: currentState.estrategia_selecionada,
        p_atracao: currentState.calculos?.atracao.percentual ?? 0.04,
        p_mercado: currentState.calculos?.mercado.percentual ?? 0.09,
        p_premium: currentState.calculos?.premium.percentual ?? 0.14,
        preco_anuncio_atracao: currentState.calculos?.atracao.preco_anuncio,
        corretagem_atracao: currentState.calculos?.atracao.corretagem,
        liquido_atracao: currentState.calculos?.atracao.liquido,
        piso_planejado_atracao: currentState.calculos?.atracao.piso_planejado,
        liquido_min_atracao: currentState.calculos?.atracao.liquido_min,
        premio_liquido_pct_atracao: currentState.calculos?.atracao.premio_liquido_pct,
        preco_anuncio_mercado: currentState.calculos?.mercado.preco_anuncio,
        corretagem_mercado: currentState.calculos?.mercado.corretagem,
        liquido_mercado: currentState.calculos?.mercado.liquido,
        piso_planejado_mercado: currentState.calculos?.mercado.piso_planejado,
        liquido_min_mercado: currentState.calculos?.mercado.liquido_min,
        premio_liquido_pct_mercado: currentState.calculos?.mercado.premio_liquido_pct,
        preco_anuncio_premium: currentState.calculos?.premium.preco_anuncio,
        corretagem_premium: currentState.calculos?.premium.corretagem,
        liquido_premium: currentState.calculos?.premium.liquido,
        piso_planejado_premium: currentState.calculos?.premium.piso_planejado,
        liquido_min_premium: currentState.calculos?.premium.liquido_min,
        premio_liquido_pct_premium: currentState.calculos?.premium.premio_liquido_pct,
        plano_ajuste_ativo: currentState.plano_ajuste_ativo,
        status: currentState.status,
      };

      if (currentState.id) {
        await supabase.from('pricing_strategies').update(data).eq('id', currentState.id);
      } else {
        const { data: inserted, error } = await supabase.from('pricing_strategies').insert(data).select().single();
        if (inserted && !error) {
          setState(prev => ({ ...prev, id: inserted.id }));
        }
      }
    } catch (error) {
      console.error('Erro ao salvar estratégia:', error);
    } finally {
      setSaving(false);
    }
  };

  // Recalcula quando valor ITBI muda
  const handleValorItbiChange = (value: string) => {
    const numValue = parseInt(value, 10) || 0;
    setState(prev => ({ ...prev, valor_itbi: numValue }));
    
    // Se já analisou, recalcula automaticamente
    if (state.status === 'analisado' || state.status === 'selecionado') {
      const calculos = calculateAllStrategies(numValue, state.diagnostico);
      setState(prev => ({ ...prev, calculos }));
    }
  };

  // Renderização baseada no status
  const renderContent = () => {
    // Status inicial: pergunta se é novo ou já anunciado
    if (state.is_new_listing === null) {
      return (
        <div className="space-y-6">
          {/* Input de Valor ITBI sempre visível */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Valor da Avaliação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="valor-itbi">Informe o valor base para cálculo das estratégias</Label>
                <CurrencyInput
                  id="valor-itbi"
                  value={state.valor_itbi.toString()}
                  onChange={handleValorItbiChange}
                  placeholder="R$ 0"
                  className="text-lg font-semibold"
                />
              </div>
            </CardContent>
          </Card>

          <ListingStatusSelector 
            onSelect={handleListingStatus}
            disabled={state.valor_itbi <= 0}
          />

          {state.valor_itbi <= 0 && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              Informe o valor da avaliação antes de prosseguir
            </div>
          )}
        </div>
      );
    }

    // Diagnóstico (apenas se não for novo)
    if (state.status === 'diagnostico' && !state.is_new_listing) {
      return (
        <div className="space-y-6">
          {/* Valor ITBI editável */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="font-medium">Valor Avaliação:</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrencyBRL(state.valor_itbi)}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, is_new_listing: null, status: 'inicial' }))}
                >
                  Alterar
                </Button>
              </div>
            </CardContent>
          </Card>

          <DiagnosticQuestionnaire
            answers={state.diagnostico}
            onAnswer={updateDiagnostic}
          />

          <div className="flex justify-between items-center pt-4">
            <Button 
              variant="outline" 
              onClick={() => setState(prev => ({ ...prev, is_new_listing: null, status: 'inicial' }))}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button 
              onClick={() => analyzeStrategies(false)}
              disabled={!isDiagnosticComplete(state.diagnostico)}
              className="bg-primary"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Analisar Estratégias
            </Button>
          </div>
        </div>
      );
    }

    // Mostrar cards de estratégias
    if (state.status === 'analisado' && state.calculos) {
      return (
        <div className="space-y-6">
          {/* Header com valor e status */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Valor Avaliação</span>
                    <div className="text-xl font-bold text-primary">
                      {formatCurrencyBRL(state.valor_itbi)}
                    </div>
                  </div>
                  <Separator orientation="vertical" className="h-10 hidden sm:block" />
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={state.is_new_listing ? 'default' : 'secondary'}>
                        {state.is_new_listing ? 'Novo no mercado' : 'Já anunciado'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    is_new_listing: null, 
                    status: 'inicial',
                    calculos: null,
                    estrategia_recomendada: null
                  }))}
                >
                  Refazer análise
                </Button>
              </div>
            </CardContent>
          </Card>

          <StrategyCards
            calculos={state.calculos}
            recomendada={state.estrategia_recomendada}
            valorItbi={state.valor_itbi}
            onSelect={handleSelectStrategy}
          />

          <div className="flex justify-start pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                if (state.is_new_listing) {
                  setState(prev => ({ ...prev, is_new_listing: null, status: 'inicial' }));
                } else {
                  setState(prev => ({ ...prev, status: 'diagnostico' }));
                }
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      );
    }

    // Detalhes pós-seleção
    if ((state.status === 'selecionado' || state.status === 'confirmado') && state.calculos && state.estrategia_selecionada) {
      return (
        <div className="space-y-6">
          <PostSelectionDetails
            estrategia={state.estrategia_selecionada}
            calculos={state.calculos}
            valorItbi={state.valor_itbi}
            planoAjusteAtivo={state.plano_ajuste_ativo}
            onTogglePlanoAjuste={togglePlanoAjuste}
            isConfirmed={state.status === 'confirmado'}
          />

          <div className="flex justify-between items-center pt-4">
            <Button 
              variant="outline" 
              onClick={handleChangeStrategy}
              disabled={state.status === 'confirmado'}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Trocar Estratégia
            </Button>
            
            {state.status !== 'confirmado' && (
              <Button onClick={handleConfirm} className="bg-primary">
                Confirmar Estratégia
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header do módulo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Estratégia de Precificação</h2>
            <p className="text-sm text-muted-foreground">
              Defina a melhor estratégia de preço para o imóvel
            </p>
          </div>
        </div>
        {saving && (
          <Badge variant="outline" className="animate-pulse">
            Salvando...
          </Badge>
        )}
      </div>

      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progresso</span>
          <span>
            {state.status === 'inicial' && '1/4'}
            {state.status === 'diagnostico' && '2/4'}
            {state.status === 'analisado' && '3/4'}
            {(state.status === 'selecionado' || state.status === 'confirmado') && '4/4'}
          </span>
        </div>
        <Progress 
          value={
            state.status === 'inicial' ? 25 :
            state.status === 'diagnostico' ? 50 :
            state.status === 'analisado' ? 75 : 100
          } 
          className="h-2"
        />
      </div>

      {renderContent()}

      {/* Botão de voltar geral */}
      {onBack && state.status === 'inicial' && (
        <Button variant="ghost" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Avaliação
        </Button>
      )}
    </div>
  );
}
