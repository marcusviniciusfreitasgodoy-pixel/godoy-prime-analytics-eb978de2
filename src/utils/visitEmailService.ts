import { supabase } from "@/integrations/supabase/client";

interface VisitEmailData {
  nome_visitante: string;
  telefone_visitante?: string;
  email_visitante?: string;
  endereco_imovel: string;
  data_hora?: string;
  nome_corretor?: string;
  codigo_visita?: string;
  feedback_url?: string;
}

type EmailType = "agendamento_confirmado" | "visita_realizada" | "lembrete_visita";

export async function sendVisitEmail(
  type: EmailType,
  to: string,
  data: VisitEmailData,
  sendToAgency: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: result, error } = await supabase.functions.invoke("send-visit-email", {
      body: {
        type,
        to,
        data,
        sendToAgency,
      },
    });

    if (error) {
      console.error("Error sending visit email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error invoking send-visit-email function:", err);
    return { success: false, error: err.message };
  }
}

// Função para enviar email de confirmação de agendamento
export async function sendAgendamentoConfirmadoEmail(
  email: string,
  data: {
    nome_visitante: string;
    telefone_visitante?: string;
    endereco_imovel: string;
    data_hora: string;
    nome_corretor?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return sendVisitEmail("agendamento_confirmado", email, {
    ...data,
    email_visitante: email,
  });
}

// Função para enviar email com link de feedback após visita realizada
export async function sendFeedbackRequestEmail(
  email: string,
  data: {
    nome_visitante: string;
    endereco_imovel: string;
    codigo_visita: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const feedbackUrl = `${window.location.origin}/visitas/feedback/${data.codigo_visita}`;
  
  return sendVisitEmail(
    "visita_realizada",
    email,
    {
      ...data,
      feedback_url: feedbackUrl,
    },
    false // Não envia para a agência neste caso
  );
}

// Função para enviar lembrete de visita
export async function sendLembreteVisitaEmail(
  email: string,
  data: {
    nome_visitante: string;
    endereco_imovel: string;
    data_hora: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return sendVisitEmail("lembrete_visita", email, data, false);
}
