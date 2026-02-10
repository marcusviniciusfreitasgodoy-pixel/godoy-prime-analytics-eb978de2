import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFeedbackVisita } from "@/hooks/useFeedbackVisita";
import { NivelInteresseVisita, PercepcaoValorVisita } from "@/types/visitas";
import { Loader2, Star, ThumbsUp, ThumbsDown, FileText } from "lucide-react";
import { ProposalForm } from "./ProposalForm";
import { PropostaPreFill } from "@/types/proposta";

const feedbackSchema = z.object({
  atende_necessidades: z.boolean().optional(),
  gostaria_fazer_proposta: z.boolean().optional(),
  avaliacao_geral: z.number().min(1).max(5),
  conexao_imovel: z.number().min(1).max(5),
  valor_ofertaria: z.string().optional(),
  nivel_interesse: z.enum(["baixo", "medio", "alto", "muito_alto"]),
  compraria_imovel: z.boolean().optional(),
  ponto_resistencia: z.string().optional(),
  percepcao_valor: z.enum(["abaixo", "justo", "acima"]),
  o_que_mais_gostou: z.string().optional(),
  o_que_menos_gostou: z.string().optional(),
  o_que_alteraria: z.string().optional(),
  pontos_positivos: z.string().optional(),
  pontos_negativos: z.string().optional(),
  sugestoes_melhoria: z.string().optional(),
  efeito_uau: z.array(z.string()).optional(),
  efeito_uau_detalhe: z.string().optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface FeedbackFormProps {
  fichaVisitaId: string;
  preFill?: PropostaPreFill;
  onSuccess?: () => void;
}

const efeitoUauOptions = [
  "Vista",
  "Acabamento",
  "Espaço",
  "Iluminação",
  "Varanda/Área externa",
  "Cozinha",
  "Banheiros",
  "Localização",
  "Condomínio",
  "Segurança",
];

export function FeedbackForm({ fichaVisitaId, preFill, onSuccess }: FeedbackFormProps) {
  const { createFeedback } = useFeedbackVisita();
  const [selectedEfeitoUau, setSelectedEfeitoUau] = useState<string[]>([]);

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      avaliacao_geral: 3,
      conexao_imovel: 3,
      nivel_interesse: "medio",
      percepcao_valor: "justo",
      efeito_uau: [],
    },
  });

  const onSubmit = async (data: FeedbackFormData) => {
    await createFeedback.mutateAsync({
      ficha_visita_id: fichaVisitaId,
      atende_necessidades: data.atende_necessidades,
      gostaria_fazer_proposta: data.gostaria_fazer_proposta,
      avaliacao_geral: data.avaliacao_geral,
      conexao_imovel: data.conexao_imovel,
      valor_ofertaria: data.valor_ofertaria ? parseFloat(data.valor_ofertaria.replace(/\D/g, "")) : null,
      nivel_interesse: data.nivel_interesse as NivelInteresseVisita,
      compraria_imovel: data.compraria_imovel,
      ponto_resistencia: data.ponto_resistencia || null,
      percepcao_valor: data.percepcao_valor as PercepcaoValorVisita,
      o_que_mais_gostou: data.o_que_mais_gostou || null,
      o_que_menos_gostou: data.o_que_menos_gostou || null,
      o_que_alteraria: data.o_que_alteraria || null,
      pontos_positivos: data.pontos_positivos || null,
      pontos_negativos: data.pontos_negativos || null,
      sugestoes_melhoria: data.sugestoes_melhoria || null,
      efeito_uau: selectedEfeitoUau.length > 0 ? selectedEfeitoUau : null,
      efeito_uau_detalhe: data.efeito_uau_detalhe || null,
    });

    onSuccess?.();
  };

  const toggleEfeitoUau = (value: string) => {
    setSelectedEfeitoUau(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const nivelInteresseLabels = {
    baixo: "Baixo",
    medio: "Médio",
    alto: "Alto",
    muito_alto: "Muito Alto",
  };

  const percepcaoValorLabels = {
    abaixo: "Abaixo do mercado",
    justo: "Preço justo",
    acima: "Acima do mercado",
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Avaliação Geral */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Avaliação Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="avaliacao_geral"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Como você avalia o imóvel no geral? (1-5)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Ruim</span>
                        <span className="font-medium text-lg">{field.value}</span>
                        <span>Excelente</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="conexao_imovel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qual foi sua conexão emocional com o imóvel? (1-5)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Nenhuma</span>
                        <span className="font-medium text-lg">{field.value}</span>
                        <span>Total</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="atende_necessidades"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>O imóvel atende às suas necessidades?</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Interesse e Proposta */}
        <Card>
          <CardHeader>
            <CardTitle>Interesse e Proposta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="nivel_interesse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qual seu nível de interesse no imóvel?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-2"
                    >
                      {Object.entries(nivelInteresseLabels).map(([value, label]) => (
                        <div key={value} className="flex items-center space-x-2">
                          <RadioGroupItem value={value} id={`interesse-${value}`} />
                          <label htmlFor={`interesse-${value}`} className="text-sm cursor-pointer">
                            {label}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="percepcao_valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Como você percebe o valor do imóvel?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                    >
                      {Object.entries(percepcaoValorLabels).map(([value, label]) => (
                        <div key={value} className="flex items-center space-x-2">
                          <RadioGroupItem value={value} id={`valor-${value}`} />
                          <label htmlFor={`valor-${value}`} className="text-sm cursor-pointer">
                            {label}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gostaria_fazer_proposta"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Gostaria de fazer uma proposta?</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valor_ofertaria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Se fosse fazer uma proposta, qual valor ofertaria?</FormLabel>
                  <FormControl>
                    <CurrencyInput 
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="R$ 0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Proposta condicional */}
        {form.watch("gostaria_fazer_proposta") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Faça sua Proposta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProposalForm
                preFill={{
                  ...preFill,
                  valor_ofertado: form.watch("valor_ofertaria")
                    ? parseFloat(form.watch("valor_ofertaria")!.replace(/\D/g, ""))
                    : undefined,
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Efeito UAU */}
        <Card>
          <CardHeader>
            <CardTitle>Efeito UAU ✨</CardTitle>
            <CardDescription>O que mais chamou sua atenção?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {efeitoUauOptions.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={selectedEfeitoUau.includes(option) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleEfeitoUau(option)}
                >
                  {option}
                </Button>
              ))}
            </div>

            <FormField
              control={form.control}
              name="efeito_uau_detalhe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descreva o que mais te impressionou</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Conte-nos o que mais chamou sua atenção..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Pontos Positivos e Negativos */}
        <Card>
          <CardHeader>
            <CardTitle>Pontos de Atenção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="o_que_mais_gostou"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-primary" />
                    O que você mais gostou?
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="o_que_menos_gostou"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <ThumbsDown className="h-4 w-4 text-destructive" />
                    O que você menos gostou?
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ponto_resistencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qual seu principal ponto de resistência?</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="O que poderia impedi-lo de fechar negócio?"
                      rows={2} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sugestoes_melhoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sugestões de melhoria</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="O que você mudaria no imóvel?"
                      rows={2} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          className="w-full"
          disabled={createFeedback.isPending}
          size="lg"
        >
          {createFeedback.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar Feedback
        </Button>
      </form>
    </Form>
  );
}
