import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Home, 
  DollarSign, 
  Calendar,
  BedDouble,
  Car,
  RefreshCw,
  Download,
  CheckCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  bairro_interesse: string | null;
  area_interesse: number | null;
  valor_interesse: number | null;
  quartos: number | null;
  banheiros: number | null;
  suites: number | null;
  vagas: number | null;
  interesse: string | null;
  origem: string | null;
  convertido: boolean | null;
  created_at: string;
}

const formatCurrency = (value: number | null) => {
  if (!value) return "-";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
};

const formatPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterInteresse, setFilterInteresse] = useState<string>("todos");
  const [filterConvertido, setFilterConvertido] = useState<string>("todos");

  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Lead[];
    },
  });

  const filteredLeads = leads?.filter((lead) => {
    const matchesSearch = 
      lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefone.includes(searchTerm);
    
    const matchesInteresse = 
      filterInteresse === "todos" || lead.interesse === filterInteresse;
    
    const matchesConvertido = 
      filterConvertido === "todos" || 
      (filterConvertido === "sim" && lead.convertido) ||
      (filterConvertido === "nao" && !lead.convertido);

    return matchesSearch && matchesInteresse && matchesConvertido;
  });

  const toggleConvertido = async (leadId: string, currentValue: boolean | null) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ convertido: !currentValue })
        .eq("id", leadId);

      if (error) throw error;
      toast.success(currentValue ? "Lead desmarcado como convertido" : "Lead marcado como convertido!");
      refetch();
    } catch (error) {
      console.error("Erro ao atualizar lead:", error);
      toast.error("Erro ao atualizar lead");
    }
  };

  const exportToCSV = () => {
    if (!filteredLeads?.length) {
      toast.error("Nenhum lead para exportar");
      return;
    }

    const headers = ["Nome", "Email", "Telefone", "Interesse", "Bairro", "Área", "Valor", "Quartos", "Vagas", "Convertido", "Data"];
    const rows = filteredLeads.map((lead) => [
      lead.nome,
      lead.email,
      formatPhone(lead.telefone),
      lead.interesse === "compra" ? "Compra" : lead.interesse === "venda" ? "Venda" : "-",
      lead.bairro_interesse || "-",
      lead.area_interesse ? `${lead.area_interesse} m²` : "-",
      formatCurrency(lead.valor_interesse),
      lead.quartos || "-",
      lead.vagas || "-",
      lead.convertido ? "Sim" : "Não",
      format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Leads exportados com sucesso!");
  };

  const stats = {
    total: leads?.length || 0,
    compra: leads?.filter((l) => l.interesse === "compra").length || 0,
    venda: leads?.filter((l) => l.interesse === "venda").length || 0,
    convertidos: leads?.filter((l) => l.convertido).length || 0,
  };

  return (
    <>
      <Helmet>
        <title>Gestão de Leads | Godoy Prime Realty</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-accent" />
              Gestão de Leads
            </h1>
            <p className="text-muted-foreground text-sm">
              Acompanhe e gerencie os leads capturados pela avaliação rápida
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-primary/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total de Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-accent/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Home className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.compra}</p>
                  <p className="text-xs text-muted-foreground">Querem Comprar</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.venda}</p>
                  <p className="text-xs text-muted-foreground">Querem Vender</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.convertidos}</p>
                  <p className="text-xs text-muted-foreground">Convertidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterInteresse} onValueChange={setFilterInteresse}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Interesse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="venda">Venda</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterConvertido} onValueChange={setFilterConvertido}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sim">Convertidos</SelectItem>
                  <SelectItem value="nao">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Leads ({filteredLeads?.length || 0})
            </CardTitle>
            <CardDescription>
              Lista de leads capturados através do formulário de avaliação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredLeads?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum lead encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead className="hidden md:table-cell">Interesse</TableHead>
                      <TableHead className="hidden lg:table-cell">Imóvel</TableHead>
                      <TableHead className="hidden xl:table-cell">Valor</TableHead>
                      <TableHead className="hidden sm:table-cell">Data</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads?.map((lead) => (
                      <TableRow key={lead.id} className="group">
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{lead.nome}</p>
                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {formatPhone(lead.telefone)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge 
                            variant={lead.interesse === "compra" ? "default" : "secondary"}
                            className={lead.interesse === "compra" ? "bg-accent text-accent-foreground" : "bg-green-500/10 text-green-600"}
                          >
                            {lead.interesse === "compra" ? (
                              <>
                                <Home className="h-3 w-3 mr-1" />
                                Compra
                              </>
                            ) : lead.interesse === "venda" ? (
                              <>
                                <DollarSign className="h-3 w-3 mr-1" />
                                Venda
                              </>
                            ) : (
                              "-"
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-sm space-y-0.5">
                            {lead.bairro_interesse && (
                              <p className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {lead.bairro_interesse}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {lead.area_interesse && <span>{lead.area_interesse} m²</span>}
                              {lead.quartos && (
                                <span className="flex items-center gap-0.5">
                                  <BedDouble className="h-3 w-3" />
                                  {lead.quartos}
                                </span>
                              )}
                              {lead.vagas && (
                                <span className="flex items-center gap-0.5">
                                  <Car className="h-3 w-3" />
                                  {lead.vagas}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <span className="font-medium text-accent">
                            {formatCurrency(lead.valor_interesse)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(lead.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleConvertido(lead.id, lead.convertido)}
                            className={lead.convertido ? "text-green-600 hover:text-green-700" : "text-muted-foreground hover:text-foreground"}
                          >
                            {lead.convertido ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <Clock className="h-5 w-5" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}