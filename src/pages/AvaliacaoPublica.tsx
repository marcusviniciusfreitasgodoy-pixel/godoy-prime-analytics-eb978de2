import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { QuickValuationForm } from "@/components/leads/QuickValuationForm";
import { QuickValuationResult } from "@/components/leads/QuickValuationResult";
import { LeadCaptureForm } from "@/components/leads/LeadCaptureForm";
import { ValuationEngine } from "@/components/valuation/ValuationEngine";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import godoyLogo from "@/assets/godoy-logo-symbol.png";

interface QuickValuationData {
  bairro: string;
  logradouro: string;
  area_m2: number;
  tipologia: string;
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
}

type Step = "form" | "lead-capture" | "result" | "complete-valuation";

export default function AvaliacaoPublica() {
  const [step, setStep] = useState<Step>("form");
  const [valuationData, setValuationData] = useState<QuickValuationData | null>(null);
  const [leadCaptured, setLeadCaptured] = useState(false);

  const handleQuickValuationComplete = (data: QuickValuationData) => {
    setValuationData(data);
    // Se tem dados, pede cadastro antes de mostrar resultado
    if (data.itbiData && data.estimativa) {
      setStep("lead-capture");
    } else {
      // Se não tem dados, mostra resultado direto (sem dados)
      setStep("result");
    }
  };

  const handleLeadCaptureSuccess = () => {
    setLeadCaptured(true);
    setStep("result");
  };

  const handleProceedToComplete = () => {
    if (!leadCaptured) {
      setStep("lead-capture");
    } else {
      setStep("complete-valuation");
    }
  };

  const handleNewValuation = () => {
    setValuationData(null);
    setStep("form");
  };

  const handleBackToResult = () => {
    setStep("result");
  };

  return (
    <>
      <Helmet>
        <title>Avaliação de Imóveis | Godoy Prime Realty</title>
        <meta 
          name="description" 
          content="Avalie gratuitamente o imóvel que você deseja comprar na Barra da Tijuca. Estimativa baseada em dados oficiais de transações." 
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        {/* Header */}
        <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={godoyLogo} alt="Godoy Prime" className="h-10 w-auto" />
              <div>
                <h1 className="font-semibold text-lg">Godoy Prime Realty</h1>
                <p className="text-xs text-muted-foreground">Avaliação Imobiliária</p>
              </div>
            </div>
            {step !== "form" && step !== "lead-capture" && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={step === "complete-valuation" ? handleBackToResult : handleNewValuation}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-lg">
          {step === "form" && (
            <QuickValuationForm onComplete={handleQuickValuationComplete} />
          )}

          {step === "lead-capture" && valuationData && (
            <LeadCaptureForm
              bairroInteresse={valuationData.bairro}
              areaInteresse={valuationData.area_m2}
              valorInteresse={valuationData.estimativa?.med}
              origem="avaliacao_rapida"
              onSuccess={handleLeadCaptureSuccess}
            />
          )}

          {step === "result" && valuationData && (
            <QuickValuationResult
              data={valuationData}
              onProceedToComplete={handleProceedToComplete}
              onNewValuation={handleNewValuation}
            />
          )}

          {step === "complete-valuation" && valuationData && (
            <div className="max-w-3xl mx-auto">
              <ValuationEngine bairro={valuationData.bairro} />
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t mt-auto py-6 bg-card/50">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Godoy Prime Realty. CRECI 11841-PJ</p>
            <p className="mt-1">
              Dados baseados em transações oficiais ITBI - Prefeitura do Rio de Janeiro
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
