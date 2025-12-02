import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SeedData() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSeed = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-condominios');
      
      if (error) throw error;
      
      setResult(data);
      toast.success(`✅ ${data.total} condomínios inseridos com sucesso!`);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Popular Banco de Dados</h2>
        <p className="text-muted-foreground mt-1">Popular banco com 507 condomínios da Barra</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>População de Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleSeed} 
            disabled={loading}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {loading ? 'Inserindo dados...' : 'Popular Banco de Dados'}
          </Button>

          {result && (
            <div className="p-4 bg-muted rounded-lg">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
