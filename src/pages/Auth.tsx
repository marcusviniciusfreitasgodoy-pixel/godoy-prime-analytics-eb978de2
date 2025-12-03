import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';
import godoyLogo from '@/assets/godoy-logo-symbol.png';

const authSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }).max(255),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }).max(100),
});

const resetSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }).max(255),
});

type AuthFormData = z.infer<typeof authSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    try {
      if (isLogin) {
        await signIn(data.email, data.password);
      } else {
        await signUp(data.email, data.password);
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/`,
      });
      
      if (error) {
        toast.error('Erro ao enviar email de recuperação');
      } else {
        toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
        setIsForgotPassword(false);
        resetForm.reset();
      }
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('Erro ao processar solicitação');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password View
  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted via-muted to-muted/80 p-4">
        <Card className="w-full max-w-md border-accent/30 bg-primary shadow-2xl">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center mb-2">
              <img 
                src={godoyLogo} 
                alt="Godoy Prime" 
                className="h-16 w-auto"
                onError={(e) => {
                  e.currentTarget.src = '/favicon.png';
                  e.currentTarget.className = 'h-12 w-auto';
                }}
              />
            </div>
            <CardTitle className="text-3xl font-bold text-primary-foreground">
              Recuperar Senha
            </CardTitle>
            <CardDescription className="text-primary-foreground/70">
              Digite seu e-mail para receber instruções de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                <FormField
                  control={resetForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary-foreground">E-mail Corporativo</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="seu.email@empresa.com.br"
                          className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-accent hover:bg-accent/90 text-primary font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? 'Enviando...' : 'Enviar Email'}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-sm text-accent hover:text-accent/80 font-medium transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted via-muted to-muted/80 p-4">
      <Card className="w-full max-w-md border-accent/30 bg-primary shadow-2xl">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center mb-2">
            <img 
              src={godoyLogo} 
              alt="Godoy Prime" 
              className="h-16 w-auto"
              onError={(e) => {
                e.currentTarget.src = '/favicon.png';
                e.currentTarget.className = 'h-12 w-auto';
              }}
            />
          </div>
          <CardTitle className="text-3xl font-bold text-primary-foreground">
            {isLogin ? 'Bem-vindo' : 'Criar Conta'}
          </CardTitle>
          <CardDescription className="text-primary-foreground/70">
            {isLogin 
              ? 'Entre com suas credenciais para acessar a plataforma' 
              : 'Cadastre-se para acessar insights exclusivos do mercado'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary-foreground">E-mail Corporativo</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="seu.email@empresa.com.br"
                        className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary-foreground">Senha</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••"
                        className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-accent hover:bg-accent/90 text-primary font-semibold"
                disabled={isLoading}
              >
                {isLoading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
            >
              {isLogin 
                ? 'Não tem uma conta? Cadastre-se' 
                : 'Já tem uma conta? Entre'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
