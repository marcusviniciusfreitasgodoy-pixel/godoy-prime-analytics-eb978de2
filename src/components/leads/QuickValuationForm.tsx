import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, MapPin, Maximize2, Home, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

interface QuickValuationFormProps {
  onComplete: (data: QuickValuationData) => void;
}

const BAIRROS_POPULARES = [
  "BARRA DA TIJUCA",
  "RECREIO DOS BANDEIRANTES",
  "LEBLON",
  "IPANEMA",
  "COPACABANA",
  "BOTAFOGO",
  "LAGOA",
  "JARDIM BOTANICO",
  "GAVEA",
  "SAO CONRADO",
];

const TIPOLOGIAS = [
  { value: "Apartamento", label: "Apartamento" },
  { value: "Casa", label: "Casa" },
  { value: "Cobertura", label: "Cobertura" },
];

export function QuickValuationForm({ onComplete }: QuickValuationFormProps) {
  const [bairro, setBairro] = useState("BARRA DA TIJUCA");
  const [logradouro, setLogradouro] = useState("");
  const [area, setArea] = useState("");
  const [tipologia, setTipologia] = useState("Apartamento");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const areaNum = parseFloat(area);
    if (!bairro || !areaNum || areaNum <= 0) {
      setError("Preencha todos os campos obrigatórios");
      return;
    }

    setIsLoading(true);

    try {
      // Busca dados ITBI do bairro selecionado
      let query = supabase
        .from("itbi_transactions")
        .select("valor_m2, total_transacoes")
        .eq("bairro", bairro)
        .eq("uso", "Residencial")
        .gte("percentual_transferido", 90)
        .not("valor_m2", "is", null)
        .gte("data_transacao", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

      // Se tiver logradouro, filtra também
      if (logradouro.trim()) {
        query = query.ilike("logradouro", `%${logradouro.trim()}%`);
      }

      // Filtra por tipologia se não for "todos"
      if (tipologia && tipologia !== "Todos") {
        query = query.ilike("tipologia", `%${tipologia}%`);
      }

      const { data, error: dbError } = await query;

      if (dbError) throw dbError;

      let itbiData = null;
      let estimativa = null;

      if (data && data.length > 0) {
        const valores = data.map((d) => d.valor_m2 as number).sort((a, b) => a - b);
        const totalTransacoes = data.reduce((sum, d) => sum + (d.total_transacoes || 1), 0);

        const min_m2 = valores[Math.floor(valores.length * 0.1)] || valores[0];
        const max_m2 = valores[Math.floor(valores.length * 0.9)] || valores[valores.length - 1];
        const med_m2 = valores.reduce((a, b) => a + b, 0) / valores.length;

        itbiData = {
          min_m2: Math.round(min_m2),
          med_m2: Math.round(med_m2),
          max_m2: Math.round(max_m2),
          transaction_count: totalTransacoes,
        };

        estimativa = {
          min: Math.round(min_m2 * areaNum),
          med: Math.round(med_m2 * areaNum),
          max: Math.round(max_m2 * areaNum),
        };
      }

      onComplete({
        bairro,
        logradouro: logradouro.trim(),
        area_m2: areaNum,
        tipologia,
        itbiData,
        estimativa,
      });
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setError("Erro ao buscar dados. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-accent/30 shadow-xl bg-card/80 backdrop-blur">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center mb-4 shadow-lg">
          <Calculator className="h-8 w-8 text-accent" />
        </div>
        <CardTitle className="text-2xl font-bold">Avaliação Rápida Gratuita</CardTitle>
        <CardDescription className="text-base">
          Informe os dados do imóvel e descubra seu valor de mercado em segundos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="bairro" className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-accent" />
              Bairro *
            </Label>
            <Select value={bairro} onValueChange={setBairro}>
              <SelectTrigger className="border-primary/20 focus:ring-accent/30">
                <SelectValue placeholder="Selecione o bairro" />
              </SelectTrigger>
              <SelectContent>
                {BAIRROS_POPULARES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logradouro" className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Rua / Endereço (opcional)
            </Label>
            <Input
              id="logradouro"
              placeholder="Ex: Avenida das Américas"
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
              className="border-primary/20 focus-visible:ring-accent/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area" className="flex items-center gap-2 text-sm font-medium">
                <Maximize2 className="h-4 w-4 text-accent" />
                Área (m²) *
              </Label>
              <Input
                id="area"
                type="number"
                placeholder="Ex: 120"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                min="20"
                max="2000"
                className="border-primary/20 focus-visible:ring-accent/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipologia" className="flex items-center gap-2 text-sm font-medium">
                <Home className="h-4 w-4 text-muted-foreground" />
                Tipo
              </Label>
              <Select value={tipologia} onValueChange={setTipologia}>
                <SelectTrigger className="border-primary/20 focus:ring-accent/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOLOGIAS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center bg-destructive/10 py-2 rounded-lg">{error}</p>
          )}

          <Button 
            type="submit" 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg" 
            size="lg" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Calculando valor...
              </>
            ) : (
              <>
                Descobrir Valor do Imóvel
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center pt-2">
            ⚡ Resultado instantâneo baseado em transações oficiais ITBI dos últimos 12 meses
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
