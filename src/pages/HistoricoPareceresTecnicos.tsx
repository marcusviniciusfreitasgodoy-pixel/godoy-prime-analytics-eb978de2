import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

export default function HistoricoPareceresTecnicos() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pareceres_tecnicos")
        .select("id, referencia_documento, endereco_imovel, bairro, valor_mercado, status, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);
      setItems(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Pareceres Tecnicos</h1>
            <p className="text-xs text-muted-foreground">Historico de pareceres emitidos</p>
          </div>
        </div>
        <Link to="/parecer-tecnico/novo">
          <Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Parecer</Button>
        </Link>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Documentos</CardTitle></CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum parecer emitido ainda.</p>}
          <div className="space-y-2">
            {items.map((it) => (
              <Link key={it.id} to={`/parecer-tecnico/${it.id}`} className="block border rounded p-3 hover:bg-muted/40">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{it.referencia_documento || "Sem referencia"}</p>
                    <p className="text-xs text-muted-foreground">{it.endereco_imovel || "Sem endereco"} {it.bairro ? `- ${it.bairro}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">{it.valor_mercado ? `R$ ${Number(it.valor_mercado).toLocaleString("pt-BR")}` : "-"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(it.updated_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
