import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "corretor" | "gerente";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  isGerente: boolean;
  isAdminOrGerente: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    role: null,
    isAdmin: false,
    isGerente: false,
    isAdminOrGerente: false,
  });

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        // Defer role check with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setAuthState(prev => ({
            ...prev,
            role: null,
            isAdmin: false,
            isGerente: false,
            isAdminOrGerente: false,
            isLoading: false,
          }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        setAuthState(prev => ({
          ...prev,
          role: "corretor",
          isAdmin: false,
          isGerente: false,
          isAdminOrGerente: false,
          isLoading: false,
        }));
        return;
      }

      const role = data?.role as UserRole;
      setAuthState(prev => ({
        ...prev,
        role,
        isAdmin: role === "admin",
        isGerente: role === "gerente",
        isAdminOrGerente: role === "admin" || role === "gerente",
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error fetching user role:", error);
      setAuthState(prev => ({
        ...prev,
        role: "corretor",
        isAdmin: false,
        isGerente: false,
        isAdminOrGerente: false,
        isLoading: false,
      }));
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    ...authState,
    signOut,
  };
}
