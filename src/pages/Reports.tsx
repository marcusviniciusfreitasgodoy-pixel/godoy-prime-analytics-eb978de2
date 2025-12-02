import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";

const reports = [
  { title: "Relatório Mensal - Maio 2024", date: "01/06/2024", size: "2.4 MB" },
  { title: "Análise de Mercado Q2", date: "15/05/2024", size: "3.1 MB" },
  { title: "Performance de Vendas", date: "10/05/2024", size: "1.8 MB" },
  { title: "Comparativo Anual 2023-2024", date: "01/05/2024", size: "4.2 MB" },
];

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Reports</h2>
        <p className="text-muted-foreground mt-1">Relatórios e documentos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="bg-accent/10 p-2 rounded-lg">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold">{report.title}</p>
                  <p className="text-sm text-muted-foreground font-normal">{report.date}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{report.size}</span>
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
