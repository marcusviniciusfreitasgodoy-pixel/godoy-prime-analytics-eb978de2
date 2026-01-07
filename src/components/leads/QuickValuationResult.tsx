import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, MapPin, Maximize2, Home, Calculator, AlertCircle, Shield, MessageCircle, Phone, Check } from "lucide-react";
import { ComparisonTable } from "./ComparisonTable";
import { PeritEvaluationSection } from "./PeritEvaluationSection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickValuationData {
  bairro: string;
  logradouro: string;
  area_m2: number;
  tipologia: string;
  quartos?: number;
  banheiros?: number;
  suites?: number;
  vagas?: number;
  diferenciais?: string;
  itbiData: {
    min_m2: number;
    med_m2: number;
    max_m2: number;
    transaction_count: number;
  } | null;
  estimativa: {
    min: number;
    med: number;
    max: number;
  } | null;
  // Lead data from form
  leadName: string;
  leadEmail: string;
  leadPhone: string;
}

interface QuickValuationResultProps {
  data: QuickValuationData;
  onNewValuation: () => void;
}

export function QuickValuationResult({ 
  data, 
  onNewValuation 
}: QuickValuationResultProps) {
  const [parecerRequested, setParecerRequested] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const formatCurrency = (value: number, compact = false) => {
    if (compact && value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')} mi`;
    }
    if (compact && value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)} mil`;
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const hasData = data.itbiData && data.estimativa;

  const handleRequestParecer = async () => {
    setIsRequesting(true);
    
    try {
      // Send complete evaluation request notification
      const { data: response, error } = await supabase.functions.invoke('send-lead-notification', {
        body: {
          type: 'complete',
          leadId: '',
          leadName: data.leadName,
          leadEmail: data.leadEmail,
          leadPhone: data.leadPhone,
          interesse: 'compra',
          bairro: data.bairro,
          area: data.area_m2,
          tipologia: data.tipologia,
          quartos: data.quartos,
          banheiros: data.banheiros,
          suites: data.suites,
          vagas: data.vagas,
          estimativaMin: data.estimativa?.min,
          estimativaMed: data.estimativa?.med,
          estimativaMax: data.estimativa?.max,
        }
      });

      if (error) {
        console.error('Error sending notification:', error);
        toast.error("Erro ao enviar solicitação. Tente pelo WhatsApp.");
      } else {
        console.log('Notification sent successfully:', response);
        toast.success("Solicitação enviada com sucesso!");
      }
      
      setParecerRequested(true);

      // Open WhatsApp
      setTimeout(() => {
        const whatsappNumber = "5521964075124";
        const message = encodeURIComponent(
          `Olá! Sou ${data.leadName}.\n\nQuero solicitar meu Parecer Técnico Godoy Prime para proteger meu patrimônio.\n\nImóvel analisado: ${data.tipologia} de ${data.area_m2}m² em ${data.bairro}\nEstimativa Preliminar: ${formatCurrency(data.estimativa?.min || 0)} a ${formatCurrency(data.estimativa?.max || 0)}\n\nMeu WhatsApp: ${data.leadPhone}\nMeu email: ${data.leadEmail}`
        );
        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
      }, 500);
    } catch (err) {
      console.error('Request error:', err);
      toast.error("Erro ao enviar. Tente pelo WhatsApp.");
    } finally {
      setIsRequesting(false);
    }
  };

  if (!hasData) {
    return (
      <Card className="border-primary/20 shadow-lg">
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium">Dados Insuficientes</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Não encontramos transações suficientes para esta localização específica. 
                Tente expandir a busca removendo o endereço ou alterando o bairro.
              </p>
            </div>
            <Button onClick={onNewValuation} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Lead Info Badge */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-800">{data.leadName}</p>
            <p className="text-xs text-green-600">{data.leadEmail}</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          Cadastro Confirmado
        </Badge>
      </div>

      {/* Resultado Preliminar */}
      <Card className="border-accent/30 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3">
            <Calculator className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Sua Análise Preliminar de Valor</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Com base nos dados informados, seu imóvel possui uma estimativa de valor entre:
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Property Summary */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="secondary" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {data.bairro}
            </Badge>
            {data.logradouro && (
              <Badge variant="outline" className="flex items-center gap-1">
                {data.logradouro}
              </Badge>
            )}
            <Badge variant="secondary" className="flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              {data.area_m2} m²
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Home className="h-3 w-3" />
              {data.tipologia}
            </Badge>
          </div>

          <Separator />

          {/* Value Estimation - Destacado */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <div className="text-center p-2 sm:p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-yellow-600" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Mínimo</p>
                <p className="font-bold text-sm sm:text-lg text-yellow-700">{formatCurrency(data.estimativa!.min, true)}</p>
              </div>
              
              <div className="text-center p-2 sm:p-4 rounded-lg bg-primary/10 border-2 border-primary/30 shadow-lg">
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-primary" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Provável</p>
                <p className="font-bold text-base sm:text-xl text-primary">{formatCurrency(data.estimativa!.med, true)}</p>
              </div>
              
              <div className="text-center p-2 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-green-600" />
                <p className="text-[10px] sm:text-xs text-muted-foreground">Máximo</p>
                <p className="font-bold text-sm sm:text-lg text-green-700">{formatCurrency(data.estimativa!.max, true)}</p>
              </div>
            </div>

            {/* Market Reference */}
            <div className="bg-muted/30 rounded-lg p-3 sm:p-4 space-y-2">
              <h4 className="text-xs sm:text-sm font-medium text-center">Referência de Mercado (R$/m²)</h4>
              <div className="grid grid-cols-3 gap-1 text-center text-xs sm:text-sm">
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Mín</p>
                  <p className="font-medium text-[11px] sm:text-sm">{formatCurrency(data.itbiData!.min_m2, true)}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Méd</p>
                  <p className="font-medium text-[11px] sm:text-sm">{formatCurrency(data.itbiData!.med_m2, true)}</p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Máx</p>
                  <p className="font-medium text-[11px] sm:text-sm">{formatCurrency(data.itbiData!.max_m2, true)}</p>
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground text-center pt-1 sm:pt-2">
                Baseado em {data.itbiData!.transaction_count} transações dos últimos 12 meses
              </p>
            </div>
          </div>

          {/* Aviso */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <strong>Aviso:</strong> Esta é uma estimativa automática baseada em dados históricos de transações oficiais 
            e em regras estatísticas. Para ter certeza do valor real, você precisa de uma análise técnica completa.
          </div>
        </CardContent>
      </Card>

      {/* Seção Completa de Avaliação com Perito */}
      <Card className="border-border shadow-lg">
        <CardContent className="py-6">
          <PeritEvaluationSection />
        </CardContent>
      </Card>

      {/* Tabela Comparativa */}
      <Card className="border-border">
        <CardContent className="py-6">
          <ComparisonTable />
        </CardContent>
      </Card>

      {/* CTA para Parecer Técnico */}
      {parecerRequested ? (
        <Card className="border-green-500/30 bg-green-50">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-green-800">
                Solicitação de Parecer Técnico Enviada!
              </h3>
              <p className="text-green-700">
                Obrigado, <strong>{data.leadName}</strong>! Nossa equipe entrará em contato em breve 
                para iniciar a proteção do seu patrimônio.
              </p>
              <p className="text-sm text-green-600">
                Também abrimos o WhatsApp para você enviar uma mensagem direta.
              </p>
              <Button onClick={onNewValuation} variant="outline" className="mt-4">
                Fazer Nova Consulta de Valor
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-accent/30 bg-gradient-to-b from-accent/5 to-transparent">
          <CardContent className="py-8">
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-xl font-bold">
                  🏆 Próximo Passo: Validação Técnica Completa
                </h3>
                <p className="text-muted-foreground mt-2">
                  Proteja seu patrimônio com o <strong>Parecer Técnico Godoy Prime</strong>
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleRequestParecer}
                  disabled={isRequesting}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                  size="lg"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  {isRequesting ? "Enviando..." : "Solicitar Parecer Técnico"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.open("tel:+552140400067", "_self")}
                  size="lg"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Ligar: (21) 4040-0067
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Ao solicitar, você será redirecionado para o WhatsApp de Marcus Godoy
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botão Nova Avaliação */}
      {!parecerRequested && (
        <div className="text-center">
          <Button variant="ghost" onClick={onNewValuation} className="text-muted-foreground">
            ← Voltar e fazer nova consulta
          </Button>
        </div>
      )}
    </div>
  );
}
