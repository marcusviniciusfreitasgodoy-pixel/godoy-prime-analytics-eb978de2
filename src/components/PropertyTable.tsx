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

const properties = [
  {
    id: 1,
    condominio: "Península",
    type: "Apartamento",
    price: "R$ 3.200.000",
    size: "180m²",
    status: "active",
  },
  {
    id: 2,
    condominio: "Riserva Golf",
    type: "Cobertura",
    price: "R$ 5.800.000",
    size: "320m²",
    status: "sold",
  },
  {
    id: 3,
    condominio: "Majestic",
    type: "Apartamento",
    price: "R$ 2.900.000",
    size: "150m²",
    status: "active",
  },
  {
    id: 4,
    condominio: "Le Parc",
    type: "Apartamento",
    price: "R$ 4.100.000",
    size: "220m²",
    status: "pending",
  },
  {
    id: 5,
    condominio: "Ilha Pura",
    type: "Apartamento",
    price: "R$ 2.500.000",
    size: "130m²",
    status: "active",
  },
];

export function PropertyTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Properties</CardTitle>
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
            {properties.map((property) => (
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
