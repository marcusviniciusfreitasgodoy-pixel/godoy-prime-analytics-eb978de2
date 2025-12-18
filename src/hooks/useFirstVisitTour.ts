import { useState, useEffect } from 'react';

const TOUR_STORAGE_KEY = 'godoy-tour-visited';

export function useFirstVisitTour(pageKey: string) {
  const [shouldRunTour, setShouldRunTour] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const visitedPages = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '{}');
    
    if (!visitedPages[pageKey]) {
      setShouldRunTour(true);
      // Mark as visited
      visitedPages[pageKey] = true;
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(visitedPages));
    }
    
    setHasChecked(true);
  }, [pageKey]);

  const startTour = () => setShouldRunTour(true);
  const endTour = () => setShouldRunTour(false);

  const resetAllTours = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  };

  return {
    shouldRunTour,
    hasChecked,
    startTour,
    endTour,
    resetAllTours
  };
}
