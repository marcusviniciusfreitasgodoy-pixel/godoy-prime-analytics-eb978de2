import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Phone, Mail, MessageCircle, Plus, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LeadPipeline, AtividadeLead, Tarefa, NotaLead,
  getScoreIcon, getScoreColor, formatTimeAgo, formatCurrencyFull,
  PIPELINE_COLUMNS, PrioridadeTarefa,
} from '@/types/crm';
import { cn } from '@/lib/utils';

interface LeadDetailModalProps {
  lead: LeadPipeline | null;
  open: boolean;
  onClose: () => void;
  onUpdateLead?: () => void;
}

export function LeadDetailModal({ lead, open, onClose, onUpdateLead }: LeadDetailModalProps) {
  const { user } = useAuthContext();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<PrioridadeTarefa>('media');

  const userName = user?.email?.split('@')[0] || 'Usuário';

  // Fetch atividades
  const { data: atividades } = useQuery({
    queryKey: ['atividades-lead', lead?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atividades_lead')
        .select('*')
        .eq('lead_id', lead!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as AtividadeLead[];
    },
    enabled: !!lead?.id && open,
  });

  // Fetch tarefas
  const { data: tarefas } = useQuery({
    queryKey: ['tarefas-lead', lead?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarefas')
        .select('*')
        .eq('lead_id', lead!.id)
        .order('data_vencimento', { ascending: true });
      if (error) throw error;
      return data as unknown as Tarefa[];
    },
    enabled: !!lead?.id && open,
  });

  // Fetch notas
  const { data: notas } = useQuery({
    queryKey: ['notas-lead', lead?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notas_lead')
        .select('*')
        .eq('lead_id', lead!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as NotaLead[];
    },
    enabled: !!lead?.id && open,
  });

  // Add note
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('notas_lead').insert({
        lead_id: lead!.id,
        conteudo: content,
        autor_id: user?.id,
        autor_nome: userName,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas-lead', lead?.id] });
      setNewNote('');
      toast.success('Nota adicionada!');
    },
    onError: () => toast.error('Erro ao adicionar nota'),
  });

  // Add task
  const addTaskMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tarefas').insert({
        lead_id: lead!.id,
        organization_id: organization?.id,
        titulo: newTaskTitle,
        data_vencimento: newTaskDate || null,
        prioridade: newTaskPriority,
        responsavel_id: user?.id,
        responsavel_nome: userName,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-lead', lead?.id] });
      setNewTaskTitle('');
      setNewTaskDate('');
      setNewTaskPriority('media');
      toast.success('Tarefa criada!');
    },
    onError: () => toast.error('Erro ao criar tarefa'),
  });

  // Complete task
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tarefas')
        .update({ status: 'concluida', data_conclusao: new Date().toISOString() } as any)
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-lead', lead?.id] });
      toast.success('Tarefa concluída!');
    },
  });

  // Update stage
  const updateStageMutation = useMutation({
    mutationFn: async (newStage: string) => {
      const { error } = await supabase
        .from('leads')
        .update({ estagio_pipeline: newStage } as any)
        .eq('id', lead!.id);
      if (error) throw error;
      await supabase.from('atividades_lead').insert({
        lead_id: lead!.id,
        tipo: 'status_alterado',
        titulo: 'Estágio alterado',
        descricao: `Estágio alterado de "${lead!.estagio_pipeline}" para "${newStage}"`,
        usuario_id: user?.id,
        usuario_nome: userName,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      queryClient.invalidateQueries({ queryKey: ['atividades-lead', lead?.id] });
      onUpdateLead?.();
      toast.success('Estágio atualizado!');
    },
  });

  if (!lead) return null;

  const getAtividadeIcon = (tipo: string) => {
    const icons: Record<string, string> = {
      ligacao_realizada: '📞', email_enviado: '✉️', whatsapp_enviado: '💬',
      reuniao: '🤝', visita_agendada: '🏠', proposta_enviada: '📋',
      status_alterado: '🔄', nota: '📝',
    };
    return icons[tipo] || '📌';
  };

  const pendingTasks = tarefas?.filter(t => t.status !== 'concluida' && t.status !== 'cancelada') || [];
  const completedTasks = tarefas?.filter(t => t.status === 'concluida') || [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>{lead.nome}</span>
            <span className={cn('text-sm', getScoreColor(lead.score_qualificacao))}>
              {getScoreIcon(lead.score_qualificacao)} {lead.score_qualificacao}
            </span>
          </DialogTitle>
          <div className="flex items-center gap-2 pt-1">
            <Select value={lead.estagio_pipeline} onValueChange={(v) => updateStageMutation.mutate(v)}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_COLUMNS.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.icone} {col.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="atividades">Atividades</TabsTrigger>
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* Info Tab */}
            <TabsContent value="info" className="p-1 space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Contato</h4>
                <p className="text-sm">{lead.email}</p>
                {lead.telefone && <p className="text-sm">{lead.telefone}</p>}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => window.open(`mailto:${lead.email}`, '_blank')}>
                    <Mail className="h-3 w-3 mr-1" /> Email
                  </Button>
                  {lead.telefone && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/55${lead.telefone!.replace(/\D/g, '')}`, '_blank')}>
                        <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => window.open(`tel:${lead.telefone}`, '_blank')}>
                        <Phone className="h-3 w-3 mr-1" /> Ligar
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Interesse</h4>
                <p className="text-sm">Bairro: {lead.bairro_interesse || 'Não informado'}</p>
                <p className="text-sm">Valor: {formatCurrencyFull(lead.valor_interesse)}</p>
                <p className="text-sm">Interesse: {lead.interesse || 'Não informado'}</p>
                <p className="text-sm">Origem: {lead.origem || 'Formulário'}</p>
                <p className="text-sm">Prazo: {lead.prazo_compra || 'Não informado'}</p>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {lead.tags?.length > 0
                    ? lead.tags.map((tag, i) => <Badge key={i} variant="secondary">{tag}</Badge>)
                    : <span className="text-xs text-muted-foreground">Nenhuma tag</span>}
                </div>
              </div>
            </TabsContent>

            {/* Atividades Tab */}
            <TabsContent value="atividades" className="p-1">
              <div className="space-y-3">
                {atividades?.length ? atividades.map((a) => (
                  <div key={a.id} className="flex gap-3 items-start">
                    <span className="text-lg">{getAtividadeIcon(a.tipo)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.titulo || a.tipo}</p>
                      {a.descricao && <p className="text-xs text-muted-foreground">{a.descricao}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(a.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        {a.usuario_nome && ` • ${a.usuario_nome}`}
                      </p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade registrada</p>
                )}
              </div>
            </TabsContent>

            {/* Tarefas Tab */}
            <TabsContent value="tarefas" className="p-1 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nova tarefa..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  className="w-36"
                />
                <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as PrioridadeTarefa)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  onClick={() => addTaskMutation.mutate()}
                  disabled={!newTaskTitle || addTaskMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {pendingTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Pendentes ({pendingTasks.length})</h4>
                  {pendingTasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 p-2 border rounded">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => completeTaskMutation.mutate(t.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{t.titulo}</p>
                        {t.data_vencimento && (
                          <p className="text-[10px] text-muted-foreground">
                            Vence: {format(new Date(t.data_vencimento), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px]">{t.prioridade}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {completedTasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Concluídas ({completedTasks.length})</h4>
                  {completedTasks.slice(0, 5).map((t) => (
                    <p key={t.id} className="text-xs text-muted-foreground line-through pl-2">{t.titulo}</p>
                  ))}
                </div>
              )}

              {!pendingTasks.length && !completedTasks.length && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa</p>
              )}
            </TabsContent>

            {/* Notas Tab */}
            <TabsContent value="notas" className="p-1 space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Escrever nota..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={() => addNoteMutation.mutate(newNote)}
                  disabled={!newNote || addNoteMutation.isPending}
                  size="sm"
                >
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Nota
                </Button>
              </div>
              <Separator />
              <div className="space-y-3">
                {notas?.length ? notas.map((n) => (
                  <div key={n.id} className="p-3 border rounded space-y-1">
                    <p className="text-sm whitespace-pre-wrap">{n.conteudo}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(n.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      {n.autor_nome && ` • ${n.autor_nome}`}
                    </p>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota</p>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
