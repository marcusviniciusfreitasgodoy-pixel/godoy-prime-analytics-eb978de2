import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PoliticaPrivacidade() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6">
        <div className="container mx-auto px-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="text-primary-foreground hover:bg-primary-foreground/10 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Política de Privacidade</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Godoy Prime Realty - Política de Privacidade
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                1. Coleta de Dados
              </h2>
              <p className="text-muted-foreground">
                Coletamos informações pessoais fornecidas voluntariamente por você ao utilizar 
                nossa ferramenta de avaliação imobiliária, incluindo:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Nome completo</li>
                <li>Endereço de e-mail</li>
                <li>Número de telefone/WhatsApp</li>
                <li>Dados do imóvel de interesse (endereço, área, características)</li>
                <li>Preferências de contato e objetivos imobiliários</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                2. Uso das Informações
              </h2>
              <p className="text-muted-foreground">
                Utilizamos seus dados exclusivamente para:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Realizar e fornecer estimativas de valor imobiliário</li>
                <li>Entrar em contato para agendar avaliações presenciais solicitadas</li>
                <li>Enviar conteúdos e oportunidades relevantes (apenas se autorizado)</li>
                <li>Melhorar nossos serviços e experiência do usuário</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                3. Compartilhamento de Dados
              </h2>
              <p className="text-muted-foreground">
                <strong>Não compartilhamos, vendemos ou alugamos</strong> suas informações pessoais 
                com terceiros, exceto quando necessário para:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Cumprir obrigações legais</li>
                <li>Proteger nossos direitos legais</li>
                <li>Prevenir fraudes ou atividades ilegais</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                4. Segurança dos Dados
              </h2>
              <p className="text-muted-foreground">
                Implementamos medidas técnicas e organizacionais para proteger seus dados pessoais 
                contra acesso não autorizado, alteração, divulgação ou destruição. Utilizamos 
                criptografia e servidores seguros para armazenar suas informações.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                5. Seus Direitos
              </h2>
              <p className="text-muted-foreground">
                De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Acessar seus dados pessoais que possuímos</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                <li>Solicitar a exclusão dos seus dados</li>
                <li>Revogar o consentimento para uso dos dados</li>
                <li>Obter informações sobre o compartilhamento de dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                6. Retenção de Dados
              </h2>
              <p className="text-muted-foreground">
                Mantemos seus dados pessoais pelo tempo necessário para cumprir as finalidades 
                descritas nesta política, ou conforme exigido por lei. Dados de leads são 
                mantidos por até 2 anos após o último contato.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                7. Contato
              </h2>
              <p className="text-muted-foreground">
                Para exercer seus direitos ou esclarecer dúvidas sobre esta política, 
                entre em contato conosco:
              </p>
              <div className="mt-3 p-4 bg-muted/50 rounded-lg">
                <p className="font-medium text-foreground">Godoy Prime Realty</p>
                <p className="text-sm text-muted-foreground">
                  Av. das Américas, 10101 Bloco 2 Sala 316<br />
                  Barra da Tijuca, Rio de Janeiro - RJ<br />
                  Tel: (21) 4040-0067 | (21) 99725-0515<br />
                  E-mail: contato@godoyprime.com.br
                </p>
              </div>
            </section>

            <section className="border-t border-border pt-6">
              <p className="text-xs text-muted-foreground text-center">
                Esta Política de Privacidade pode ser atualizada periodicamente. 
                Recomendamos que você revise esta página regularmente para se manter 
                informado sobre nossas práticas de privacidade.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} GODOY PRIME REALTY. Todos os direitos reservados. CRECI 11841 - PJ.
          </p>
        </div>
      </footer>
    </div>
  );
}
