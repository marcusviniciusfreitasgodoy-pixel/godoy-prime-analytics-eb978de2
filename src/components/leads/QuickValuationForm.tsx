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
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3">
          <Calculator className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">Avaliação Rápida de Imóvel</CardTitle>
        <CardDescription className="text-base">
          Descubra o valor estimado do imóvel que você deseja comprar na Barra da Tijuca e região
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="bairro" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Bairro *
            </Label>
            <Select value={bairro} onValueChange={setBairro}>
              <SelectTrigger>
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
            <Label htmlFor="logradouro" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Rua / Endereço (opcional)
            </Label>
            <Input
              id="logradouro"
              placeholder="Ex: Avenida das Américas"
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area" className="flex items-center gap-2">
                <Maximize2 className="h-4 w-4" />
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipologia" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Tipo
              </Label>
              <Select value={tipologia} onValueChange={setTipologia}>
                <SelectTrigger>
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
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                Avaliar Imóvel
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Avaliação baseada em dados oficiais de transações ITBI dos últimos 12 meses
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
