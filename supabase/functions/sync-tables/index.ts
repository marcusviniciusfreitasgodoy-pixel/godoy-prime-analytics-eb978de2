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

    // Source project credentials
    const sourceUrl = Deno.env.get('SUPABASE_SOURCE_URL');
    const sourceKey = Deno.env.get('SUPABASE_SOURCE_ANON_KEY');

    // Current project credentials
    const currentUrl = Deno.env.get('SUPABASE_URL');
    const currentServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Source URL set:', !!sourceUrl, 'length:', sourceUrl?.length || 0);
    console.log('Source Key set:', !!sourceKey, 'length:', sourceKey?.length || 0);
    console.log('Current URL set:', !!currentUrl);
    console.log('Service Key set:', !!currentServiceKey);

    if (!sourceUrl || sourceUrl.trim() === '') {
      throw new Error('SUPABASE_SOURCE_URL is not configured or empty');
    }

    if (!sourceKey || sourceKey.trim() === '') {
      throw new Error('SUPABASE_SOURCE_ANON_KEY is not configured or empty');
    }

    if (!currentUrl || !currentServiceKey) {
      throw new Error('Current Supabase credentials not found');
    }

    // Create clients
    const sourceClient = createClient(sourceUrl, sourceKey);
    const currentClient = createClient(currentUrl, currentServiceKey);

    console.log('Fetching data from source project...');

    // Fetch data from source project
    const { data: condominiosData, error: condominiosError } = await sourceClient
      .from('condominios_mapeamento')
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

    // Clear existing data in current project (optional - remove if you want to keep existing data)
    console.log('Clearing existing data...');
    
    const { error: clearCondominiosError } = await currentClient
      .from('condominios_mapeamento')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (clearCondominiosError) {
      console.warn('Warning clearing condominios:', clearCondominiosError);
    }

    const { error: clearWeightsError } = await currentClient
      .from('ia_valuation_weights')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (clearWeightsError) {
      console.warn('Warning clearing weights:', clearWeightsError);
    }

    // Insert data into current project
    console.log('Inserting condominios data...');
    
    if (condominiosData && condominiosData.length > 0) {
      const { error: insertCondominiosError } = await currentClient
        .from('condominios_mapeamento')
        .insert(condominiosData);

      if (insertCondominiosError) {
        console.error('Error inserting condominios:', insertCondominiosError);
        throw new Error(`Failed to insert condominios: ${insertCondominiosError.message}`);
      }
      console.log(`Successfully inserted ${condominiosData.length} condominios`);
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

