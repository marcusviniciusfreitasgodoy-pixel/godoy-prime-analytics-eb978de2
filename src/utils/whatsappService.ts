import { supabase } from "@/integrations/supabase/client";
import { fetchNotificationSettings } from "@/hooks/useNotificationSettings";
import { FichaVisita } from "@/types/visitas";

interface WhatsAppDados {
  nome_visitante: string;
  endereco_imovel: string;
  data_hora: string;
  codigo_imovel?: string;
  link_assinatura?: string;
  link_reagendamento?: string;
  valor_imovel?: string;
  condominio_edificio?: string;
  unidade_imovel?: string;
  nome_corretor?: string;
  nome_proprietario?: string;
  link_feedback?: string;
  link_ficha?: string;
}

type TipoMensagem = 'confirmacao' | 'lembrete' | 'cancelamento' | 'reagendamento' | 'pos_visita';

export async function enviarWhatsApp(
  telefone: string,
  tipo: TipoMensagem,
  dados: WhatsAppDados
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar configurações de notificação
    const settings = await fetchNotificationSettings();
    
    if (settings) {
      const tipoConfig: Partial<Record<TipoMensagem, keyof typeof settings>> = {
        confirmacao: 'whatsapp_confirmacao',
        lembrete: 'whatsapp_lembrete',
        cancelamento: 'whatsapp_cancelamento',
        reagendamento: 'whatsapp_reagendamento',
      };
      
      const configKey = tipoConfig[tipo];
      if (configKey && settings[configKey] === false) {
        console.log(`WhatsApp ${tipo} desativado nas configurações`);
        return { success: true, error: 'Notificação desativada' };
      }
    }

    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { telefone, tipo, dados }
    });

    if (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      return { success: false, error: error.message };
    }

    return { success: data?.success ?? false, error: data?.error };
  } catch (err) {
    console.error('Erro ao chamar função de WhatsApp:', err);
    return { success: false, error: 'Erro ao enviar mensagem' };
  }
}

export async function enviarConfirmacaoAgendamento(
  telefone: string,
  dados: Omit<WhatsAppDados, 'link_reagendamento'> & { agendamentoId?: string }
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = window.location.origin;
  
  return enviarWhatsApp(telefone, 'confirmacao', {
    ...dados,
    link_reagendamento: dados.agendamentoId 
      ? `${baseUrl}/agendar-visita?edit=${dados.agendamentoId}` 
      : undefined,
  });
}

export async function enviarLembreteVisita(
  telefone: string,
  dados: Omit<WhatsAppDados, 'link_assinatura'> & { agendamentoId?: string }
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = window.location.origin;
  
  return enviarWhatsApp(telefone, 'lembrete', {
    ...dados,
    link_reagendamento: dados.agendamentoId 
      ? `${baseUrl}/agendar-visita?edit=${dados.agendamentoId}` 
      : undefined,
  });
}

export async function enviarCancelamentoVisita(
  telefone: string,
  dados: Omit<WhatsAppDados, 'link_assinatura' | 'codigo_imovel'>
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = window.location.origin;
  
  return enviarWhatsApp(telefone, 'cancelamento', {
    ...dados,
    link_reagendamento: `${baseUrl}/agendar-visita`,
  });
}

export async function enviarReagendamentoVisita(
  telefone: string,
  dados: WhatsAppDados & { agendamentoId?: string }
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = window.location.origin;
  
  return enviarWhatsApp(telefone, 'reagendamento', {
    ...dados,
    link_reagendamento: dados.agendamentoId 
      ? `${baseUrl}/agendar-visita?edit=${dados.agendamentoId}` 
      : undefined,
  });
}

// Enviar link de feedback por WhatsApp após visita realizada
export async function enviarSolicitacaoFeedback(
  telefone: string,
  dados: { nome_visitante: string; endereco_imovel: string; codigo_visita: string }
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = window.location.origin;
  const feedbackUrl = `${baseUrl}/visitas/feedback/${dados.codigo_visita}`;
  
  return enviarWhatsApp(telefone, 'confirmacao', {
    nome_visitante: dados.nome_visitante,
    endereco_imovel: dados.endereco_imovel,
    data_hora: new Date().toISOString(),
    link_assinatura: feedbackUrl,
  });
}

// Enviar ficha completa pós-visita por WhatsApp
export async function enviarFichaCompletaPosVisita(
  telefone: string,
  ficha: FichaVisita
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = window.location.origin;

  return enviarWhatsApp(telefone, 'pos_visita', {
    nome_visitante: ficha.nome_visitante,
    endereco_imovel: ficha.endereco_imovel,
    data_hora: ficha.data_visita,
    codigo_imovel: ficha.codigo_imovel || undefined,
    condominio_edificio: ficha.condominio_edificio || undefined,
    unidade_imovel: ficha.unidade_imovel || undefined,
    nome_corretor: ficha.nome_corretor || undefined,
    nome_proprietario: ficha.nome_proprietario || undefined,
    valor_imovel: ficha.valor_imovel ? ficha.valor_imovel.toLocaleString('pt-BR') : undefined,
    link_assinatura: `${baseUrl}/visitas/assinatura/${ficha.codigo}/visitante`,
    link_feedback: `${baseUrl}/visitas/feedback/${ficha.codigo}`,
    link_ficha: `${baseUrl}/visitas/ficha/${ficha.id}`,
  });
}
