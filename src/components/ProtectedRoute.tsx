import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireAdminOrGerente?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireAdminOrGerente = false }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin, isAdminOrGerente } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireAdminOrGerente && !isAdminOrGerente) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
