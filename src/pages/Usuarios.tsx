import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Users, Shield, UserCog, Activity, FileText, BarChart3, UserPlus, Mail, Clock, Pencil } from "lucide-react";
import { EditUserModal } from "@/components/usuarios/EditUserModal";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserActivityStats } from "@/hooks/useUserActivityStats";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuthContext } from "@/contexts/AuthContext";

type AppRole = "admin" | "corretor" | "gerente";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  creci: string | null;
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("corretor");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organization, limits } = useOrganization();
  const { user } = useAuthContext();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, creci, created_at, email")
        .order("created_at", { ascending: false });
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("user_id, role");
      if (rolesError) throw rolesError;

      return profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email || "",
          full_name: profile.full_name,
          phone: profile.phone,
          creci: profile.creci,
          created_at: profile.created_at || "",
          role: (userRole?.role as AppRole) || "corretor",
        };
      }) as UserWithRole[];
    },
  });

  const { data: pendingInvites, isLoading: invitesLoading } = useQuery({
    queryKey: ["pending-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_invites")
        .select("*")
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: activityStats, isLoading: activityLoading, isError: activityError } = useUserActivityStats();

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { data: existingRole } = await supabase.from("user_roles").select("id").eq("user_id", userId).single();
      if (existingRole) {
        const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Role atualizado", description: "A permissão do usuário foi alterada com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar", description: "Não foi possível alterar a permissão.", variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, full_name, phone, email, creci }: { id: string; full_name: string; phone: string; email: string; creci: string }) => {
      const { error } = await supabase.from("profiles").update({ full_name, phone, email, creci }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Perfil atualizado", description: "Os dados do corretor foram salvos com sucesso." });
      setEditOpen(false);
      setEditingUser(null);
    },
    onError: () => {
      toast({ title: "Erro ao salvar", description: "Não foi possível atualizar o perfil.", variant: "destructive" });
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      if (!organization || !user) throw new Error("Organização não encontrada");

      if (limits && !limits.users.allowed) {
        throw new Error(`Limite de ${limits.users.max} usuários atingido para o plano ${organization.plan}`);
      }

      const { error } = await supabase.from("organization_invites").insert({
        organization_id: organization.id,
        email,
        role,
        invited_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
      toast({ title: "Convite enviado!", description: `Convite enviado para ${inviteEmail}` });
      setInviteEmail("");
      setInviteRole("corretor");
      setInviteOpen(false);
    },
    onError: (error: any) => {
      const msg = String(error?.message || "");
      const isLimit = msg.includes("Limite de usuários") || msg.includes("limit");
      toast({
        title: isLimit ? "Limite do plano atingido" : "Erro ao enviar convite",
        description: isLimit
          ? "Você já atingiu o número máximo de usuários do seu plano. Faça upgrade para convidar mais corretores."
          : msg,
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users?.filter(
    (u) => u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users?.length || 0,
    admins: users?.filter((u) => u.role === "admin").length || 0,
    corretores: users?.filter((u) => u.role === "corretor").length || 0,
    gerentes: users?.filter((u) => u.role === "gerente").length || 0,
  };

  const activityTotals = activityStats?.reduce(
    (acc, u) => ({
      totalActions: acc.totalActions + (u.total_actions || 0),
      totalLogins: acc.totalLogins + (u.logins || 0),
      totalValuations: acc.totalValuations + (u.valuations || 0),
      totalVistorias: acc.totalVistorias + (u.vistorias || 0),
      totalSearches: acc.totalSearches + (u.searches || 0),
      totalExports: acc.totalExports + (u.exports || 0),
    }),
    { totalActions: 0, totalLogins: 0, totalValuations: 0, totalVistorias: 0, totalSearches: 0, totalExports: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <UserCog className="h-7 w-7 text-accent" />
            Gerenciar Usuários
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie permissões e convide novos membros
          </p>
          {limits && (
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  !limits.users.allowed
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : limits.users.current >= limits.users.max - 1
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-primary/30 bg-primary/5 text-primary"
                }
              >
                {limits.users.current} de {limits.users.max} usuários
                {organization?.plan ? ` • plano ${organization.plan}` : ""}
              </Badge>
              {!limits.users.allowed && (
                <span className="text-xs text-destructive">
                  Limite atingido — faça upgrade para adicionar mais corretores.
                </span>
              )}
            </div>
          )}
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2"
              disabled={!!limits && !limits.users.allowed}
              title={!!limits && !limits.users.allowed ? "Limite do plano atingido" : undefined}
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Convidar</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar Novo Membro</DialogTitle>
              <DialogDescription>
                O convidado receberá um link para criar sua conta e será vinculado automaticamente à sua organização.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendInviteMutation.mutate({ email: inviteEmail, role: inviteRole });
              }}
              className="space-y-4"
            >
              {limits && (
                <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                  Vagas em uso: <strong>{limits.users.current}</strong> de <strong>{limits.users.max}</strong>.
                  Convites pendentes ocupam vaga até serem aceitos ou expirarem (7 dias).
                </div>
              )}
              <div className="space-y-2">
                <Label>Email do Convidado</Label>
                <Input
                  type="email"
                  placeholder="corretor@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Perfil de Acesso</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corretor">Corretor</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={sendInviteMutation.isPending}>
                {sendInviteMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
                ) : (
                  <><Mail className="mr-2 h-4 w-4" />Enviar Convite</>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Users className="h-8 w-8 text-accent" /><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Usuários</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Shield className="h-8 w-8 text-red-500" /><div><p className="text-2xl font-bold">{stats.admins}</p><p className="text-xs text-muted-foreground">Administradores</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><Activity className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{activityTotals?.totalActions || 0}</p><p className="text-xs text-muted-foreground">Total Ações</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><FileText className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{activityTotals?.totalValuations || 0}</p><p className="text-xs text-muted-foreground">Avaliações</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="usuarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usuarios" className="flex items-center gap-2"><Users className="h-4 w-4" /><span className="hidden sm:inline">Usuários</span></TabsTrigger>
          <TabsTrigger value="convites" className="flex items-center gap-2"><Mail className="h-4 w-4" /><span className="hidden sm:inline">Convites</span>{pendingInvites && pendingInvites.length > 0 && <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">{pendingInvites.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="atividade" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Atividade</span></TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div><CardTitle>Usuários Cadastrados</CardTitle><CardDescription>Clique no role para alterar a permissão</CardDescription></div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar usuário..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="hidden sm:table-cell">Email</TableHead><TableHead className="hidden md:table-cell">WhatsApp</TableHead><TableHead className="hidden lg:table-cell">CRECI</TableHead><TableHead>Role</TableHead><TableHead className="w-[60px]">Ações</TableHead></TableRow></TableHeader>
                     <TableBody>
                       {filteredUsers.map((u) => (
                         <TableRow key={u.id}>
                           <TableCell><div><p className="font-medium">{u.full_name || "Sem nome"}</p><p className="text-xs text-muted-foreground sm:hidden truncate max-w-[150px]">{u.email}</p></div></TableCell>
                           <TableCell className="hidden sm:table-cell text-sm text-muted-foreground truncate max-w-[200px]">{u.email || u.id.slice(0, 8)}</TableCell>
                           <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{u.phone || "—"}</TableCell>
                           <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{u.creci || "—"}</TableCell>
                           <TableCell>
                             <Select value={u.role} onValueChange={(value: AppRole) => updateRoleMutation.mutate({ userId: u.id, newRole: value })} disabled={updateRoleMutation.isPending}>
                               <SelectTrigger className="w-[140px]"><SelectValue><Badge variant="outline" className={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge></SelectValue></SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="corretor"><Badge variant="outline" className={ROLE_COLORS.corretor}>Corretor</Badge></SelectItem>
                                 <SelectItem value="gerente"><Badge variant="outline" className={ROLE_COLORS.gerente}>Gerente</Badge></SelectItem>
                                 <SelectItem value="admin"><Badge variant="outline" className={ROLE_COLORS.admin}>Administrador</Badge></SelectItem>
                               </SelectContent>
                             </Select>
                           </TableCell>
                           <TableCell>
                             <Button variant="ghost" size="icon" onClick={() => { setEditingUser(u); setEditOpen(true); }}>
                               <Pencil className="h-4 w-4" />
                             </Button>
                           </TableCell>
                         </TableRow>
                       ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">{searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invites Tab */}
        <TabsContent value="convites">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-accent" />Convites Pendentes</CardTitle>
              <CardDescription>Convites enviados aguardando aceitação</CardDescription>
            </CardHeader>
            <CardContent>
              {invitesLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
              ) : pendingInvites && pendingInvites.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Expira em</TableHead><TableHead>Link</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {pendingInvites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium">{invite.email}</TableCell>
                          <TableCell><Badge variant="outline" className={ROLE_COLORS[(invite.role as AppRole) || "corretor"]}>{ROLE_LABELS[(invite.role as AppRole) || "corretor"]}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true, locale: ptBR })}</div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/convite/${invite.token}`);
                                toast({ title: "Link copiado!", description: "Envie este link para o convidado." });
                              }}
                            >
                              Copiar Link
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum convite pendente</p>
                  <p className="text-xs mt-1">Use o botão "Convidar" para adicionar novos membros</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="atividade">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-accent" />Atividade por Usuário</CardTitle>
              <CardDescription>Acompanhe logins, avaliações, vistorias e outras ações</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
              ) : activityError ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Não foi possível carregar a atividade dos usuários. Tente novamente mais tarde.</p>
                </div>
              ) : activityStats && activityStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead className="text-center">Logins</TableHead><TableHead className="text-center">Avaliações</TableHead><TableHead className="text-center">Vistorias</TableHead><TableHead className="text-center hidden md:table-cell">Buscas</TableHead><TableHead className="text-center hidden md:table-cell">Exports</TableHead><TableHead className="text-center">Total</TableHead><TableHead className="hidden lg:table-cell">Última Atividade</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {activityStats.map((a, i) => (
                        <TableRow key={a.user_id ?? `sem-id-${i}`}>
                          <TableCell><div><p className="font-medium">{a.full_name || "Sem nome"}</p><p className="text-xs text-muted-foreground">{a.active_days} dias ativos</p></div></TableCell>
                          <TableCell className="text-center"><Badge variant="outline">{a.logins}</Badge></TableCell>
                          <TableCell className="text-center"><Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">{a.valuations}</Badge></TableCell>
                          <TableCell className="text-center"><Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">{a.vistorias}</Badge></TableCell>
                          <TableCell className="text-center hidden md:table-cell"><Badge variant="outline">{a.searches}</Badge></TableCell>
                          <TableCell className="text-center hidden md:table-cell"><Badge variant="outline">{a.exports}</Badge></TableCell>
                          <TableCell className="text-center"><Badge className="bg-accent/10 text-accent border-accent/20">{a.total_actions}</Badge></TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{a.last_activity ? formatDistanceToNow(new Date(a.last_activity), { addSuffix: true, locale: ptBR }) : "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma atividade registrada ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditUserModal
        user={editingUser}
        open={editOpen}
        onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingUser(null); }}
        onSave={(data) => updateProfileMutation.mutate(data)}
        isPending={updateProfileMutation.isPending}
      />
    </div>
  );
}
