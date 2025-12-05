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

const loginSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }).max(255),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }).max(100),
});

const signupSchema = z.object({
  fullName: z.string().min(3, { message: 'Nome deve ter no mínimo 3 caracteres' }).max(100),
  email: z.string().email({ message: 'E-mail inválido' }).max(255),
  phone: z.string().regex(/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/, { message: 'Telefone inválido. Use o formato (XX) XXXXX-XXXX' }).optional().or(z.literal('')),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }).max(100),
});

const resetSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }).max(255),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
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

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSignupSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await signUp({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone || undefined,
      });
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers.length ? `(${numbers}` : '';
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
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
          {isLogin ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
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
                  control={loginForm.control}
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

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-accent hover:bg-accent/90 text-primary font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processando...' : 'Entrar'}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                <FormField
                  control={signupForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary-foreground">Nome Completo</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="João da Silva"
                          className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signupForm.control}
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
                  control={signupForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary-foreground">Telefone</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="(21) 99999-9999"
                          className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50"
                          {...field}
                          onChange={(e) => {
                            field.onChange(formatPhone(e.target.value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={signupForm.control}
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

                <Button 
                  type="submit" 
                  className="w-full bg-accent hover:bg-accent/90 text-primary font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processando...' : 'Cadastrar'}
                </Button>
              </form>
            </Form>
          )}

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
