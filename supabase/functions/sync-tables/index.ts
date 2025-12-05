import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting table synchronization...');

    // Current project credentials for auth validation
    const currentUrl = Deno.env.get('SUPABASE_URL');
    const currentServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!currentUrl || !currentServiceKey) {
      throw new Error('Current Supabase credentials not found');
    }

    // Create client for auth validation
    const authClient = createClient(currentUrl, currentServiceKey);

    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Token de autorização não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Invalid token:', userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Verify admin role
    const { data: isAdmin, error: roleError } = await authClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError) {
      console.error('Error checking role:', roleError.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao verificar permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAdmin) {
      console.error('User does not have admin role:', user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Permissão negada. Apenas administradores podem sincronizar dados.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin role verified for user:', user.id);

    // Source project credentials from environment variables
    // This function is already protected by admin role verification above
    const sourceUrl = Deno.env.get('SUPABASE_SOURCE_URL');
    const sourceKey = Deno.env.get('SUPABASE_SOURCE_SERVICE_KEY');

    if (!sourceUrl || !sourceKey) {
      console.error('Missing source project credentials in environment');
      return new Response(
        JSON.stringify({ success: false, error: 'Credenciais do projeto fonte não configuradas. Configure SUPABASE_SOURCE_URL e SUPABASE_SOURCE_SERVICE_KEY.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using source project credentials from environment variables');

    // Create clients
    const sourceClient = createClient(sourceUrl, sourceKey);
    const currentClient = authClient;

    console.log('Fetching data from source project...');

    // Fetch data from source project - note: source table is 'condominios' not 'condominios_mapeamento'
    const { data: condominiosData, error: condominiosError } = await sourceClient
      .from('condominios')
      .select('*');

    if (condominiosError) {
      console.error('Error fetching condominios:', condominiosError);
      throw new Error(`Failed to fetch condominios: ${condominiosError.message}`);
    }

    const { data: weightsData, error: weightsError } = await sourceClient
      .from('ia_valuation_weights')
      .select('*');

    if (weightsError) {
      console.error('Error fetching weights:', weightsError);
      throw new Error(`Failed to fetch weights: ${weightsError.message}`);
    }

    console.log(`Fetched ${condominiosData?.length || 0} condominios and ${weightsData?.length || 0} weights`);

    // Transform condominios data to match destination schema
    const transformedCondominios = condominiosData?.map(cond => ({
      nome_condominio: cond.nome,
      logradouro_padrao: cond.logradouro,
      numero_inicio: cond.numero ? parseInt(cond.numero, 10) : null,
      numero_fim: null,
      microbairro: cond.microbairro || null,
      padrao_construtivo: cond.padrao_construtivo || null,
    })) || [];

    console.log(`Transformed ${transformedCondominios.length} condominios for insertion`);

    // Clear existing data in current project
    console.log('Clearing existing data...');
    
    const { error: clearCondominiosError } = await currentClient
      .from('condominios_mapeamento')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (clearCondominiosError) {
      console.warn('Warning clearing condominios:', clearCondominiosError);
    }

    const { error: clearWeightsError } = await currentClient
      .from('ia_valuation_weights')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (clearWeightsError) {
      console.warn('Warning clearing weights:', clearWeightsError);
    }

    // Insert transformed condominios data
    console.log('Inserting condominios data...');
    
    if (transformedCondominios.length > 0) {
      const { error: insertCondominiosError } = await currentClient
        .from('condominios_mapeamento')
        .insert(transformedCondominios);

      if (insertCondominiosError) {
        console.error('Error inserting condominios:', insertCondominiosError);
        throw new Error(`Failed to insert condominios: ${insertCondominiosError.message}`);
      }
      console.log(`Successfully inserted ${transformedCondominios.length} condominios`);
    }

    console.log('Inserting weights data...');
    
    if (weightsData && weightsData.length > 0) {
      const { error: insertWeightsError } = await currentClient
        .from('ia_valuation_weights')
        .insert(weightsData);

      if (insertWeightsError) {
        console.error('Error inserting weights:', insertWeightsError);
        throw new Error(`Failed to insert weights: ${insertWeightsError.message}`);
      }
      console.log(`Successfully inserted ${weightsData.length} weights`);
    }

    const summary = {
      success: true,
      message: 'Tables synchronized successfully',
      condominios_synced: condominiosData?.length || 0,
      weights_synced: weightsData?.length || 0,
      timestamp: new Date().toISOString(),
    };

    console.log('Synchronization completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in sync-tables function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
