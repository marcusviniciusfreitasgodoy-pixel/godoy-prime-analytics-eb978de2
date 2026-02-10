import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProposalModelSelectorProps {
  selected: 'simplificado' | 'completo' | null;
  onSelect: (modelo: 'simplificado' | 'completo') => void;
}

export function ProposalModelSelector({ selected, onSelect }: ProposalModelSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          selected === "simplificado" && "ring-2 ring-primary border-primary"
        )}
        onClick={() => onSelect("simplificado")}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Proposta Simplificada</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>
            Campos essenciais: valor ofertado, sinal/entrada, forma de pagamento e validade.
          </CardDescription>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          selected === "completo" && "ring-2 ring-primary border-primary"
        )}
        onClick={() => onSelect("completo")}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Proposta Completa</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>
            Todos os campos: parcelas, financiamento, permuta, matrícula, cláusula de documento posterior.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
