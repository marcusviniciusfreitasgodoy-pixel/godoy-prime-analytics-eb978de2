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
        
        const { data, error } = await supabase
          .from('itbi_transactions')
          .insert(batch)
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
