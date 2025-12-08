import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, Loader2, Lock, Home, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const leadSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  email: z.string().email("Email inválido").max(255),
  telefone: z.string()
    .min(10, "Telefone deve ter pelo menos 10 dígitos")
    .max(15, "Telefone inválido")
    .regex(/^[\d\s\-\(\)]+$/, "Formato de telefone inválido"),
  interesse: z.enum(["compra", "venda"], {
    required_error: "Selecione seu interesse"
  }),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadCaptureFormProps {
  bairroInteresse?: string;
  areaInteresse?: number;
  valorInteresse?: number;
  quartos?: number;
  banheiros?: number;
  suites?: number;
  vagas?: number;
  origem?: string;
  onSuccess: (leadData: LeadFormData) => void;
}

export function LeadCaptureForm({
  bairroInteresse,
  areaInteresse,
  valorInteresse,
  quartos,
  banheiros,
  suites,
  vagas,
  origem = "avaliacao_rapida",
  onSuccess,
}: LeadCaptureFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interesse, setInteresse] = useState<"compra" | "venda">("compra");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      interesse: "compra",
    },
  });

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("leads").insert({
        nome: data.nome.trim(),
        email: data.email.trim().toLowerCase(),
        telefone: data.telefone.replace(/\D/g, ""),
        bairro_interesse: bairroInteresse,
        area_interesse: areaInteresse,
        valor_interesse: valorInteresse,
        quartos,
        banheiros,
        suites,
        vagas,
        interesse: data.interesse,
        origem,
      });

      if (error) throw error;

      toast.success("Cadastro realizado com sucesso!");
      onSuccess(data);
    } catch (error) {
      console.error("Erro ao cadastrar lead:", error);
      toast.error("Erro ao realizar cadastro. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-accent/30 bg-gradient-to-b from-card to-card/80 backdrop-blur shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center mb-3 shadow-lg">
          <Lock className="h-7 w-7 text-accent" />
        </div>
        <CardTitle className="text-xl font-bold">🎉 Sua Avaliação Está Pronta!</CardTitle>
        <CardDescription className="text-base">
          Preencha seus dados para ver o resultado completo e receber oportunidades exclusivas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Seletor de Interesse */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              Qual seu objetivo? *
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setInteresse("compra");
                  setValue("interesse", "compra");
                }}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  interesse === "compra"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-primary/20 hover:border-accent/50 hover:bg-accent/5"
                )}
              >
                <Home className="h-6 w-6" />
                <span className="font-semibold text-sm">Quero Comprar</span>
                <span className="text-xs text-muted-foreground">Busco um imóvel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInteresse("venda");
                  setValue("interesse", "venda");
                }}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  interesse === "venda"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-primary/20 hover:border-accent/50 hover:bg-accent/5"
                )}
              >
                <DollarSign className="h-6 w-6" />
                <span className="font-semibold text-sm">Quero Vender</span>
                <span className="text-xs text-muted-foreground">Tenho um imóvel</span>
              </button>
            </div>
            <input type="hidden" {...register("interesse")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome" className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-accent" />
              Nome Completo *
            </Label>
            <Input
              id="nome"
              placeholder="Seu nome completo"
              {...register("nome")}
              className={`border-primary/20 focus-visible:ring-accent/30 ${errors.nome ? "border-destructive" : ""}`}
            />
            {errors.nome && (
              <p className="text-sm text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-accent" />
              E-mail *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...register("email")}
              className={`border-primary/20 focus-visible:ring-accent/30 ${errors.email ? "border-destructive" : ""}`}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone" className="flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4 text-accent" />
              Telefone / WhatsApp *
            </Label>
            <Input
              id="telefone"
              type="tel"
              placeholder="(21) 99999-9999"
              {...register("telefone", {
                onChange: (e) => {
                  e.target.value = formatPhone(e.target.value);
                },
              })}
              className={`border-primary/20 focus-visible:ring-accent/30 ${errors.telefone ? "border-destructive" : ""}`}
            />
            {errors.telefone && (
              <p className="text-sm text-destructive">{errors.telefone.message}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg" 
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              "Ver Minha Avaliação Gratuita"
            )}
          </Button>

          <div className="bg-muted/30 rounded-lg p-3 mt-4">
            <p className="text-xs text-muted-foreground text-center">
              🔒 Seus dados estão seguros. Ao se cadastrar, você receberá oportunidades de imóveis compatíveis com seu interesse.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
