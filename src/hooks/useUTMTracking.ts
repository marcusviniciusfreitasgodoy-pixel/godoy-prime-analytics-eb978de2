import { useEffect, useState } from 'react';

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  utm_id?: string;
  gclid?: string; // Google Ads
  fbclid?: string; // Facebook/Meta
}

const UTM_STORAGE_KEY = 'godoy_prime_utm_params';

export function useUTMTracking() {
  const [utmParams, setUtmParams] = useState<UTMParams>({});

  useEffect(() => {
    // Captura parâmetros UTM da URL
    const urlParams = new URLSearchParams(window.location.search);
    
    const params: UTMParams = {};
    const utmKeys: (keyof UTMParams)[] = [
      'utm_source', 'utm_medium', 'utm_campaign', 
      'utm_term', 'utm_content', 'utm_id',
      'gclid', 'fbclid'
    ];

    utmKeys.forEach(key => {
      const value = urlParams.get(key);
      if (value) {
        params[key] = value;
      }
    });

    // Se tiver novos UTM params, salva no localStorage
    if (Object.keys(params).length > 0) {
      const stored = {
        ...params,
        captured_at: new Date().toISOString(),
        landing_page: window.location.pathname,
        referrer: document.referrer || 'direct'
      };
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(stored));
      setUtmParams(params);
      
      // Log para analytics (pode integrar com GA4/GTM depois)
      console.log('[UTM Tracking] Campaign params captured:', stored);
    } else {
      // Carrega UTM params existentes do localStorage
      try {
        const stored = localStorage.getItem(UTM_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setUtmParams(parsed);
        }
      } catch (e) {
        console.warn('[UTM Tracking] Failed to parse stored UTM params');
      }
    }
  }, []);

  // Função para obter UTM params para enviar junto com leads
  const getUTMForLead = (): string => {
    try {
      const stored = localStorage.getItem(UTM_STORAGE_KEY);
      return stored || '';
    } catch {
      return '';
    }
  };

  // Função para limpar UTM params após conversão
  const clearUTM = () => {
    localStorage.removeItem(UTM_STORAGE_KEY);
    setUtmParams({});
  };

  return {
    utmParams,
    getUTMForLead,
    clearUTM,
    hasUTM: Object.keys(utmParams).length > 0
  };
}

// Utility para formatar UTM params para exibição
export function formatUTMSource(params: UTMParams): string {
  if (params.utm_source) {
    const parts = [params.utm_source];
    if (params.utm_medium) parts.push(params.utm_medium);
    if (params.utm_campaign) parts.push(params.utm_campaign);
    return parts.join(' / ');
  }
  if (params.gclid) return 'Google Ads';
  if (params.fbclid) return 'Meta Ads';
  return 'Direto';
}
