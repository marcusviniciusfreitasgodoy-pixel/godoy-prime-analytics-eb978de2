import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppRequest {
  telefone: string;
  tipo: 'confirmacao' | 'lembrete' | 'cancelamento' | 'reagendamento' | 'pos_visita';
  dados: {
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
  };
}

// Formatar telefone para o padrão internacional
function formatarTelefone(telefone: string): string {
  // Remove tudo que não é número
  let numero = telefone.replace(/\D/g, '');
  
  // Se começar com 0, remove
  if (numero.startsWith('0')) {
    numero = numero.substring(1);
  }
  
  // Se não tiver código do país, adiciona 55 (Brasil)
  if (!numero.startsWith('55')) {
    numero = '55' + numero;
  }
  
  return numero;
}

// Formatar data/hora para exibição
function formatarDataHora(dataHoraISO: string): string {
  const data = new Date(dataHoraISO);
  const opcoes: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  };
  return data.toLocaleDateString('pt-BR', opcoes);
}

// Templates de mensagem
function gerarMensagem(tipo: WhatsAppRequest['tipo'], dados: WhatsAppRequest['dados']): string {
  const dataFormatada = formatarDataHora(dados.data_hora);
  
  switch (tipo) {
    case 'confirmacao':
      return `✅ *Visita Confirmada!*

Olá *${dados.nome_visitante}*! 👋

Sua visita foi agendada com sucesso!

📍 *Endereço:* ${dados.endereco_imovel}
${dados.codigo_imovel ? `🏠 *Código:* ${dados.codigo_imovel}` : ''}
📅 *Data e Hora:* ${dataFormatada}

${dados.link_assinatura ? `📝 *Link para Assinatura:*\n${dados.link_assinatura}\n` : ''}
${dados.link_reagendamento ? `🔄 *Precisa reagendar?*\n${dados.link_reagendamento}\n` : ''}
⚠️ *Importante:* Caso precise cancelar ou reagendar, favor nos avisar com antecedência.

_Godoy Prime Analytics_
📞 (21) 96407-5124`;

    case 'lembrete':
      return `⏰ *Lembrete de Visita*

Olá *${dados.nome_visitante}*! 👋

Este é um lembrete da sua visita agendada:

📍 *Endereço:* ${dados.endereco_imovel}
${dados.codigo_imovel ? `🏠 *Código:* ${dados.codigo_imovel}` : ''}
📅 *Data e Hora:* ${dataFormatada}

${dados.link_reagendamento ? `🔄 *Precisa reagendar?*\n${dados.link_reagendamento}\n` : ''}
Estamos aguardando você! 😊

_Godoy Prime Analytics_
📞 (21) 96407-5124`;

    case 'cancelamento':
      return `❌ *Visita Cancelada*

Olá *${dados.nome_visitante}*,

Sua visita foi cancelada.

📍 *Endereço:* ${dados.endereco_imovel}
📅 *Data original:* ${dataFormatada}

${dados.link_reagendamento ? `🔄 *Deseja reagendar?*\n${dados.link_reagendamento}\n` : ''}
Entre em contato conosco se precisar de ajuda!

_Godoy Prime Analytics_
📞 (21) 96407-5124`;

    case 'reagendamento':
      return `🔄 *Visita Reagendada!*

Olá *${dados.nome_visitante}*! 👋

Sua visita foi reagendada com sucesso!

📍 *Endereço:* ${dados.endereco_imovel}
${dados.codigo_imovel ? `🏠 *Código:* ${dados.codigo_imovel}` : ''}
📅 *Nova Data e Hora:* ${dataFormatada}

${dados.link_assinatura ? `📝 *Link para Assinatura:*\n${dados.link_assinatura}\n` : ''}
Estamos aguardando você! 😊

_Godoy Prime Analytics_
📞 (21) 96407-5124`;

    case 'pos_visita':
      return `📋 *Ficha de Visita Realizada*

Olá *${dados.nome_visitante}*! 👋

Sua visita foi concluída com sucesso. Seguem os dados registrados:

🏠 *Dados do Imóvel*
📍 *Endereço:* ${dados.endereco_imovel}${dados.condominio_edificio ? `\n🏢 *Condomínio:* ${dados.condominio_edificio}` : ''}${dados.unidade_imovel ? `\n🔢 *Unidade:* ${dados.unidade_imovel}` : ''}${dados.codigo_imovel ? `\n🔑 *Código:* ${dados.codigo_imovel}` : ''}${dados.valor_imovel ? `\n💰 *Valor:* R$ ${dados.valor_imovel}` : ''}${dados.nome_proprietario ? `\n👤 *Proprietário:* ${dados.nome_proprietario}` : ''}

📅 *Data da Visita:* ${dataFormatada}${dados.nome_corretor ? `\n👔 *Corretor:* ${dados.nome_corretor}` : ''}

${dados.link_assinatura ? `📝 *Assinatura Digital:*\n${dados.link_assinatura}\n` : ''}
${dados.link_feedback ? `⭐ *Feedback sobre o Imóvel:*\n${dados.link_feedback}\n` : ''}
${dados.link_ficha ? `📋 *Ficha Completa:*\n${dados.link_ficha}\n` : ''}
⚠️ *Importante:* Por favor, analise os dados acima e preencha qualquer informação que esteja faltando acessando os links acima.

_Godoy Prime Analytics_
📞 (21) 96407-5124`;

    default:
      return `Mensagem do Godoy Prime Analytics sobre seu agendamento.`;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== VERIFICAÇÃO DE AUTENTICAÇÃO ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Token de autenticação não fornecido');
      return new Response(
        JSON.stringify({ success: false, error: 'Token de autenticação não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.error('Erro de autenticação:', claimsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuário autenticado:', claimsData.user.email);
    // ========== FIM DA VERIFICAÇÃO ==========

    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
    const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN');

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      console.error('Z-API não configurada');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Z-API não configurada' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { telefone, tipo, dados }: WhatsAppRequest = await req.json();

    if (!telefone || !tipo || !dados) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Parâmetros obrigatórios: telefone, tipo, dados' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const numeroFormatado = formatarTelefone(telefone);
    const mensagem = gerarMensagem(tipo, dados);

    const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

    console.log(`Enviando WhatsApp para ${numeroFormatado} (tipo: ${tipo})`);
    console.log(`Z-API URL: ${zapiUrl}`);
    
    const response = await fetch(zapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ZAPI_CLIENT_TOKEN ? { 'Client-Token': ZAPI_CLIENT_TOKEN } : {}),
      },
      body: JSON.stringify({
        phone: numeroFormatado,
        message: mensagem,
      }),
    });

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error('Evolution API resposta não-JSON:', responseText);
      if (!response.ok) {
        return new Response(
          JSON.stringify({ success: false, error: 'Resposta inválida da Evolution API', details: responseText }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error('Erro Evolution API:', responseData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao enviar mensagem',
          details: responseData 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('WhatsApp enviado com sucesso:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'WhatsApp enviado com sucesso',
        messageId: responseData.key?.id || responseData.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao enviar WhatsApp:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
