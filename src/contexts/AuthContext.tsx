import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { User, Session } from "@supabase/supabase-js";

type UserRole = "admin" | "corretor" | "gerente";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  isGerente: boolean;
  isAdminOrGerente: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
