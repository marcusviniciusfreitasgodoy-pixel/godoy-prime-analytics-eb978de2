import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CompanyLogoUpload } from "@/components/CompanyLogoUpload";
import { Settings, Building2, Phone, MapPin, FileText, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useState, useEffect } from "react";

export default function Configuracoes() {
  const { settings, isLoading, updateSetting } = useCompanySettings();
  
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCreci, setCompanyCreci] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setCompanyName(settings.company_name);
      setCompanyPhone(settings.company_phone);
      setCompanyCnpj(settings.company_cnpj);
      setCompanyAddress(settings.company_address);
      setCompanyCreci(settings.company_creci);
      setCompanyWebsite(settings.company_website);
    }
  }, [isLoading, settings]);

  const handleSaveInfo = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        updateSetting('company_name', companyName),
        updateSetting('company_phone', companyPhone),
        updateSetting('company_cnpj', companyCnpj),
        updateSetting('company_address', companyAddress),
        updateSetting('company_creci', companyCreci),
        updateSetting('company_website', companyWebsite),
      ]);
    } finally {
      setIsSaving(false);
    }
  };

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

          {/* Informações da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações da Empresa
              </CardTitle>
              <CardDescription>
                Configure os dados que aparecem nos PDFs gerados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nome da Empresa</Label>
                <Input
                  id="company_name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nome da empresa"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_cnpj">CNPJ</Label>
                  <Input
                    id="company_cnpj"
                    value={companyCnpj}
                    onChange={(e) => setCompanyCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_creci">CRECI</Label>
                  <Input
                    id="company_creci"
                    value={companyCreci}
                    onChange={(e) => setCompanyCreci(e.target.value)}
                    placeholder="CRECI 00000-PJ"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_phone" className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Telefone
                </Label>
                <Input
                  id="company_phone"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_website" className="flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Website
                </Label>
                <Input
                  id="company_website"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="www.suaempresa.com.br"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_address" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Endereço
                </Label>
                <Input
                  id="company_address"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="Endereço completo"
                  disabled={isLoading}
                />
              </div>

              <Button 
                onClick={handleSaveInfo} 
                disabled={isSaving || isLoading}
                className="w-full"
              >
                {isSaving ? 'Salvando...' : 'Salvar Informações'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
