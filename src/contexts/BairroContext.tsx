import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface BairroContextType {
  selectedBairro: string;
  setSelectedBairro: (bairro: string) => void;
}

const BairroContext = createContext<BairroContextType | undefined>(undefined);

const STORAGE_KEY = 'godoy-selected-bairro';
const DEFAULT_BAIRRO = 'BARRA DA TIJUCA';

export function BairroProvider({ children }: { children: ReactNode }) {
  const [selectedBairro, setSelectedBairroState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored || DEFAULT_BAIRRO;
  });

  const setSelectedBairro = (bairro: string) => {
    setSelectedBairroState(bairro);
    localStorage.setItem(STORAGE_KEY, bairro);
  };

  return (
    <BairroContext.Provider value={{ selectedBairro, setSelectedBairro }}>
      {children}
    </BairroContext.Provider>
  );
}

export function useBairro() {
  const context = useContext(BairroContext);
  if (!context) {
    throw new Error('useBairro must be used within a BairroProvider');
  }
  return context;
}
