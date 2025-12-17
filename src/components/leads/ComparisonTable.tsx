import { Check, X } from "lucide-react";

const comparisonData = [
  {
    criteria: "Dados utilizados",
    preliminary: "ITBI histórico",
    complete: "ITBI + Mercado + Vistoria presencial",
  },
  {
    criteria: "Tempo de resultado",
    preliminary: "Instantâneo",
    complete: "24-48 horas",
  },
  {
    criteria: "Análise de características",
    preliminary: "Básica (área, quartos)",
    complete: "26 fatores analisados",
  },
  {
    criteria: "Vistoria presencial",
    preliminary: false,
    complete: true,
  },
  {
    criteria: "Recomendação de preço",
    preliminary: "Faixa estimada",
    complete: "Valor otimizado para venda",
  },
  {
    criteria: "Análise documental",
    preliminary: false,
    complete: true,
  },
  {
    criteria: "Perito avaliador credenciado",
    preliminary: false,
    complete: true,
  },
  {
    criteria: "Relatório PDF profissional",
    preliminary: false,
    complete: true,
  },
  {
    criteria: "Estratégia de negociação",
    preliminary: false,
    complete: true,
  },
];

export function ComparisonTable() {
  const renderValue = (value: boolean | string) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="h-5 w-5 text-green-500 mx-auto" />
      ) : (
        <X className="h-5 w-5 text-red-400 mx-auto" />
      );
    }
    return <span className="text-sm">{value}</span>;
  };

  return (
    <div className="w-full overflow-x-auto">
      <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
        Análise Preliminar vs. Avaliação Completa: Qual é a ideal para você?
      </h3>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-3 bg-muted/50 border-b border-border font-medium text-foreground">
              Critério
            </th>
            <th className="text-center p-3 bg-muted/50 border-b border-border font-medium text-foreground">
              Análise Preliminar
            </th>
            <th className="text-center p-3 bg-primary/10 border-b border-primary/30 font-medium text-primary">
              Avaliação Completa ⭐
            </th>
          </tr>
        </thead>
        <tbody>
          {comparisonData.map((row, index) => (
            <tr key={index} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="p-3 text-sm text-muted-foreground font-medium">
                {row.criteria}
              </td>
              <td className="p-3 text-center text-muted-foreground">
                {renderValue(row.preliminary)}
              </td>
              <td className="p-3 text-center bg-primary/5 text-foreground font-medium">
                {renderValue(row.complete)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
