import { Helmet } from "react-helmet-async";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FeedbackLanding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = useMemo(() => {
    const fromQuery = (searchParams.get("codigo") || "").trim();
    return fromQuery;
  }, [searchParams]);

  const [codigo, setCodigo] = useState(initialCode);

  const go = () => {
    const clean = codigo.trim();
    if (!clean) return;
    navigate(`/visitas/feedback/${encodeURIComponent(clean)}`);
  };

  return (
    <>
      <Helmet>
        <title>Feedback da Visita | Godoy Prime</title>
        <meta
          name="description"
          content="Envie seu feedback da visita informando o código recebido."
        />
        <link rel="canonical" href={`${window.location.origin}/visitas/feedback`} />
      </Helmet>

      <main className="min-h-screen bg-background p-6">
        <section className="mx-auto max-w-xl">
          <h1 className="sr-only">Feedback da visita</h1>

          <Card>
            <CardHeader>
              <CardTitle>Feedback da Visita</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Para responder, informe o <strong>código da visita</strong> recebido.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ex: VIS-20251223-ABCD"
                  autoComplete="off"
                  inputMode="text"
                  aria-label="Código da visita"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") go();
                  }}
                />
                <Button type="button" onClick={go} className="sm:w-40">
                  Continuar
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Dica: se você recebeu um link incompleto, tente copiar o código no final e colar
                aqui.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
