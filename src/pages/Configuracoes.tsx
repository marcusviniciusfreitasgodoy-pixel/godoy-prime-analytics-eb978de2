import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CompanyLogoUpload } from "@/components/CompanyLogoUpload";
import { Settings, Building2 } from "lucide-react";

export default function Configuracoes() {
  return (
    <>
      <Helmet>
        <title>Configurações | Godoy Prime Analytics</title>
      </Helmet>

      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-sm text-muted-foreground">
              Personalize a plataforma para sua empresa
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Logo da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Logo da Empresa
              </CardTitle>
              <CardDescription>
                Faça upload da logo que será exibida nos PDFs gerados pela plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompanyLogoUpload />
            </CardContent>
          </Card>

          {/* Informações da Empresa - Futuro */}
          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Informações da Empresa
              </CardTitle>
              <CardDescription>
                Configure nome, endereço e contato da empresa (em breve)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Esta funcionalidade estará disponível em breve.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
