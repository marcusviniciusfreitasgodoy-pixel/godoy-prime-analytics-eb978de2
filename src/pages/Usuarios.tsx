import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Users, Shield, UserCog, Activity, Calendar, FileText, Home, BarChart3 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserActivityStats } from "@/hooks/useUserActivityStats";

type AppRole = "admin" | "corretor" | "gerente";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  role: AppRole;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  corretor: "Corretor",
  gerente: "Gerente",
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
  corretor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  gerente: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export default function Usuarios() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          email: "",
          full_name: profile.full_name,
          phone: profile.phone,
          created_at: profile.created_at || "",
          role: (userRole?.role as AppRole) || "corretor",
        };
      });

      return usersWithRoles;
    },
  });

  const { data: activityStats, isLoading: activityLoading } = useUserActivityStats();

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existingRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Role atualizado",
        description: "A permissão do usuário foi alterada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível alterar a permissão do usuário.",
        variant: "destructive",
      });
      console.error("Error updating role:", error);
    },
  });

  const filteredUsers = users?.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users?.length || 0,
    admins: users?.filter((u) => u.role === "admin").length || 0,
    corretores: users?.filter((u) => u.role === "corretor").length || 0,
    gerentes: users?.filter((u) => u.role === "gerente").length || 0,
  };

  const activityTotals = activityStats?.reduce((acc, user) => ({
    totalActions: acc.totalActions + (user.total_actions || 0),
    totalLogins: acc.totalLogins + (user.logins || 0),
    totalValuations: acc.totalValuations + (user.valuations || 0),
    totalVistorias: acc.totalVistorias + (user.vistorias || 0),
    totalSearches: acc.totalSearches + (user.searches || 0),
    totalExports: acc.totalExports + (user.exports || 0),
  }), { totalActions: 0, totalLogins: 0, totalValuations: 0, totalVistorias: 0, totalSearches: 0, totalExports: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
          <UserCog className="h-7 w-7 text-accent" />
          Gerenciar Usuários
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie permissões e acompanhe atividade dos usuários
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.admins}</p>
                <p className="text-xs text-muted-foreground">Administradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activityTotals?.totalActions || 0}</p>
                <p className="text-xs text-muted-foreground">Total Ações</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{activityTotals?.totalValuations || 0}</p>
                <p className="text-xs text-muted-foreground">Avaliações</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="usuarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usuarios" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Usuários</span>
          </TabsTrigger>
          <TabsTrigger value="atividade" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Atividade</span>
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Usuários Cadastrados</CardTitle>
                  <CardDescription>
                    Clique no role para alterar a permissão do usuário
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuário..."
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
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                        <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.full_name || "Sem nome"}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {user.id.slice(0, 8)}...
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {user.phone || "-"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {user.created_at
                              ? format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(value: AppRole) =>
                                updateRoleMutation.mutate({ userId: user.id, newRole: value })
                              }
                              disabled={updateRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue>
                                  <Badge variant="outline" className={ROLE_COLORS[user.role]}>
                                    {ROLE_LABELS[user.role]}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="corretor">
                                  <Badge variant="outline" className={ROLE_COLORS.corretor}>
                                    Corretor
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="gerente">
                                  <Badge variant="outline" className={ROLE_COLORS.gerente}>
                                    Gerente
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <Badge variant="outline" className={ROLE_COLORS.admin}>
                                    Administrador
                                  </Badge>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="atividade">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                Atividade por Usuário
              </CardTitle>
              <CardDescription>
                Acompanhe logins, avaliações, vistorias e outras ações dos usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : activityStats && activityStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead className="text-center">Logins</TableHead>
                        <TableHead className="text-center">Avaliações</TableHead>
                        <TableHead className="text-center">Vistorias</TableHead>
                        <TableHead className="text-center hidden md:table-cell">Buscas</TableHead>
                        <TableHead className="text-center hidden md:table-cell">Exports</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="hidden lg:table-cell">Última Atividade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityStats.map((activity) => (
                        <TableRow key={activity.user_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{activity.full_name || "Sem nome"}</p>
                              <p className="text-xs text-muted-foreground">
                                {activity.active_days} dias ativos
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{activity.logins}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                              {activity.valuations}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                              {activity.vistorias}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            <Badge variant="outline">{activity.searches}</Badge>
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            <Badge variant="outline">{activity.exports}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-accent/10 text-accent border-accent/20">
                              {activity.total_actions}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                            {activity.last_activity 
                              ? formatDistanceToNow(new Date(activity.last_activity), { addSuffix: true, locale: ptBR })
                              : "-"
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma atividade registrada ainda</p>
                  <p className="text-xs mt-1">O tracking de atividade começará a registrar ações dos usuários automaticamente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
