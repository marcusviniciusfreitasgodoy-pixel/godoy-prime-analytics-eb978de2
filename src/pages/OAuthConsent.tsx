import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import godoyLogo from "@/assets/godoy-logo-pdf.png";

type OAuthResult = { data: any; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const ESCOPOS: Record<string, string> = {
  openid: "Confirmar sua identidade",
  email: "Compartilhar seu e-mail",
  profile: "Compartilhar seu perfil básico",
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Pedido de autorização inválido.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      setEmail(sess.session.user.email ?? "");
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError("Este pedido expirou ou não é válido. Inicie a conexão novamente.");
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch {
        if (active) setError("Não foi possível carregar o pedido de autorização.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (error || !target) {
        setBusy(false);
        return setError(approve ? "Não foi possível aprovar a conexão." : "Não foi possível cancelar a conexão.");
      }
      window.location.href = target;
    } catch {
      setBusy(false);
      setError("Erro ao registrar sua decisão. Tente novamente.");
    }
  }

  const cliente = details?.client?.name ?? details?.client?.client_name ?? "o agente";
  const redirect = details?.redirect_uri ?? details?.client?.redirect_uri;
  const escopos = String(details?.scope ?? details?.scopes ?? "").split(/[\s,]+/).filter(Boolean);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/90 p-4">
      <Card className="w-full max-w-md border-accent/20 shadow-2xl">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <img src={godoyLogo} alt="Godoy Prime" className="h-12 w-auto" />
          </div>
          {details && <CardTitle className="text-lg">Conectar {cliente} à Godoy Prime Analytics</CardTitle>}
          {details && <CardDescription>Isso permite que {cliente} use a plataforma como você.</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive text-center">{error}</p>
          ) : !details ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
          ) : (
            <>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Conta:</span> {email}</p>
                {redirect && <p className="break-all"><span className="text-muted-foreground">Retorno:</span> {redirect}</p>}
              </div>
              <div className="text-sm space-y-1">
                <p className="font-medium">{cliente} poderá consultar, em seu nome:</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  <li>Estatísticas de mercado do ITBI</li>
                  <li>Suas visitas, leads, autorizações e avaliações</li>
                  {escopos.map((s) => <li key={s}>{ESCOPOS[s] ?? `Permissão adicional: ${s}`}</li>)}
                </ul>
                <p className="text-xs text-muted-foreground pt-2">
                  Isso não ultrapassa as permissões da sua conta: só aparece o que você já vê na plataforma.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>Cancelar conexão</Button>
                <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Autorizar"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
