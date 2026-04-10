import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, CheckCircle, XCircle } from "lucide-react";
import { usePasswordValidation } from "@/hooks/usePasswordValidation";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength";

export default function ConviteAceitar() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invite, setInvite] = useState<any>(null);
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { criteria, allMet, strength, score } = usePasswordValidation(password);

  useEffect(() => {
    if (!token) return;
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    try {
      const { data, error } = await supabase
        .rpc("lookup_invite_by_token", { p_token: token });

      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setExpired(true);
        setIsLoading(false);
        return;
      }

      const inviteData = Array.isArray(data) ? data[0] : data;

      setInvite(inviteData);
      setEmail(inviteData.email);
      setOrgName(inviteData.organization_name || "");
    } catch {
      setExpired(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite || !fullName.trim()) return;

    setIsSubmitting(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            invite_token: token,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          // User already exists - try to sign in and link
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: invite.email,
            password,
          });

          if (loginError) {
            toast({
              title: "Email já cadastrado",
              description: "Faça login com sua senha atual para aceitar o convite.",
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }

          // Update profile with org
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from("profiles")
              .update({ organization_id: invite.organization_id })
              .eq("id", user.id);

            // Set role
            await supabase
              .from("user_roles")
              .upsert({ user_id: user.id, role: invite.role || "corretor" }, { onConflict: "user_id" });
          }
        } else {
          throw signUpError;
        }
      }

      // Mark invite as accepted
      await supabase
        .from("organization_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      toast({
        title: "Convite aceito!",
        description: `Bem-vindo à ${orgName}!`,
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível aceitar o convite.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/90">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/90 p-4">
        <Card className="w-full max-w-md border-accent/20 shadow-2xl">
          <CardContent className="pt-8 text-center space-y-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Convite Expirado</h2>
            <p className="text-muted-foreground">
              Este convite não é mais válido. Solicite um novo convite ao administrador.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Ir para Login
            </Button>
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
            <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-accent" />
            </div>
          </div>
          <CardTitle>Você foi convidado!</CardTitle>
          <CardDescription>
            <span className="font-semibold text-accent">{orgName}</span> convidou você para fazer parte da equipe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAcceptInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Criar Senha *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                required
              />
              <PasswordStrengthIndicator criteria={criteria} strength={strength} score={score} show={password.length > 0} />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || !allMet}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Aceitar Convite e Criar Conta
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
