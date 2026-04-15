import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CompanyLogoUpload } from "@/components/CompanyLogoUpload";
import { Settings, Building2, Phone, MapPin, FileText, Globe, Filter, Database, Trash2, User, Briefcase, Loader2, Eye, MessageCircle, Bell, Mail, BadgeCheck } from "lucide-react";
import { useCorretorProfile } from "@/hooks/useCorretorProfile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SimpleRadioGroup, SimpleRadioItem } from "@/components/ui/simple-radio";
import { useCompanySettings, type OutlierFilterMethod, type PersonType } from "@/hooks/useCompanySettings";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useState, useEffect } from "react";
import { clearAllHistoricalCache, getCacheStats } from "@/utils/historicalAnalysisCache";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Configuracoes() {
  const { settings, isLoading, updateSetting } = useCompanySettings();
  const { settings: notifSettings, isLoading: notifLoading, updateSettings: updateNotifSettings } = useNotificationSettings();
  
  const { profile: corretorProfile, isLoading: corretorLoading, updateProfile } = useCorretorProfile();

  const [corretorName, setCorretorName] = useState('');
  const [corretorPhone, setCorretorPhone] = useState('');
  const [corretorEmail, setCorretorEmail] = useState('');
  const [corretorCreci, setCorretorCreci] = useState('');
  const [isSavingCorretor, setIsSavingCorretor] = useState(false);
  
  const [personType, setPersonType] = useState<PersonType>('pj');
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCreci, setCompanyCreci] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [outlierMethod, setOutlierMethod] = useState<OutlierFilterMethod>('iqr');
  const [isSaving, setIsSaving] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ count: number; oldestDate: Date | null; newestDate: Date | null }>({ count: 0, oldestDate: null, newestDate: null });

  // Atualizar estatísticas do cache
  useEffect(() => {
    setCacheStats(getCacheStats());
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setPersonType(settings.person_type);
      setCompanyName(settings.company_name);
      setCompanyPhone(settings.company_phone);
      setCompanyCnpj(settings.company_cnpj);
      setCompanyAddress(settings.company_address);
      setCompanyCreci(settings.company_creci);
      setCompanyWebsite(settings.company_website);
      setOutlierMethod(settings.outlier_filter_method);
    }
  }, [isLoading, settings]);

  useEffect(() => {
    if (!corretorLoading && corretorProfile) {
      setCorretorName(corretorProfile.full_name || '');
      setCorretorPhone(corretorProfile.phone || '');
      setCorretorEmail(corretorProfile.email || '');
      setCorretorCreci(corretorProfile.creci || '');
    }
  }, [corretorLoading, corretorProfile]);

  const handleSaveInfo = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        updateSetting('person_type', personType),
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

  const handleSaveCorretorProfile = async () => {
    setIsSavingCorretor(true);
    try {
      await updateProfile.mutateAsync({
        full_name: corretorName,
        phone: corretorPhone || null,
        email: corretorEmail || null,
        creci: corretorCreci || null,
      });
    } finally {
      setIsSavingCorretor(false);
    }
  };

  const isPessoaFisica = personType === 'pf';

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

          {/* Informações da Empresa/Corretor */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                {isPessoaFisica ? 'Informações do Corretor' : 'Informações da Empresa'}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Configure os dados que aparecem nos PDFs
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
              {/* Tipo de Pessoa */}
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Tipo de Cadastro</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={personType === 'pj' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPersonType('pj')}
                    className="flex-1 gap-2"
                    disabled={isLoading}
                  >
                    <Briefcase className="h-4 w-4" />
                    Pessoa Jurídica
                  </Button>
                  <Button
                    type="button"
                    variant={personType === 'pf' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPersonType('pf')}
                    className="flex-1 gap-2"
                    disabled={isLoading}
                  >
                    <User className="h-4 w-4" />
                    Pessoa Física
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="company_name" className="text-xs sm:text-sm">
                  {isPessoaFisica ? 'Nome Completo' : 'Nome da Empresa'}
                </Label>
                <Input
                  id="company_name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={isPessoaFisica ? 'Seu nome completo' : 'Nome da empresa'}
                  disabled={isLoading}
                  className="h-9 sm:h-10 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="company_cnpj" className="text-xs sm:text-sm">
                    {isPessoaFisica ? 'CPF' : 'CNPJ'}
                  </Label>
                  <Input
                    id="company_cnpj"
                    value={companyCnpj}
                    onChange={(e) => setCompanyCnpj(e.target.value)}
                    placeholder={isPessoaFisica ? '000.000.000-00' : '00.000.000/0000-00'}
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
                    placeholder={isPessoaFisica ? 'CRECI 00000' : 'CRECI 00000-PJ'}
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

        {/* Meu Perfil de Corretor */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BadgeCheck className="h-4 w-4 sm:h-5 sm:w-5" />
              Meu Perfil de Corretor
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Dados pessoais usados para notificações e identificação nas fichas de visita
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            {corretorLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="corretor_name" className="text-xs sm:text-sm">
                      <User className="h-3 w-3 inline mr-1" /> Nome Completo
                    </Label>
                    <Input
                      id="corretor_name"
                      value={corretorName}
                      onChange={(e) => setCorretorName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="corretor_email" className="text-xs sm:text-sm">
                      <Mail className="h-3 w-3 inline mr-1" /> Email
                    </Label>
                    <Input
                      id="corretor_email"
                      type="email"
                      value={corretorEmail}
                      onChange={(e) => setCorretorEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="corretor_phone" className="text-xs sm:text-sm">
                      <Phone className="h-3 w-3 inline mr-1" /> Telefone
                    </Label>
                    <Input
                      id="corretor_phone"
                      value={corretorPhone}
                      onChange={(e) => setCorretorPhone(e.target.value)}
                      placeholder="(21) 99999-9999"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="corretor_creci" className="text-xs sm:text-sm">
                      <BadgeCheck className="h-3 w-3 inline mr-1" /> CRECI
                    </Label>
                    <Input
                      id="corretor_creci"
                      value={corretorCreci}
                      onChange={(e) => setCorretorCreci(e.target.value)}
                      placeholder="CRECI 00000"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSaveCorretorProfile} 
                  disabled={isSavingCorretor}
                  className="w-full h-9 sm:h-10 text-sm"
                >
                  {isSavingCorretor ? 'Salvando...' : 'Salvar Perfil'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notificações WhatsApp */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              Notificações WhatsApp
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Configure quais notificações automáticas serão enviadas via WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
            {notifLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Confirmação */}
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Bell className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Confirmação</p>
                        <p className="text-xs text-muted-foreground">Novo agendamento criado</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifSettings.whatsapp_confirmacao}
                      onCheckedChange={(checked) => updateNotifSettings({ whatsapp_confirmacao: checked })}
                    />
                  </div>

                  {/* Lembrete */}
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Bell className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Lembrete</p>
                        <p className="text-xs text-muted-foreground">Antes da visita agendada</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifSettings.whatsapp_lembrete}
                      onCheckedChange={(checked) => updateNotifSettings({ whatsapp_lembrete: checked })}
                    />
                  </div>

                  {/* Reagendamento */}
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <Bell className="h-4 w-4 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Reagendamento</p>
                        <p className="text-xs text-muted-foreground">Data/hora alterada</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifSettings.whatsapp_reagendamento}
                      onCheckedChange={(checked) => updateNotifSettings({ whatsapp_reagendamento: checked })}
                    />
                  </div>

                  {/* Cancelamento */}
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Bell className="h-4 w-4 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Cancelamento</p>
                        <p className="text-xs text-muted-foreground">Visita cancelada</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifSettings.whatsapp_cancelamento}
                      onCheckedChange={(checked) => updateNotifSettings({ whatsapp_cancelamento: checked })}
                    />
                  </div>
                </div>

                {/* Antecedência do Lembrete */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">Antecedência do Lembrete</p>
                    <p className="text-xs text-muted-foreground">
                      Quantas horas antes da visita o lembrete será enviado
                    </p>
                  </div>
                  <Select
                    value={String(notifSettings.lembrete_horas_antes)}
                    onValueChange={(value) => updateNotifSettings({ lembrete_horas_antes: Number(value) })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 horas</SelectItem>
                      <SelectItem value="24">24 horas</SelectItem>
                      <SelectItem value="48">48 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-xs text-muted-foreground">
                  💡 As mensagens são enviadas automaticamente via Evolution API. Certifique-se de que a instância está conectada.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Configurações de Avaliação */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              Filtro de Outliers (Transações)
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Configure como a plataforma trata valores extremos nas avaliações
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
            {/* Explicação didática */}
            <div className="p-3 rounded-lg bg-muted/50 border border-muted">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">O que são outliers?</strong> São transações com valores muito diferentes do normal — por exemplo, 
                um imóvel vendido muito abaixo do mercado (venda entre familiares, dívida) ou muito acima (imóvel único, reforma especial).
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2">
                <strong className="text-foreground">Por que filtrar?</strong> Esses valores extremos podem distorcer a média de preços e prejudicar 
                a precisão da sua avaliação. O filtro remove automaticamente essas anomalias para dar resultados mais confiáveis.
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2">
                <strong className="text-foreground">Qual escolher?</strong> Na dúvida, mantenha o <span className="font-medium text-primary">IQR</span> — 
                ele é mais preciso e usado por estatísticos profissionais. O método <span className="font-medium">Percentis</span> é uma opção 
                mais simples se você preferir um corte fixo.
              </p>
            </div>

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
                  <Label htmlFor="iqr" className="cursor-pointer text-sm font-medium flex items-center gap-2">
                    IQR (Intervalo Interquartil)
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-normal">Recomendado</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Melhor para:</strong> Bases de dados com muitas transações ou muitos valores extremos.
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Remove automaticamente valores muito fora do padrão, mantendo apenas as transações mais representativas do mercado.
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
                    <strong>Melhor para:</strong> Bases de dados menores ou quando você quer um corte mais previsível.
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Descarta os 10% mais baratos e os 10% mais caros, mantendo sempre os 80% centrais das transações.
                  </p>
                </div>
              </div>
            </SimpleRadioGroup>
          </CardContent>
        </Card>

        {/* Cache de Análise Histórica */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Database className="h-4 w-4 sm:h-5 sm:w-5" />
              Cache de Análise Histórica
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Gerenciar cache local de dados históricos para melhor performance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
              <div>
                <p className="text-sm font-medium">Entradas em Cache</p>
                <p className="text-2xl font-bold text-primary">{cacheStats.count}</p>
                {cacheStats.newestDate && (
                  <p className="text-xs text-muted-foreground">
                    Atualizado: {cacheStats.newestDate.toLocaleDateString('pt-BR')} às {cacheStats.newestDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearAllHistoricalCache();
                  setCacheStats({ count: 0, oldestDate: null, newestDate: null });
                  toast.success("Cache limpo com sucesso!");
                }}
                disabled={cacheStats.count === 0}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Limpar Cache
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O cache armazena análises históricas por 24 horas. Limpar o cache força a reconsulta dos dados na próxima avaliação.
            </p>
          </CardContent>
        </Card>

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
                    <p className="text-[6px] sm:text-[8px] text-white/80">
                      {isPessoaFisica ? 'CPF' : 'CNPJ'}: {companyCnpj}
                    </p>
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
