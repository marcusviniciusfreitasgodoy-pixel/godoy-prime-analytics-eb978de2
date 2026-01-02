import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CompanySettings {
  custom_logo_url: string | null;
  company_name: string;
  company_phone: string;
  company_cnpj: string;
  company_address: string;
  company_creci: string;
  company_website: string;
}

const DEFAULT_SETTINGS: CompanySettings = {
  custom_logo_url: null,
  company_name: 'GODOY PRIME REALTY',
  company_phone: '(21) 96407-5124',
  company_cnpj: '',
  company_address: 'Av. das Américas 10101 Bloco 2, Sala 316, Barra da Tijuca, RJ',
  company_creci: 'CRECI 11841-PJ',
  company_website: 'www.godoyprime.com.br',
};

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const newSettings = { ...DEFAULT_SETTINGS };
      data?.forEach((row) => {
        const key = row.setting_key as keyof CompanySettings;
        if (key in newSettings && row.setting_value !== null) {
          (newSettings as any)[key] = row.setting_value;
        }
      });

      setSettings(newSettings);
    } catch (error) {
      console.error('Error fetching company settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      const logoUrl = urlData.publicUrl;

      // Save URL to settings
      const { error: settingsError } = await supabase
        .from('company_settings')
        .upsert({
          setting_key: 'custom_logo_url',
          setting_value: logoUrl,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' });

      if (settingsError) throw settingsError;

      setSettings((prev) => ({ ...prev, custom_logo_url: logoUrl }));

      toast({
        title: 'Logo atualizado',
        description: 'A logo foi salva com sucesso.',
      });

      return logoUrl;
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Erro ao fazer upload',
        description: error.message || 'Não foi possível enviar a logo.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const removeLogo = async () => {
    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert({
          setting_key: 'custom_logo_url',
          setting_value: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' });

      if (error) throw error;

      setSettings((prev) => ({ ...prev, custom_logo_url: null }));

      toast({
        title: 'Logo removida',
        description: 'A logo personalizada foi removida.',
      });
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível remover a logo.',
        variant: 'destructive',
      });
    }
  };

  const updateSetting = async (key: keyof CompanySettings, value: string) => {
    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert({
          setting_key: key,
          setting_value: value,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' });

      if (error) throw error;

      setSettings((prev) => ({ ...prev, [key]: value }));

      toast({
        title: 'Configuração salva',
        description: 'A configuração foi atualizada com sucesso.',
      });
    } catch (error: any) {
      console.error('Error updating setting:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar a configuração.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    isLoading,
    uploadLogo,
    removeLogo,
    updateSetting,
    refetch: fetchSettings,
  };
}

// Helper function to get logo as base64 for PDF embedding
export async function getLogoBase64ForPDF(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null;

  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting logo to base64:', error);
    return null;
  }
}
