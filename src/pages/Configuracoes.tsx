import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CompanyLogoUpload } from "@/components/CompanyLogoUpload";
import { Settings, Building2, Phone, MapPin, FileText, Globe, Eye, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SimpleRadioGroup, SimpleRadioItem } from "@/components/ui/simple-radio";
import { useCompanySettings, type OutlierFilterMethod } from "@/hooks/useCompanySettings";
import { useState, useEffect } from "react";

export default function Configuracoes() {
  const { settings, isLoading, updateSetting } = useCompanySettings();
  
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCreci, setCompanyCreci] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [outlierMethod, setOutlierMethod] = useState<OutlierFilterMethod>('iqr');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setCompanyName(settings.company_name);
      setCompanyPhone(settings.company_phone);
      setCompanyCnpj(settings.company_cnpj);
      setCompanyAddress(settings.company_address);
      setCompanyCreci(settings.company_creci);
      setCompanyWebsite(settings.company_website);
      setOutlierMethod(settings.outlier_filter_method);
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

      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Configurações</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Personalize a plataforma para sua empresa
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Logo da Empresa */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                Logo da Empresa
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Faça upload da logo que será exibida nos PDFs
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <CompanyLogoUpload />
            </CardContent>
          </Card>

          {/* Informações da Empresa */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                Informações da Empresa
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Configure os dados que aparecem nos PDFs
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="company_name" className="text-xs sm:text-sm">Nome da Empresa</Label>
                <Input
                  id="company_name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nome da empresa"
                  disabled={isLoading}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="company_cnpj" className="text-xs sm:text-sm">CNPJ</Label>
                  <Input
                    id="company_cnpj"
                    value={companyCnpj}
                    onChange={(e) => setCompanyCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    disabled={isLoading}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="company_creci" className="text-xs sm:text-sm">CRECI</Label>
                  <Input
                    id="company_creci"
                    value={companyCreci}
                    onChange={(e) => setCompanyCreci(e.target.value)}
                    placeholder="CRECI 00000-PJ"
                    disabled={isLoading}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="company_phone" className="flex items-center gap-1 text-xs sm:text-sm">
                    <Phone className="h-3 w-3" /> Telefone
                  </Label>
                  <Input
                    id="company_phone"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    disabled={isLoading}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="company_website" className="flex items-center gap-1 text-xs sm:text-sm">
                    <Globe className="h-3 w-3" /> Website
                  </Label>
                  <Input
                    id="company_website"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="www.suaempresa.com.br"
                    disabled={isLoading}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="company_address" className="flex items-center gap-1 text-xs sm:text-sm">
                  <MapPin className="h-3 w-3" /> Endereço
                </Label>
                <Input
                  id="company_address"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="Endereço completo"
                  disabled={isLoading}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>

              <Button 
                onClick={handleSaveInfo} 
                disabled={isSaving || isLoading}
                className="w-full h-9 sm:h-10 text-sm"
              >
                {isSaving ? 'Salvando...' : 'Salvar Informações'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Configurações de Avaliação */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              Filtro de Outliers (ITBI)
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Escolha o método para eliminar valores atípicos nos dados de transações
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
            <SimpleRadioGroup
              value={outlierMethod}
              onValueChange={(value) => {
                setOutlierMethod(value as OutlierFilterMethod);
                updateSetting('outlier_filter_method', value);
              }}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <SimpleRadioItem value="iqr" id="iqr" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="iqr" className="cursor-pointer text-sm font-medium">
                    IQR (Intervalo Interquartil)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Remove valores fora do intervalo Q1 - 1.5×IQR até Q3 + 1.5×IQR. 
                    Método estatístico mais robusto, recomendado para dados com muitos outliers.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <SimpleRadioItem value="percentile" id="percentile" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="percentile" className="cursor-pointer text-sm font-medium">
                    Percentis P10/P90
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usa o percentil 10 como mínimo e percentil 90 como máximo. 
                    Método mais simples, mantém 80% dos dados centrais.
                  </p>
                </div>
              </div>
            </SimpleRadioGroup>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
              Preview do Rodapé do PDF
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Visualize como o rodapé aparecerá nos PDFs
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="rounded-lg overflow-hidden border shadow-sm overflow-x-auto">
              {/* Footer Preview - mimics the PDF footer style */}
              <div 
                className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 min-w-[320px]"
                style={{ backgroundColor: '#0c2340' }}
              >
                {/* Left side */}
                <div className="text-left flex-1">
                  <p className="text-[8px] sm:text-[10px] text-white truncate">Tel: {companyPhone || '(00) 00000-0000'}</p>
                  <p className="text-[7px] sm:text-[9px] text-white/90 truncate">{companyAddress || 'Endereço não configurado'}</p>
                </div>

                {/* Center - Logo ou Monogram + CNPJ */}
                <div className="text-center flex-shrink-0 px-2">
                  {settings.custom_logo_url ? (
                    <img 
                      src={settings.custom_logo_url} 
                      alt="Logo" 
                      className="h-5 sm:h-6 mx-auto object-contain"
                    />
                  ) : (
                    <p 
                      className="text-xs sm:text-sm font-bold"
                      style={{ color: '#d4af37' }}
                    >
                      {getMonogram()}
                    </p>
                  )}
                  {companyCnpj && (
                    <p className="text-[6px] sm:text-[8px] text-white/80">CNPJ: {companyCnpj}</p>
                  )}
                </div>

                {/* Right side */}
                <div className="text-right flex-1">
                  <p className="text-[8px] sm:text-[10px] text-white truncate">{companyCreci || 'CRECI não configurado'}</p>
                  <p className="text-[7px] sm:text-[9px] text-white/90 truncate">
                    {companyWebsite ? `${companyWebsite} | Pág. 1/1` : 'Página 1 de 1'}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 text-center">
              Este é um preview aproximado. O PDF final pode ter pequenas diferenças.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
