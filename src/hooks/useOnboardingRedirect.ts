import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

const ONBOARDING_KEY = "godoy-onboarding-completed";
const FIRST_LOGIN_KEY = "godoy-first-login-checked";

export function useOnboardingRedirect() {
  const { user, isLoading } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    // Se não tem usuário, não faz nada
    if (!user) {
      setIsChecking(false);
      return;
    }

    // Verificar se já está na página de onboarding ou auth
    const excludedPaths = ["/onboarding", "/auth", "/avaliacao-publica", "/agendar-visita", "/visitas/feedback", "/visitas/assinatura"];
    const isExcludedPath = excludedPaths.some(path => location.pathname.startsWith(path));
    
    if (isExcludedPath) {
      setIsChecking(false);
      return;
    }

    // Verificar se o onboarding já foi completado
    const onboardingCompleted = localStorage.getItem(ONBOARDING_KEY) === "true";
    
    // Verificar se é o primeiro login deste usuário (usando o ID do usuário)
    const userFirstLoginKey = `${FIRST_LOGIN_KEY}-${user.id}`;
    const firstLoginChecked = localStorage.getItem(userFirstLoginKey) === "true";

    if (!onboardingCompleted && !firstLoginChecked) {
      // Marcar que verificamos o primeiro login
      localStorage.setItem(userFirstLoginKey, "true");
      // Redirecionar para onboarding
      navigate("/onboarding", { replace: true });
    }

    setIsChecking(false);
  }, [user, isLoading, navigate, location.pathname]);

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    if (user) {
      localStorage.removeItem(`${FIRST_LOGIN_KEY}-${user.id}`);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
  };

  const isOnboardingCompleted = () => {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  };

  return {
    isChecking,
    resetOnboarding,
    completeOnboarding,
    isOnboardingCompleted,
  };
}
