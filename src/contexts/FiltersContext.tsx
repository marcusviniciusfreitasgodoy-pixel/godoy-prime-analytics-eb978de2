import { createContext, useContext, useState, ReactNode } from 'react';
import { PropertyFilters } from '@/hooks/useProperties';

interface FiltersContextType {
  filters: PropertyFilters;
  setFilters: (filters: PropertyFilters) => void;
  resetFilters: () => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<PropertyFilters>({});

  const resetFilters = () => {
    setFilters({});
  };

  return (
    <FiltersContext.Provider value={{ filters, setFilters, resetFilters }}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}
