import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Home, Target, TrendingUp, CheckCircle2 } from 'lucide-react';

import { DiagnosticAnswers, DIAGNOSTIC_OPTIONS } from '@/types/pricingStrategy';
import { countAnsweredQuestions } from '@/utils/pricingCalculations';

interface DiagnosticQuestionnaireProps {
  answers: DiagnosticAnswers;
  onAnswer: (key: keyof DiagnosticAnswers, value: string) => void;
}

interface QuestionBlockProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  questions: Array<{
    key: keyof DiagnosticAnswers;
    label: string;
    options: readonly { value: string; label: string }[];
  }>;
  answers: DiagnosticAnswers;
  onAnswer: (key: keyof DiagnosticAnswers, value: string) => void;
}

function QuestionBlock({ title, icon, color, questions, answers, onAnswer }: QuestionBlockProps) {
  const answeredCount = questions.filter(q => answers[q.key] !== null).length;
  const isComplete = answeredCount === questions.length;

  return (
    <Card className={`border-l-4 ${color}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            {title}
          </div>
          <Badge variant={isComplete ? 'default' : 'outline'} className="text-xs">
            {answeredCount}/{questions.length}
            {isComplete && <CheckCircle2 className="h-3 w-3 ml-1" />}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((question, index) => (
          <div key={question.key} className="space-y-3">
            <Label className="text-sm font-medium">
              {index + 1}. {question.label}
            </Label>
            <RadioGroup
              value={answers[question.key] || ''}
              onValueChange={(value) => onAnswer(question.key, value)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              {question.options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={option.value} 
                    id={`${question.key}-${option.value}`}
                    className="shrink-0"
                  />
                  <Label 
                    htmlFor={`${question.key}-${option.value}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DiagnosticQuestionnaire({ answers, onAnswer }: DiagnosticQuestionnaireProps) {
  const totalQuestions = 9;
  const answeredCount = countAnsweredQuestions(answers);
  const progress = (answeredCount / totalQuestions) * 100;

  const blocks = [
    {
      title: 'Características do Imóvel',
      icon: <Home className="h-5 w-5" />,
      color: 'border-l-blue-500',
      questions: [
        { key: 'q1_tempo_mercado' as const, label: 'Há quanto tempo está no mercado?', options: DIAGNOSTIC_OPTIONS.q1_tempo_mercado },
        { key: 'q2_concorrencia' as const, label: 'Concorrência na região?', options: DIAGNOSTIC_OPTIONS.q2_concorrencia },
        { key: 'q9_padrao_imovel' as const, label: 'Padrão do imóvel?', options: DIAGNOSTIC_OPTIONS.q9_padrao_imovel },
      ],
    },
    {
      title: 'Objetivos e Urgência',
      icon: <Target className="h-5 w-5" />,
      color: 'border-l-amber-500',
      questions: [
        { key: 'q3_prioridade' as const, label: 'Qual a prioridade na venda?', options: DIAGNOSTIC_OPTIONS.q3_prioridade },
        { key: 'q4_horizonte_tempo' as const, label: 'Horizonte de tempo para venda?', options: DIAGNOSTIC_OPTIONS.q4_horizonte_tempo },
        { key: 'q5_situacao_financeira' as const, label: 'Situação financeira do vendedor?', options: DIAGNOSTIC_OPTIONS.q5_situacao_financeira },
      ],
    },
    {
      title: 'Mercado',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'border-l-purple-500',
      questions: [
        { key: 'q6_estado_mercado' as const, label: 'Como está o mercado para seu imóvel?', options: DIAGNOSTIC_OPTIONS.q6_estado_mercado },
        { key: 'q7_clientes_potenciais' as const, label: 'Clientes potenciais identificados?', options: DIAGNOSTIC_OPTIONS.q7_clientes_potenciais },
        { key: 'q8_pronto_vender' as const, label: 'Está pronto para vender?', options: DIAGNOSTIC_OPTIONS.q8_pronto_vender },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Diagnóstico do Imóvel</span>
          <span className="text-muted-foreground">
            {answeredCount} de {totalQuestions} perguntas
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question blocks */}
      {blocks.map((block) => (
        <QuestionBlock
          key={block.title}
          title={block.title}
          icon={block.icon}
          color={block.color}
          questions={block.questions}
          answers={answers}
          onAnswer={onAnswer}
        />
      ))}
    </div>
  );
}
