import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Loader2 } from "lucide-react";

interface CorretorStats {
  nome: string;
  totalVisitas: number;
  realizadas: number;
  avaliacaoMedia: number;
}

interface CorretorRankingProps {
  data: CorretorStats[] | undefined;
  isLoading: boolean;
}

export function CorretorRanking({ data, isLoading }: CorretorRankingProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            Ranking de Corretores
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            Ranking de Corretores
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          Nenhum corretor encontrado
        </CardContent>
      </Card>
    );
  }

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0: return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
      case 1: return "bg-gray-400/20 text-gray-600 border-gray-400/30";
      case 2: return "bg-amber-600/20 text-amber-700 border-amber-600/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          Ranking de Corretores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Corretor</TableHead>
              <TableHead className="text-center">Visitas</TableHead>
              <TableHead className="text-center">Realizadas</TableHead>
              <TableHead className="text-center">Avaliação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 5).map((corretor, index) => (
              <TableRow key={corretor.nome}>
                <TableCell>
                  <Badge variant="outline" className={getMedalColor(index)}>
                    {index + 1}º
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{corretor.nome}</TableCell>
                <TableCell className="text-center">{corretor.totalVisitas}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{corretor.realizadas}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {corretor.avaliacaoMedia > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span>{corretor.avaliacaoMedia.toFixed(1)}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
