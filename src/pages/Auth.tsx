import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Eye } from "lucide-react";
import godoyLogo from "@/assets/godoy-logo-pdf.png";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const trackLogin = useCallback(async (userId: string) => {
    try {
      await supabase.from('user_activity_logs' as any).insert({
        user_id: userId,
        action_type: 'login',
        action_details: {},
        page_path: '/auth'
      });
    } catch (err) {
      console.error('Error tracking login:', err);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({
          title: error.message.includes("Invalid login credentials") ? "Credenciais inválidas" : "Erro no login",
          description: error.message.includes("Invalid login credentials")
            ? "Email ou senha incorretos. Verifique e tente novamente."
            : error.message,
          variant: "destructive",
        });
        return;
      }
      if (data?.user?.id) trackLogin(data.user.id);
      toast({ title: "Login realizado!", description: "Bem-vindo à plataforma." });
      navigate("/");
    } catch {
      toast({ title: "Erro", description: "Ocorreu um erro ao fazer login.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email obrigatório", description: "Por favor, informe seu email.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada para redefinir sua senha." });
      setShowForgotPassword(false);
    } catch {
      toast({ title: "Erro", description: "Ocorreu um erro ao enviar o email de recuperação.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/90 p-4">
        <Card className="w-full max-w-md border-accent/20 shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center">
              <img src={godoyLogo} alt="Godoy Prime" className="h-12 w-auto" />
            </div>
            <CardDescription>Digite seu email para receber o link de recuperação</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input id="forgot-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : "Enviar Link de Recuperação"}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button onClick={() => setShowForgotPassword(false)} className="text-sm text-muted-foreground hover:text-accent transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Voltar para o login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/90 p-4">
      <Card className="w-full max-w-md border-accent/20 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <img src={godoyLogo} alt="Godoy Prime" className="h-12 w-auto" />
          </div>
          <CardDescription>Plataforma de Inteligência Imobiliária</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input id="login-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Senha</Label>
              <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</> : "Entrar"}
            </Button>
            <div className="text-center">
              <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-muted-foreground hover:text-accent transition-colors">
                Esqueceu sua senha?
              </button>
            </div>
          </form>

          <div className="mt-4 pt-4 border-t border-border/50 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Acesso somente por convite. Solicite ao administrador da sua organização.
            </p>
            <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/apresentacao")}>
              <Eye className="h-4 w-4" />
              Ver Apresentação
            </Button>
            <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => navigate("/demo")}>
              Explorar Demonstração
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
