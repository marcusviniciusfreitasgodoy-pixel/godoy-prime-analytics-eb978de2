import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Mail, Phone, Loader2, Award, Target, Clock, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const leadSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  email: z.string().email("Email inválido").max(255),
  telefone: z.string()
    .min(10, "Telefone deve ter pelo menos 10 dígitos")
    .max(15, "Telefone inválido")
    .regex(/^[\d\s\-\(\)]+$/, "Formato de telefone inválido"),
  objetivo: z.string().min(1, "Selecione seu objetivo"),
  urgencia: z.string().min(1, "Selecione sua urgência"),
  preferencia_contato: z.string().min(1, "Selecione sua preferência de contato"),
  aceita_marketing: z.boolean().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

export interface LeadCaptureFormResult {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  objetivo: string;
  urgencia: string;
  preferencia_contato: string;
}

interface LeadCaptureFormProps {
  bairroInteresse?: string;
  areaInteresse?: number;
  valorInteresse?: number;
  quartos?: number;
  banheiros?: number;
  suites?: number;
  vagas?: number;
  diferenciais?: string;
  origem?: string;
  onSuccess: (leadData: LeadCaptureFormResult) => void;
}

const OBJETIVOS = [
  { value: "comprar", label: "Comprar" },
  { value: "vender", label: "Vender" },
  { value: "investir", label: "Investir" },
  { value: "curiosidade", label: "Apenas Curiosidade" },
  { value: "outro", label: "Outro" },
];

const URGENCIAS = [
  { value: "curto", label: "Curto prazo: menos de 6 meses" },
  { value: "medio", label: "Médio prazo: 6-12 meses" },
  { value: "longo", label: "Longo prazo: mais de 12 meses" },
  { value: "indefinida", label: "Não definida" },
];

const PREFERENCIAS_CONTATO = [
  { value: "telefone", label: "Telefone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
];

export function LeadCaptureForm({
  bairroInteresse,
  areaInteresse,
  valorInteresse,
  quartos,
  banheiros,
  suites,
  vagas,
  diferenciais,
  origem = "avaliacao_publica",
  onSuccess,
}: LeadCaptureFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      objetivo: "",
      urgencia: "",
      preferencia_contato: "whatsapp",
      aceita_marketing: false,
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
      const normalizedEmail = data.email.trim().toLowerCase();
      
      // Check if email exists
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id, evaluation_count")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingLead) {
        // Update existing lead
        const newCount = (existingLead.evaluation_count || 1) + 1;
        
        await supabase
          .from("leads")
          .update({ 
            evaluation_count: newCount,
            updated_at: new Date().toISOString(),
            nome: data.nome.trim(),
            telefone: data.telefone.replace(/\D/g, ""),
            bairro_interesse: bairroInteresse,
            area_interesse: areaInteresse,
            valor_interesse: valorInteresse,
            quartos,
            banheiros,
            suites,
            vagas,
            objetivo: data.objetivo,
            urgencia: data.urgencia,
            preferencia_contato: data.preferencia_contato,
            aceita_marketing: data.aceita_marketing || false,
            diferenciais_imovel: diferenciais,
            interesse: data.objetivo === "vender" ? "venda" : "compra",
          })
          .eq("id", existingLead.id);

        toast.success("Dados atualizados com sucesso!");
        
        onSuccess({
          id: existingLead.id,
          nome: data.nome.trim(),
          email: normalizedEmail,
          telefone: data.telefone.replace(/\D/g, ""),
          objetivo: data.objetivo,
          urgencia: data.urgencia,
          preferencia_contato: data.preferencia_contato,
        });
        return;
      }

      // New lead
      const { data: insertedLead, error } = await supabase.from("leads").insert({
        nome: data.nome.trim(),
        email: normalizedEmail,
        telefone: data.telefone.replace(/\D/g, ""),
        bairro_interesse: bairroInteresse,
        area_interesse: areaInteresse,
        valor_interesse: valorInteresse,
        quartos,
        banheiros,
        suites,
        vagas,
        objetivo: data.objetivo,
        urgencia: data.urgencia,
        preferencia_contato: data.preferencia_contato,
        aceita_marketing: data.aceita_marketing || false,
        diferenciais_imovel: diferenciais,
        interesse: data.objetivo === "vender" ? "venda" : "compra",
        origem,
        evaluation_count: 1,
      }).select('id').single();

      if (error) throw error;

      // Send notification for new lead
      try {
        await supabase.functions.invoke('send-lead-notification', {
          body: {
            type: 'complete',
            leadId: insertedLead.id,
            leadName: data.nome.trim(),
            leadEmail: normalizedEmail,
            leadPhone: data.telefone.replace(/\D/g, ""),
            interesse: data.objetivo === "vender" ? "venda" : "compra",
            objetivo: data.objetivo,
            urgencia: data.urgencia,
            preferencia_contato: data.preferencia_contato,
            bairro: bairroInteresse,
            area: areaInteresse,
            quartos,
            banheiros,
            suites,
            vagas,
            diferenciais,
            estimativaMin: valorInteresse ? valorInteresse * 0.9 : undefined,
            estimativaMed: valorInteresse,
            estimativaMax: valorInteresse ? valorInteresse * 1.1 : undefined,
          }
        });
      } catch (notificationError) {
        console.error('Error sending lead notification:', notificationError);
      }

      toast.success("Solicitação enviada com sucesso! Entraremos em contato em breve.");
      
      onSuccess({
        id: insertedLead.id,
        nome: data.nome.trim(),
        email: normalizedEmail,
        telefone: data.telefone.replace(/\D/g, ""),
        objetivo: data.objetivo,
        urgencia: data.urgencia,
        preferencia_contato: data.preferencia_contato,
      });
    } catch (error) {
      console.error("Erro ao cadastrar lead:", error);
      toast.error("Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-accent/30 bg-gradient-to-b from-card to-card/80 backdrop-blur shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center mb-3 shadow-lg">
          <Award className="h-7 w-7 text-accent" />
        </div>
        <CardTitle className="text-xl font-bold">
          Solicite Sua Avaliação Completa e Personalizada
        </CardTitle>
        <CardDescription className="text-base">
          Gratuita e Sem Compromisso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome */}
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

          {/* Email */}
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

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="telefone" className="flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4 text-accent" />
              WhatsApp *
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

          {/* Objetivo */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-accent" />
              Qual o seu principal objetivo? *
            </Label>
            <Select onValueChange={(value) => setValue("objetivo", value)}>
              <SelectTrigger className={`border-primary/20 focus:ring-accent/30 ${errors.objetivo ? "border-destructive" : ""}`}>
                <SelectValue placeholder="Selecione seu objetivo" />
              </SelectTrigger>
              <SelectContent>
                {OBJETIVOS.map((obj) => (
                  <SelectItem key={obj.value} value={obj.value}>
                    {obj.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.objetivo && (
              <p className="text-sm text-destructive">{errors.objetivo.message}</p>
            )}
          </div>

          {/* Urgência */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-accent" />
              Qual a sua urgência? *
            </Label>
            <Select onValueChange={(value) => setValue("urgencia", value)}>
              <SelectTrigger className={`border-primary/20 focus:ring-accent/30 ${errors.urgencia ? "border-destructive" : ""}`}>
                <SelectValue placeholder="Selecione a urgência" />
              </SelectTrigger>
              <SelectContent>
                {URGENCIAS.map((urg) => (
                  <SelectItem key={urg.value} value={urg.value}>
                    {urg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.urgencia && (
              <p className="text-sm text-destructive">{errors.urgencia.message}</p>
            )}
          </div>

          {/* Preferência de Contato */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <MessageCircle className="h-4 w-4 text-accent" />
              Prefere contato via? *
            </Label>
            <Select 
              defaultValue="whatsapp"
              onValueChange={(value) => setValue("preferencia_contato", value)}
            >
              <SelectTrigger className="border-primary/20 focus:ring-accent/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PREFERENCIAS_CONTATO.map((pref) => (
                  <SelectItem key={pref.value} value={pref.value}>
                    {pref.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Checkbox Marketing */}
          <div className="flex items-start space-x-3 pt-2">
            <Checkbox
              id="aceita_marketing"
              onCheckedChange={(checked) => setValue("aceita_marketing", checked as boolean)}
              className="mt-0.5"
            />
            <Label htmlFor="aceita_marketing" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
              ✅ Desejo receber conteúdos exclusivos e oportunidades de imóveis de alto padrão na Barra da Tijuca.
            </Label>
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
                Enviando...
              </>
            ) : (
              "Solicitar Avaliação Completa com Perito"
            )}
          </Button>

          {/* Política de Privacidade */}
          <div className="bg-muted/30 rounded-lg p-3 mt-4">
            <p className="text-xs text-muted-foreground text-center">
              🔒 Seus dados de contato serão utilizados exclusivamente para agendar e realizar sua Avaliação Completa, sem qualquer custo ou compromisso. Não enviamos spam e não compartilhamos seus dados com terceiros.{" "}
              <Link 
                to="/politica-privacidade" 
                className="text-accent hover:underline"
                target="_blank"
              >
                Política de Privacidade
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
