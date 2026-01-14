import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface TourPage {
  path: string;
  name: string;
  steps: string[];
}

// Definição das páginas do tour e seus passos
export const TOUR_PAGES: TourPage[] = [
  {
    path: '/',
    name: 'Dashboard',
    steps: ['kpis', 'bairro-selector', 'evolution-chart', 'microbairro-chart', 'microbairro-ranking', 'transaction-map', 'sofia-assistant', 'export-button'],
  },
  {
    path: '/microbairros',
    name: 'Microregiões',
    steps: ['street-comparison', 'street-selector'],
  },
  {
    path: '/pesquisas-mercado',
    name: 'Pesquisas',
    steps: ['search-form', 'search-results'],
  },
  {
    path: '/avaliacao-imobiliaria',
    name: 'Avaliação',
    steps: ['valuation-form'],
  },
  {
    path: '/vistoria-digital',
    name: 'Vistoria',
    steps: ['vistoria-form'],
  },
  {
    path: '/visitas',
    name: 'Visitas',
    steps: ['visitas-dashboard'],
  },
];

const TOUR_STATE_KEY = 'godoy-tour-state';

interface TourState {
  isActive: boolean;
  currentPageIndex: number;
  completedPages: string[];
}

export function useTourNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [tourState, setTourState] = useState<TourState>(() => {
    const saved = localStorage.getItem(TOUR_STATE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { isActive: false, currentPageIndex: 0, completedPages: [] };
      }
    }
    return { isActive: false, currentPageIndex: 0, completedPages: [] };
  });

  // Salvar estado no localStorage
  useEffect(() => {
    localStorage.setItem(TOUR_STATE_KEY, JSON.stringify(tourState));
  }, [tourState]);

  const currentPage = TOUR_PAGES[tourState.currentPageIndex];
  const isOnTourPage = currentPage?.path === location.pathname;
  const hasMorePages = tourState.currentPageIndex < TOUR_PAGES.length - 1;
  const progress = ((tourState.currentPageIndex + 1) / TOUR_PAGES.length) * 100;

  const startTour = useCallback(() => {
    setTourState({
      isActive: true,
      currentPageIndex: 0,
      completedPages: [],
    });
    navigate('/');
  }, [navigate]);

  const endTour = useCallback(() => {
    setTourState(prev => ({
      ...prev,
      isActive: false,
    }));
    localStorage.removeItem(TOUR_STATE_KEY);
  }, []);

  const completeCurrentPage = useCallback(() => {
    setTourState(prev => ({
      ...prev,
      completedPages: [...prev.completedPages, currentPage?.path || ''],
    }));
  }, [currentPage]);

  const goToNextPage = useCallback(() => {
    if (hasMorePages) {
      const nextIndex = tourState.currentPageIndex + 1;
      const nextPage = TOUR_PAGES[nextIndex];
      setTourState(prev => ({
        ...prev,
        currentPageIndex: nextIndex,
        completedPages: [...prev.completedPages, currentPage?.path || ''],
      }));
      navigate(nextPage.path);
    } else {
      // Tour completo
      endTour();
    }
  }, [hasMorePages, tourState.currentPageIndex, currentPage, navigate, endTour]);

  const skipToPage = useCallback((pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < TOUR_PAGES.length) {
      const targetPage = TOUR_PAGES[pageIndex];
      setTourState(prev => ({
        ...prev,
        currentPageIndex: pageIndex,
      }));
      navigate(targetPage.path);
    }
  }, [navigate]);

  return {
    isActive: tourState.isActive,
    currentPage,
    currentPageIndex: tourState.currentPageIndex,
    totalPages: TOUR_PAGES.length,
    hasMorePages,
    progress,
    isOnTourPage,
    completedPages: tourState.completedPages,
    startTour,
    endTour,
    completeCurrentPage,
    goToNextPage,
    skipToPage,
    allPages: TOUR_PAGES,
  };
}
