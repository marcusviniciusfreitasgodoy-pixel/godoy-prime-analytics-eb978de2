import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CompanySettings {
  custom_logo_url: string | null;
  company_name: string;
  company_phone: string;
}

const DEFAULT_SETTINGS: CompanySettings = {
  custom_logo_url: null,
  company_name: 'GODOY PRIME REALTY',
  company_phone: '(21) 96407-5124',
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
        if (row.setting_key === 'custom_logo_url' && row.setting_value) {
          newSettings.custom_logo_url = row.setting_value;
        }
        if (row.setting_key === 'company_name' && row.setting_value) {
          newSettings.company_name = row.setting_value;
        }
        if (row.setting_key === 'company_phone' && row.setting_value) {
          newSettings.company_phone = row.setting_value;
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

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    isLoading,
    uploadLogo,
    removeLogo,
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
