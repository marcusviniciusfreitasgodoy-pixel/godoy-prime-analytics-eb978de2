import { createContext, useContext, ReactNode } from "react";

interface DemoContextType {
  isDemo: boolean;
}

const DemoContext = createContext<DemoContextType>({ isDemo: false });

export function DemoProvider({ children, isDemo = false }: { children: ReactNode; isDemo?: boolean }) {
  return (
    <DemoContext.Provider value={{ isDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  return useContext(DemoContext);
}
