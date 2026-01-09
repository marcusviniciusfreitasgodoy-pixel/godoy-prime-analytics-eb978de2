/**
 * Cache persistente para análise histórica de transações
 * Armazena dados por bairro com invalidação inteligente
 */

import type { HistoricalAnalysis } from '@/hooks/useHistoricalTransactionAnalysis';

const CACHE_KEY_PREFIX = 'historical_analysis_';
const CACHE_VERSION = 'v3'; // Incrementar ao mudar estrutura de dados
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas (dados ITBI não mudam frequentemente)
const MAX_CACHE_ENTRIES = 50; // Limitar memória do localStorage

interface CacheEntry {
  version: string;
  timestamp: number;
  bairro: string;
  logradouro: string;
  data: HistoricalAnalysis;
}

/**
 * Gera chave única para cache baseada em bairro e logradouro
 */
function generateCacheKey(bairro: string, logradouro: string): string {
  const normalizedBairro = bairro.toUpperCase().trim();
  const normalizedLogradouro = logradouro.toUpperCase().trim();
  // Usar hash simples para evitar chaves muito longas
  const hash = `${normalizedBairro}_${normalizedLogradouro}`.replace(/\s+/g, '_').substring(0, 50);
  return `${CACHE_KEY_PREFIX}${hash}`;
}

/**
 * Recupera análise do cache se válida
 */
export function getCachedAnalysis(bairro: string, logradouro: string): HistoricalAnalysis | null {
  try {
    const normalizedBairro = bairro.toUpperCase().trim();
    const normalizedLogradouro = logradouro.toUpperCase().trim();
    const key = generateCacheKey(bairro, logradouro);
    const cached = localStorage.getItem(key);
    
    if (!cached) return null;
    
    const entry: CacheEntry = JSON.parse(cached);
    
    // Validar versão
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }
    
    // CRÍTICO: Validar que bairro E logradouro correspondem exatamente
    if (entry.bairro !== normalizedBairro || entry.logradouro !== normalizedLogradouro) {
      console.warn(`[HistoricalCache] Mismatch: cached=${entry.bairro}/${entry.logradouro}, requested=${normalizedBairro}/${normalizedLogradouro}`);
      localStorage.removeItem(key);
      return null;
    }
    
    // Validar expiração
    const now = Date.now();
    if (now - entry.timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(key);
      return null;
    }
    
    // Validar se é o mesmo dia (dados de ITBI são atualizados diariamente)
    const cachedDate = new Date(entry.timestamp).toDateString();
    const todayDate = new Date().toDateString();
    if (cachedDate !== todayDate) {
      localStorage.removeItem(key);
      return null;
    }
    
    console.log(`[HistoricalCache] Hit: ${normalizedBairro}/${normalizedLogradouro.substring(0, 20)}...`);
    return entry.data;
  } catch (error) {
    console.warn('[HistoricalCache] Error reading cache:', error);
    return null;
  }
}

/**
 * Salva análise no cache
 */
export function setCachedAnalysis(
  bairro: string, 
  logradouro: string, 
  data: HistoricalAnalysis
): void {
  try {
    const key = generateCacheKey(bairro, logradouro);
    
    const entry: CacheEntry = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      bairro: bairro.toUpperCase().trim(),
      logradouro: logradouro.toUpperCase().trim(),
      data,
    };
    
    // Limpar cache antigo se necessário
    cleanupOldCache();
    
    localStorage.setItem(key, JSON.stringify(entry));
    console.log(`[HistoricalCache] Saved: ${bairro}/${logradouro.substring(0, 20)}...`);
  } catch (error) {
    console.warn('[HistoricalCache] Error saving cache:', error);
    // Se localStorage cheio, limpar entradas antigas
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearOldestCacheEntries(10);
      try {
        localStorage.setItem(generateCacheKey(bairro, logradouro), JSON.stringify({
          version: CACHE_VERSION,
          timestamp: Date.now(),
          bairro,
          logradouro,
          data,
        }));
      } catch {
        console.error('[HistoricalCache] Failed to save even after cleanup');
      }
    }
  }
}

/**
 * Limpa entradas de cache antigas ou inválidas
 */
function cleanupOldCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    
    if (keys.length <= MAX_CACHE_ENTRIES) return;
    
    // Ordenar por timestamp e remover as mais antigas
    const entries: { key: string; timestamp: number }[] = [];
    
    keys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          entries.push({ key, timestamp: entry.timestamp });
        }
      } catch {
        // Entrada inválida, remover
        localStorage.removeItem(key);
      }
    });
    
    // Ordenar por timestamp (mais antigos primeiro)
    entries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remover entradas mais antigas até ficar dentro do limite
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES + 10);
    toRemove.forEach(e => localStorage.removeItem(e.key));
    
    console.log(`[HistoricalCache] Cleaned ${toRemove.length} old entries`);
  } catch (error) {
    console.warn('[HistoricalCache] Cleanup error:', error);
  }
}

/**
 * Remove as N entradas mais antigas
 */
function clearOldestCacheEntries(count: number): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    const entries: { key: string; timestamp: number }[] = [];
    
    keys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          entries.push({ key, timestamp: entry.timestamp });
        }
      } catch {
        localStorage.removeItem(key);
      }
    });
    
    entries.sort((a, b) => a.timestamp - b.timestamp);
    entries.slice(0, count).forEach(e => localStorage.removeItem(e.key));
  } catch (error) {
    console.warn('[HistoricalCache] Error clearing entries:', error);
  }
}

/**
 * Limpa todo o cache de análise histórica
 */
export function clearAllHistoricalCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
    console.log(`[HistoricalCache] Cleared ${keys.length} entries`);
  } catch (error) {
    console.warn('[HistoricalCache] Error clearing all cache:', error);
  }
}

/**
 * Retorna estatísticas do cache
 */
export function getCacheStats(): { count: number; oldestDate: Date | null; newestDate: Date | null } {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    
    if (keys.length === 0) {
      return { count: 0, oldestDate: null, newestDate: null };
    }
    
    let oldest = Date.now();
    let newest = 0;
    
    keys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          if (entry.timestamp < oldest) oldest = entry.timestamp;
          if (entry.timestamp > newest) newest = entry.timestamp;
        }
      } catch {
        // Ignorar entradas inválidas
      }
    });
    
    return {
      count: keys.length,
      oldestDate: oldest < Date.now() ? new Date(oldest) : null,
      newestDate: newest > 0 ? new Date(newest) : null,
    };
  } catch {
    return { count: 0, oldestDate: null, newestDate: null };
  }
}
