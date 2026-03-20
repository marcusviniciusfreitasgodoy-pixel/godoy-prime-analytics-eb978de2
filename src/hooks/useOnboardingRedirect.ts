import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";

const ONBOARDING_KEY = "godoy-onboarding-completed";
const FIRST_LOGIN_KEY = "godoy-first-login-checked";

export function useOnboardingRedirect() {
  const { user, isLoading } = useAuthContext();
  const { isDemo } = useDemo();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isLoading) {
      setIsChecking(true);
      return;
    }

    try {
      if (isDemo || !user) {
        setIsChecking(false);
        return;
      }

      const excludedPaths = [
        "/onboarding",
        "/auth",
        "/avaliacao-publica",
        "/agendar-visita",
        "/visitas/feedback",
        "/visitas/assinatura",
      ];

      const isExcludedPath = excludedPaths.some((path) => location.pathname.startsWith(path));

      if (isExcludedPath) {
        setIsChecking(false);
        return;
      }

      const onboardingCompleted = localStorage.getItem(ONBOARDING_KEY) === "true";
      const userFirstLoginKey = `${FIRST_LOGIN_KEY}-${user.id}`;
      const firstLoginChecked = localStorage.getItem(userFirstLoginKey) === "true";

      if (!onboardingCompleted && !firstLoginChecked) {
        localStorage.setItem(userFirstLoginKey, "true");
        navigate("/onboarding", { replace: true });
      }
    } catch (error) {
      console.error("[useOnboardingRedirect] Falha ao verificar onboarding:", error);
    } finally {
      setIsChecking(false);
    }
  }, [user, isLoading, isDemo, navigate, location.pathname]);

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
