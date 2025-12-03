import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========== VERIFICAÇÃO DE AUTENTICAÇÃO E ROLE ADMIN ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Erro de autenticação:', authError);
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin usando a função has_role
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !isAdmin) {
      console.error('Usuário não é admin:', user.email, roleError);
      return new Response(
        JSON.stringify({ error: 'Acesso negado - requer permissão de administrador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Acesso autorizado para admin:', user.email);
    // ========== FIM DA VERIFICAÇÃO ==========

    if (req.method === 'POST') {
      const { records, clear_existing } = await req.json();
      
      console.log(`Recebidos ${records?.length || 0} registros para importação`);

      if (!records || !Array.isArray(records) || records.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Nenhum registro fornecido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Opcional: limpar dados existentes >= 2020
      if (clear_existing) {
        console.log('Limpando dados existentes >= 2020...');
        const { error: deleteError } = await supabase
          .from('itbi_transactions')
          .delete()
          .gte('data_transacao', '2020-01-01');
        
        if (deleteError) {
          console.error('Erro ao limpar dados:', deleteError);
        } else {
          console.log('Dados antigos removidos');
        }
      }

      // Inserir em lotes de 500
      const batchSize = 500;
      let totalInserted = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        // Remover valor_m2 pois é calculado automaticamente pelo banco
        const cleanBatch = batch.map((record: Record<string, unknown>) => {
          const { valor_m2, ...rest } = record;
          return rest;
        });
        
        const { data, error } = await supabase
          .from('itbi_transactions')
          .insert(cleanBatch)
          .select('id');

        if (error) {
          console.error(`Erro no lote ${i}-${i + batchSize}:`, error.message);
          errors.push(`Lote ${i}: ${error.message}`);
        } else {
          totalInserted += data?.length || 0;
          console.log(`Inseridos ${totalInserted}/${records.length} registros`);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          total_inserted: totalInserted,
          total_received: records.length,
          errors: errors.length > 0 ? errors : undefined
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Método não suportado' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
