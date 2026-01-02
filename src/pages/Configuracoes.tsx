import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CompanyLogoUpload } from "@/components/CompanyLogoUpload";
import { Settings, Building2, Phone, MapPin, FileText, Globe, Eye } from "lucide-react";
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

  // Get initials for the monogram
  const getMonogram = () => {
    const words = companyName.trim().split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return companyName.slice(0, 2).toUpperCase() || 'GR';
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

        {/* Preview do Rodapé */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview do Rodapé do PDF
            </CardTitle>
            <CardDescription>
              Visualize como o rodapé aparecerá nos PDFs gerados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border shadow-sm">
              {/* Footer Preview - mimics the PDF footer style */}
              <div 
                className="flex items-center justify-between px-4 py-3"
                style={{ backgroundColor: '#0c2340' }}
              >
                {/* Left side */}
                <div className="text-left">
                  <p className="text-[10px] text-white">Tel: {companyPhone || '(00) 00000-0000'}</p>
                  <p className="text-[9px] text-white/90">{companyAddress || 'Endereço não configurado'}</p>
                </div>

                {/* Center - Monogram + CNPJ */}
                <div className="text-center">
                  <p 
                    className="text-sm font-bold"
                    style={{ color: '#d4af37' }}
                  >
                    {getMonogram()}
                  </p>
                  {companyCnpj && (
                    <p className="text-[8px] text-white/80">CNPJ: {companyCnpj}</p>
                  )}
                </div>

                {/* Right side */}
                <div className="text-right">
                  <p className="text-[10px] text-white">{companyCreci || 'CRECI não configurado'}</p>
                  <p className="text-[9px] text-white/90">
                    {companyWebsite ? `${companyWebsite} | Pág. 1/1` : 'Página 1 de 1'}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Este é um preview aproximado. O PDF final pode ter pequenas diferenças de formatação.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
