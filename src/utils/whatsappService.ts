import { supabase } from "@/integrations/supabase/client";

interface WhatsAppDados {
  nome_visitante: string;
  endereco_imovel: string;
  data_hora: string;
  codigo_imovel?: string;
  link_assinatura?: string;
  link_reagendamento?: string;
}

type TipoMensagem = 'confirmacao' | 'lembrete' | 'cancelamento' | 'reagendamento';

export async function enviarWhatsApp(
  telefone: string,
  tipo: TipoMensagem,
  dados: WhatsAppDados
): Promise<{ success: boolean; error?: string }> {
  try {
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
