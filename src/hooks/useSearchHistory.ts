import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'search_history';
const MAX_HISTORY_ITEMS = 5;

export interface SearchHistoryItem {
  query: string;
  type: 'location' | 'transaction' | 'valuation';
  timestamp: number;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Erro ao carregar histórico de buscas:', e);
    }
  }, []);

  // Save to localStorage whenever history changes
  const saveHistory = useCallback((items: SearchHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      setHistory(items);
    } catch (e) {
      console.error('Erro ao salvar histórico de buscas:', e);
    }
  }, []);

  const addToHistory = useCallback((query: string, type: SearchHistoryItem['type']) => {
    if (!query || query.length < 2) return;

    const newItem: SearchHistoryItem = {
      query,
      type,
      timestamp: Date.now(),
    };

    // Remove duplicates and add new item at the beginning
    const filtered = history.filter(
      item => !(item.query === query && item.type === type)
    );
    
    const newHistory = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    saveHistory(newHistory);
  }, [history, saveHistory]);

  const clearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  const removeFromHistory = useCallback((timestamp: number) => {
    const newHistory = history.filter(item => item.timestamp !== timestamp);
    saveHistory(newHistory);
  }, [history, saveHistory]);

  return {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };
}
