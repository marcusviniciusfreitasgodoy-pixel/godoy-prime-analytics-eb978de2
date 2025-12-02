import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProperties } from "@/hooks/useProperties";
import { useFilters } from "@/contexts/FiltersContext";
import { Skeleton } from "@/components/ui/skeleton";

export function PropertyTable() {
  const { filters } = useFilters();
  const properties = useProperties(filters);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Propriedades Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Condomínio</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma propriedade encontrada com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium">{property.condominio}</TableCell>
                  <TableCell>{property.type}</TableCell>
                  <TableCell className="font-semibold text-accent">{property.price}</TableCell>
                  <TableCell>{property.size}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        property.status === "active" 
                          ? "default" 
                          : property.status === "sold" 
                          ? "secondary" 
                          : "outline"
                      }
                      className={
                        property.status === "active"
                          ? "bg-success text-success-foreground"
                          : ""
                      }
                    >
                      {property.status === "active" ? "Ativo" : property.status === "sold" ? "Vendido" : "Pendente"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
