import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CSVCondominio {
  id: string;
  nome: string;
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
}

function parseCSV(csvText: string): CSVCondominio[] {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  console.log("Headers encontrados:", headers);
  
  return lines.slice(1).map((line, index) => {
    // Handle CSV with possible commas in values (though our data shouldn't have them)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    return {
      id: values[headers.indexOf('id')] || '',
      nome: values[headers.indexOf('nome')] || '',
      rua: values[headers.indexOf('rua')] || '',
      bairro: values[headers.indexOf('bairro')] || '',
      cidade: values[headers.indexOf('cidade')] || '',
      estado: values[headers.indexOf('estado')] || '',
    } as CSVCondominio;
  }).filter(c => c.nome && c.nome.length > 0);
}

function normalizeForComparison(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[''`´"]/g, '')          // Remove apóstrofos e aspas
    .replace(/[-_]/g, ' ')            // Substitui hífens e underlines por espaço
    .replace(/\s+/g, ' ')             // Normaliza múltiplos espaços
    .replace(/&/g, 'e')               // Substitui & por e
    .replace(/[^\w\s]/g, '')          // Remove caracteres especiais restantes
    .trim();
}

function mapearMicrobairro(bairro: string, logradouro: string): string | null {
  const bairroNorm = bairro.toLowerCase().trim();
  const logradouroNorm = logradouro.toLowerCase();
  
  // Barra da Tijuca - inferir microbairro pelo logradouro
  if (bairroNorm === 'barra da tijuca') {
    if (logradouroNorm.includes('lucio costa') || logradouroNorm.includes('lúcio costa')) {
      return 'Eixo Lúcio Costa';
    }
    if (logradouroNorm.includes('americas') || logradouroNorm.includes('américas')) {
      return 'Eixo Américas';
    }
    if (logradouroNorm.includes('ayrton senna')) {
      return 'Barra Central';
    }
    if (logradouroNorm.includes('peninsula') || logradouroNorm.includes('península') || 
        logradouroNorm.includes('flamboyant')) {
      return 'Península';
    }
    if (logradouroNorm.includes('dulcidio') || logradouroNorm.includes('dulcídio')) {
      return 'Jardim Oceânico';
    }
    if (logradouroNorm.includes('armando lombardi')) {
      return 'Jardim Oceânico';
    }
    if (logradouroNorm.includes('erico verissimo') || logradouroNorm.includes('érico veríssimo')) {
      return 'Barra Sul';
    }
    if (logradouroNorm.includes('henrique lott') || logradouroNorm.includes('marapendi')) {
      return 'Marapendi';
    }
    if (logradouroNorm.includes('salvador allende')) {
      return 'Ilha Pura';
    }
    if (logradouroNorm.includes('rachel de queiroz')) {
      return 'Quintas do Rio';
    }
    if (logradouroNorm.includes('ricardo marinho')) {
      return 'Parque das Rosas';
    }
    // Default para Barra da Tijuca
    return 'Barra Central';
  }
  
  // Recreio dos Bandeirantes
  if (bairroNorm === 'recreio dos bandeirantes' || bairroNorm === 'recreio') {
    if (logradouroNorm.includes('tim maia')) {
      return 'Recreio - Tim Maia';
    }
    if (logradouroNorm.includes('pontal')) {
      return 'Recreio - Pontal';
    }
    return 'Recreio';
  }
  
  // Barra Olímpica / Centro Metropolitano
  if (bairroNorm === 'barra olímpica' || bairroNorm === 'barra olimpica') {
    return 'Centro Metropolitano';
  }
  
  // Jacarepaguá
  if (bairroNorm === 'jacarepaguá' || bairroNorm === 'jacarepagua') {
    return 'Jacarepaguá';
  }
  
  // Itanhangá
  if (bairroNorm === 'itanhangá' || bairroNorm === 'itanhanga') {
    return 'Itanhangá';
  }
  
  // Vargem Grande / Pequena
  if (bairroNorm.includes('vargem')) {
    return 'Vargem';
  }
  
  // Outros bairros fora da região principal - retornar null
  // (Costa Verde, Angra, outras cidades, etc.)
  return null;
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
    console.log("Primeiros 3 registros:", condominiosCSV.slice(0, 3));

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

    // Filtrar apenas novos (não duplicados)
    const novosCondominios = condominiosCSV.filter(c => 
      !existingNames.has(normalizeForComparison(c.nome))
    );

    console.log(`Novos para inserir: ${novosCondominios.length}`);
    console.log(`Duplicados encontrados: ${condominiosCSV.length - novosCondominios.length}`);

    // Preparar dados para inserção
    const dataToInsert = novosCondominios.map(c => ({
      nome_condominio: c.nome,
      logradouro_padrao: c.rua,
      microbairro: mapearMicrobairro(c.bairro, c.rua),
      numero_inicio: null,
      numero_fim: null,
      latitude: null,
      longitude: null,
    }));

    // Log de alguns exemplos de mapeamento
    console.log("Exemplos de mapeamento de microbairro:", 
      dataToInsert.slice(0, 5).map(d => ({
        nome: d.nome_condominio,
        microbairro: d.microbairro
      }))
    );

    // Inserir em lotes de 100
    let inserted = 0;
    const errors: string[] = [];
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
