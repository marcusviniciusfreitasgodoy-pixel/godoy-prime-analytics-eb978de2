import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CSVCondominio {
  nome: string;
  logradouro: string;
  numero: string;
  cep: string;
  bairro: string;
  microbairro: string;
  latitude: string;
  longitude: string;
}

function parseCSV(csvText: string): CSVCondominio[] {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index]?.trim() || '';
    });
    return obj as CSVCondominio;
  });
}

function normalizeForComparison(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, ' ')
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se é admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Acesso negado - apenas admins" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obter CSV do body
    const { csvData } = await req.json();
    
    if (!csvData) {
      return new Response(
        JSON.stringify({ error: "CSV não fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parsear CSV
    const condominiosCSV = parseCSV(csvData);
    console.log(`CSV parseado: ${condominiosCSV.length} registros`);

    // Buscar condominios existentes
    const { data: existingCondos, error: fetchError } = await supabase
      .from("condominios_mapeamento")
      .select("nome_condominio");

    if (fetchError) {
      throw new Error(`Erro ao buscar existentes: ${fetchError.message}`);
    }

    // Criar set de nomes normalizados existentes
    const existingNames = new Set(
      (existingCondos || []).map(c => normalizeForComparison(c.nome_condominio))
    );

    console.log(`Condominios existentes: ${existingNames.size}`);

    // Filtrar apenas novos
    const novosCondominios = condominiosCSV.filter(c => 
      !existingNames.has(normalizeForComparison(c.nome))
    );

    console.log(`Novos para inserir: ${novosCondominios.length}`);

    // Preparar dados para inserção
    const dataToInsert = novosCondominios.map(c => ({
      nome_condominio: c.nome,
      logradouro_padrao: c.logradouro,
      numero_inicio: c.numero ? parseInt(c.numero) : null,
      microbairro: c.microbairro || null,
      latitude: c.latitude ? parseFloat(c.latitude) : null,
      longitude: c.longitude ? parseFloat(c.longitude) : null,
    }));

    // Inserir em lotes de 100
    let inserted = 0;
    let errors: string[] = [];
    const batchSize = 100;

    for (let i = 0; i < dataToInsert.length; i += batchSize) {
      const batch = dataToInsert.slice(i, i + batchSize);
      const { error: insertError, data: insertedData } = await supabase
        .from("condominios_mapeamento")
        .insert(batch)
        .select();

      if (insertError) {
        errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
        console.error(`Erro no lote ${i / batchSize + 1}:`, insertError);
      } else {
        inserted += insertedData?.length || 0;
        console.log(`Lote ${Math.floor(i / batchSize) + 1} inserido: ${insertedData?.length || 0} registros`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_csv: condominiosCSV.length,
          existentes: existingNames.size,
          duplicados: condominiosCSV.length - novosCondominios.length,
          novos_inseridos: inserted,
          errors: errors.length > 0 ? errors : null,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro geral:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
