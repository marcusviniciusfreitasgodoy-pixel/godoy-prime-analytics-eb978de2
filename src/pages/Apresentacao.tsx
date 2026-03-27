import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3, Building2, ClipboardCheck, Calendar, Target, FileText,
  TrendingUp, Brain, Shield, ArrowRight, MessageCircle, Eye, Send, Loader2, CheckCircle, FileDown, Map,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import godoySymbol from "@/assets/godoy-logo-symbol.png";
import godoyLogo from "@/assets/godoy-logo-pdf.png";
import { exportProductOnePagerPDF } from "@/utils/productOnePagerPdfExport";
import FunctionalityMapSection from "@/components/apresentacao/FunctionalityMapSection";
import OnePagerPreview from "@/components/apresentacao/OnePagerPreview";


const features = [
  { icon: BarChart3, title: "Painel Analítico", desc: "Indicadores de mercado em tempo real com evolução de preços por m² e liquidez por tipologia." },
  { icon: TrendingUp, title: "Avaliação Imobiliária", desc: "Precificação inteligente com dados ITBI e IPTU — 3 cenários de valor, campo de observações editável e laudo completo em PDF." },
  { icon: ClipboardCheck, title: "Vistoria Digital", desc: "Checklist completo com score automático, itens críticos e ajuste de valor por estado de conservação." },
  { icon: Calendar, title: "Gestão de Visitas", desc: "Fichas digitais, assinatura eletrônica, feedback analítico com dashboard de métricas e ranking de corretores." },
  { icon: Target, title: "Microrregiões", desc: "Classificação e evolução de preços por microbairro com mapa interativo de transações." },
  { icon: Map, title: "Inteligência Territorial", desc: "Mapa interativo com 1.567 condomínios, ficha completa com torres, unidades, histórico ITBI e dados IPTU." },
  { icon: Building2, title: "Gestão de Leads e CRM", desc: "Pipeline Kanban 8 estágios, captação automática, notificações email/WhatsApp e acompanhamento de conversão." },
  { icon: Shield, title: "Avaliação Pública", desc: "Página de captação de compradores com avaliação gratuita, proteção patrimonial e geração automática de leads." },
  { icon: Brain, title: "Calibradores e Personalização", desc: "Ajuste de pesos de avaliação e vistoria, formulários personalizáveis e branding white-label com logo próprio." },
];

const differentials = [
  { icon: Shield, title: "Dados Oficiais", desc: "Base de transações imobiliárias reais, garantindo precisão nas análises de mercado." },
  { icon: Brain, title: "IA para Precificação", desc: "Algoritmo proprietário com ajustes por 30+ características do imóvel e tendências de mercado." },
  { icon: Map, title: "Mapeamento Geoespacial", desc: "1.567 condomínios, 52.761 edificações e 485 logradouros IPTU mapeados com cruzamento de dados reais de cartório." },
  { icon: FileText, title: "Relatórios em PDF", desc: "Laudos profissionais prontos para apresentação ao cliente, incluindo feedback analítico de visitas e branding personalizado." },
];

const contactSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  telefone: z.string().trim().min(10, "Telefone deve ter pelo menos 10 dígitos").max(20),
  interesse: z.enum(["imobiliaria", "corretor_autonomo"], { required_error: "Selecione um interesse" }),
  mensagem: z.string().trim().max(500).optional(),
});

type ContactForm = z.infer<typeof contactSchema>;

const WHATSAPP_URL = "https://wa.me/5521964075124?text=Olá! Gostaria de agendar uma apresentação da plataforma Godoy Prime Analytics.";

export default function Apresentacao() {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [form, setForm] = useState<Partial<ContactForm>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(result.error.flatten().fieldErrors)) {
        if (msgs && msgs.length > 0) fieldErrors[key] = msgs[0];
      }
      setErrors(fieldErrors);
      return;
    }

    setFormState("sending");
    try {
      const { error } = await supabase.functions.invoke("send-lead-notification", {
        body: {
          type: "initial",
          leadName: result.data.nome,
          leadEmail: result.data.email,
          leadPhone: result.data.telefone,
          interesse: result.data.interesse,
          objetivo: result.data.mensagem || "Contato via página de apresentação",
        },
      });

      if (error) throw error;
      setFormState("success");
      toast.success("Mensagem enviada! Em breve entraremos em contato.");
    } catch {
      setFormState("error");
      toast.error("Erro ao enviar. Tente novamente ou entre em contato via WhatsApp.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-24 text-center">
          <img src={godoySymbol} alt="Godoy Prime" className="h-14 sm:h-20 mx-auto mb-4 sm:mb-8" />
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tight mb-4">
            Plataforma de Inteligência Imobiliária
          </h1>
          <p className="text-base sm:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Transforme dados de mercado em decisões estratégicas. Avaliação, vistoria, 
            mapeamento geoespacial completo e análises — tudo em uma única plataforma.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 text-base font-bold min-h-[48px] bg-[hsl(43,60%,53%)] text-[hsl(212,62%,15%)] hover:bg-[hsl(43,60%,45%)]"
              onClick={() => navigate("/demo")}
            >
              <Eye className="h-5 w-5" />
              Explorar Demonstração
            </Button>
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 text-base font-bold min-h-[48px] bg-white text-[hsl(212,62%,15%)] hover:bg-white/90"
              onClick={() => window.open(WHATSAPP_URL, "_blank")}
            >
              <MessageCircle className="h-5 w-5" />
              Agendar Apresentação
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto gap-2 text-base font-bold min-h-[48px] bg-blue-600 text-white hover:bg-blue-700 border-none"
              onClick={() => setShowPreview((p) => !p)}
            >
              <FileDown className="h-5 w-5" />
              {showPreview ? "Fechar Resumo Executivo" : "Ver Resumo Executivo"}
            </Button>
          </div>
        </div>

        {showPreview && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-10">
            <OnePagerPreview />
          </div>
        )}
      </section>

      {/* Features */}
      <section className="py-8 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <Badge variant="secondary" className="mb-3">Módulos</Badge>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">Tudo que você precisa para vender mais</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto text-sm sm:text-base">
              Seja imobiliária ou corretor autônomo, cada módulo foi projetado para otimizar seu dia a dia e gerar resultados mensuráveis.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((f) => (
              <Card key={f.title} className="group hover:shadow-lg transition-shadow border-border/50">
                <CardContent className="pt-6">
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-semibold text-base sm:text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Funcionalidades x Dores */}
      <FunctionalityMapSection />


      {/* Differentials */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <Badge variant="secondary" className="mb-3">Diferenciais</Badge>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">Por que escolher a Godoy Prime?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {differentials.map((d) => (
              <div key={d.title} className="text-center">
                <div className="h-14 w-14 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-4">
                  <d.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg mb-2">{d.title}</h3>
                <p className="text-sm text-muted-foreground">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <Badge variant="secondary" className="mb-3">Contato</Badge>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">Agende uma Apresentação</h2>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Preencha o formulário e entraremos em contato para agendar uma demonstração personalizada.
            </p>
          </div>

          {formState === "success" ? (
            <Card className="border-accent/30">
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-accent mx-auto" />
                <h3 className="text-lg font-semibold">Mensagem Enviada!</h3>
                <p className="text-muted-foreground text-sm">
                  Você receberá uma confirmação por email. Entraremos em contato em breve.
                </p>
                <Button
                  variant="outline"
                  onClick={() => { setFormState("idle"); setForm({}); }}
                  className="mt-4"
                >
                  Enviar nova mensagem
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        placeholder="Seu nome completo"
                        value={form.nome || ""}
                        onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))}
                      />
                      {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={form.email || ""}
                        onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                      />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone *</Label>
                      <Input
                        id="telefone"
                        placeholder="(21) 99999-9999"
                        value={form.telefone || ""}
                        onChange={(e) => setForm(p => ({ ...p, telefone: e.target.value }))}
                      />
                      {errors.telefone && <p className="text-xs text-destructive">{errors.telefone}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interesse">Interesse *</Label>
                      <Select
                        value={form.interesse}
                        onValueChange={(v) => setForm(p => ({ ...p, interesse: v as ContactForm["interesse"] }))}
                      >
                        <SelectTrigger id="interesse">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="imobiliaria">Imobiliária</SelectItem>
                          <SelectItem value="corretor_autonomo">Corretor Autônomo</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.interesse && <p className="text-xs text-destructive">{errors.interesse}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mensagem">Mensagem (opcional)</Label>
                    <Textarea
                      id="mensagem"
                      placeholder="Conte-nos mais sobre o que procura..."
                      rows={3}
                      value={form.mensagem || ""}
                      onChange={(e) => setForm(p => ({ ...p, mensagem: e.target.value }))}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={formState === "sending"}
                    className="w-full min-h-[48px] gap-2 text-base font-bold bg-[hsl(43,60%,53%)] text-[hsl(212,62%,15%)] hover:bg-[hsl(43,60%,45%)]"
                  >
                    {formState === "sending" ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> Enviando...</>
                    ) : (
                      <><Send className="h-5 w-5" /> Enviar Mensagem</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4">
            Pronto para elevar o padrão da sua operação?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-sm sm:text-base">
            Imobiliárias e corretores autônomos já usam a plataforma para tomar decisões mais inteligentes. Explore a demonstração ou agende uma apresentação.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 min-h-[48px] font-bold bg-[hsl(43,60%,53%)] text-[hsl(212,62%,15%)] hover:bg-[hsl(43,60%,45%)]"
              onClick={() => navigate("/demo")}
            >
              Explorar Demonstração
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 min-h-[48px] font-bold bg-white text-[hsl(212,62%,15%)] hover:bg-white/90 border border-border"
              onClick={() => window.open(WHATSAPP_URL, "_blank")}
            >
              <MessageCircle className="h-4 w-4" />
              Falar com Consultor
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center space-y-3">
          <img src={godoyLogo} alt="Godoy Prime" className="h-8 mx-auto opacity-60" />
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
            Aviso: Esta ferramenta fornece análises estatísticas baseadas em dados públicos de transações imobiliárias. 
            As informações não substituem laudos oficiais e devem ser utilizadas apenas como referência de mercado.
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Godoy Prime Analytics. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
