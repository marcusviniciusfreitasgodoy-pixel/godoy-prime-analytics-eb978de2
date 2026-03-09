import { Sparkles } from "lucide-react";

export function EnriquecerCondominios() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Enriquecimento IA</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Componente em construção — adicione aqui a lógica de enriquecimento de condomínios via IA.
      </p>
    </div>
  );
}
