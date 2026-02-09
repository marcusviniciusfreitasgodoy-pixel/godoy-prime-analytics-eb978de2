import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Building2, Users, DollarSign, Search, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  trial: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  suspended: "bg-red-500/10 text-red-600 border-red-500/20",
  cancelled: "bg-muted text-muted-foreground",
};

export default function AdminPanel() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["superadmin-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: orgUserCounts } = useQuery({
    queryKey: ["superadmin-org-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("organization_id");
      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((p) => {
        if (p.organization_id) {
          counts[p.organization_id] = (counts[p.organization_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const filtered = organizations?.filter(
    (org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalOrgs: organizations?.length || 0,
    activeOrgs: organizations?.filter((o) => o.plan_status === "active").length || 0,
    totalUsers: orgUserCounts ? Object.values(orgUserCounts).reduce((a, b) => a + b, 0) : 0,
  };

  return (
    <>
      <Helmet>
        <title>Superadmin | Godoy Prime Analytics</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold">Painel Superadmin</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie todas as organizações da plataforma
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalOrgs}</p>
                  <p className="text-xs text-muted-foreground">Organizações</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Usuários Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.activeOrgs}</p>
                  <p className="text-xs text-muted-foreground">Orgs Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Organizações</CardTitle>
                <CardDescription>Lista de todas as organizações cadastradas</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar organização..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            ) : filtered && filtered.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organização</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Usuários</TableHead>
                      <TableHead className="hidden md:table-cell">Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-xs text-muted-foreground">{org.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {PLAN_LABELS[org.plan || "starter"] || org.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_COLORS[org.plan_status || "active"]}
                          >
                            {org.plan_status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {orgUserCounts?.[org.id] || 0} / {org.max_users || "∞"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {format(new Date(org.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma organização encontrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
