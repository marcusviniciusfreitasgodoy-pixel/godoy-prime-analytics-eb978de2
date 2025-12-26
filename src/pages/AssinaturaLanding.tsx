import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileSignature, User, Briefcase } from "lucide-react";

export default function AssinaturaLanding() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<"visitante" | "corretor">("visitante");

  const go = () => {
    const clean = codigo.trim();
    if (!clean) return;
    navigate(`/visitas/assinatura/${encodeURIComponent(clean)}/${tipo}`);
  };

  return (
    <>
      <Helmet>
        <title>Assinatura Digital | Godoy Prime</title>
        <meta
          name="description"
          content="Assine digitalmente a ficha de visita informando o código recebido."
        />
        <link rel="canonical" href={`${window.location.origin}/visitas/assinatura`} />
      </Helmet>

      <main className="min-h-screen bg-background p-6">
        <section className="mx-auto max-w-md space-y-6">
          <h1 className="sr-only">Assinatura digital da visita</h1>

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <FileSignature className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Assinatura Digital</h2>
            <p className="text-muted-foreground">
              Assine a ficha de visita de forma rápida e segura
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Identificação</CardTitle>
              <CardDescription>
                Informe o código da visita e selecione quem está assinando
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Código da visita */}
              <div className="space-y-2">
                <Label htmlFor="codigo">Código da Visita</Label>
                <Input
                  id="codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ex: VIS-20251223-ABCD"
                  autoComplete="off"
                  inputMode="text"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") go();
                  }}
                />
              </div>

              {/* Tipo de assinatura */}
              <div className="space-y-3">
                <Label>Quem está assinando?</Label>
                <RadioGroup
                  value={tipo}
                  onValueChange={(value) => setTipo(value as "visitante" | "corretor")}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem
                      value="visitante"
                      id="visitante"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="visitante"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <User className="mb-2 h-6 w-6" />
                      <span className="text-sm font-medium">Visitante</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        Cliente que visitou o imóvel
                      </span>
                    </Label>
                  </div>
                  
                  <div>
                    <RadioGroupItem
                      value="corretor"
                      id="corretor"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="corretor"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Briefcase className="mb-2 h-6 w-6" />
                      <span className="text-sm font-medium">Corretor</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        Corretor responsável
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button 
                type="button" 
                onClick={go} 
                className="w-full"
                disabled={!codigo.trim()}
              >
                Continuar para Assinatura
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Se você recebeu um link de assinatura, basta clicar nele.
                Se recebeu apenas o código, insira-o acima.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
