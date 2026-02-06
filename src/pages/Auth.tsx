import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Eye } from "lucide-react";
import godoyLogo from "@/assets/godoy-logo-pdf.png";
export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();

  // Track login activity
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
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Credenciais inválidas",
            description: "Email ou senha incorretos. Verifique e tente novamente.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erro no login",
            description: error.message,
            variant: "destructive"
          });
        }
        return;
      }

      // Track successful login
      if (data?.user?.id) {
        trackLogin(data.user.id);
      }
      toast({
        title: "Login realizado!",
        description: "Bem-vindo à plataforma Godoy Prime."
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao fazer login.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (!fullName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe seu nome completo.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    try {
      const redirectUrl = `${window.location.origin}/`;
      const {
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: phone
          }
        }
      });
      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Email já cadastrado",
            description: "Este email já está registrado. Tente fazer login.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erro no cadastro",
            description: error.message,
            variant: "destructive"
          });
        }
        return;
      }
      toast({
        title: "Cadastro realizado!",
        description: "Você já pode acessar a plataforma."
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar sua conta.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, informe seu email.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha."
      });
      setShowForgotPassword(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar o email de recuperação.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  if (showForgotPassword) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/90 p-4">
        <Card className="w-full max-w-md border-accent/20 shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center">
              <img src={godoyLogo} alt="Godoy Prime" className="h-12 w-auto" />
            </div>
            <CardDescription>
              Digite seu email para receber o link de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input id="forgot-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </> : "Enviar Link de Recuperação"}
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
      </div>;
  }
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/90 p-4">
      <Card className="w-full max-w-md border-accent/20 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <img src={godoyLogo} alt="Godoy Prime" className="h-12 w-auto" />
          </div>
          <CardDescription>

Plataforma de Inteligência Imobiliária </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </> : "Entrar"}
                </Button>
                
                <div className="text-center">
                  <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-muted-foreground hover:text-accent transition-colors">
                    Esqueceu sua senha?
                  </button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome Completo *</Label>
                  <Input id="signup-name" type="text" placeholder="Seu nome completo" value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email *</Label>
                  <Input id="signup-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Telefone</Label>
                  <Input id="signup-phone" type="tel" placeholder="(21) 99999-9999" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha *</Label>
                  <Input id="signup-password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cadastrando...
                    </> : "Criar Conta"}
                </Button>
              </form>
            </TabsContent>
           </Tabs>
          
          <div className="mt-4 pt-4 border-t border-border/50 text-center">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate("/demo")}
            >
              <Eye className="h-4 w-4" />
              Explorar Demonstração
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Acesse com dados fictícios, sem cadastro
            </p>
          </div>
          
        </CardContent>
      </Card>
    </div>;
}