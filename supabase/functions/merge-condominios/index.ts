import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Novo formato do CSV: nome,logradouro,numero,bairro
interface CSVCondominio {
  nome: string;
  logradouro: string;
  numero: number | null;
  bairro: string;
}

interface ExistingCondominio {
  id: string;
  nome_condominio: string;
  logradouro_padrao: string;
  numero_inicio: number | null;
}

function parseCSV(csvText: string): CSVCondominio[] {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  console.log("Headers encontrados:", headers);
  
  // Suporta ambos os formatos de CSV
  const isNewFormat = headers.includes('numero');
  
  return lines.slice(1).map((line) => {
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
    
    if (isNewFormat) {
      // Novo formato: nome,logradouro,numero,bairro
      const nomeIdx = headers.indexOf('nome');
      const logradouroIdx = headers.indexOf('logradouro');
      const numeroIdx = headers.indexOf('numero');
      const bairroIdx = headers.indexOf('bairro');
      
      const numeroStr = values[numeroIdx];
      const numero = numeroStr ? parseInt(numeroStr.replace(/\D/g, '')) : null;
      
      return {
        nome: values[nomeIdx] || '',
        logradouro: values[logradouroIdx] || '',
        numero: isNaN(numero!) ? null : numero,
        bairro: values[bairroIdx] || 'Barra da Tijuca',
      } as CSVCondominio;
    } else {
      // Formato antigo: id,nome,rua,bairro,cidade,estado
      return {
        nome: values[headers.indexOf('nome')] || '',
        logradouro: values[headers.indexOf('rua')] || '',
        numero: null,
        bairro: values[headers.indexOf('bairro')] || 'Barra da Tijuca',
      } as CSVCondominio;
    }
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
    // Península
    if (logradouroNorm.includes('flamboyant') || logradouroNorm.includes('jacaranda') ||
        logradouroNorm.includes('bauhíneas') || logradouroNorm.includes('bauhineas') ||
        logradouroNorm.includes('acacias da peninsula') || logradouroNorm.includes('acácias da península') ||
        logradouroNorm.includes('joao cabral de mello')) {
      return 'Península';
    }
    
    // ABM
    if (logradouroNorm.includes('afonso arinos')) {
      return 'ABM';
    }
    
    // Jardim Oceânico
    if (logradouroNorm.includes('olegario maciel') || logradouroNorm.includes('olegário maciel') ||
        logradouroNorm.includes('armando lombardi') || logradouroNorm.includes('gastao senges') ||
        logradouroNorm.includes('gastão senges') || logradouroNorm.includes('evandro lins')) {
      return 'Jardim Oceânico';
    }
    
    // Deck
    if (logradouroNorm.includes('olyntho pillar') || logradouroNorm.includes('heitor doyle')) {
      return 'Deck';
    }
    
    // Blue Land
    if (logradouroNorm.includes('cesar lattes') || logradouroNorm.includes('césar lattes') ||
        logradouroNorm.includes('mario covas') || logradouroNorm.includes('mário covas')) {
      return 'Blue Land';
    }
    
    // Parque das Rosas
    if (logradouroNorm.includes('ricardo marinho') || logradouroNorm.includes('raymundo magalhaes') ||
        logradouroNorm.includes('raymundo magalhães')) {
      return 'Parque das Rosas';
    }
    
    // Marapendi
    if (logradouroNorm.includes('henrique lott') || logradouroNorm.includes('fausto moreira') ||
        logradouroNorm.includes('peregrino junior') || logradouroNorm.includes('peregrino júnior')) {
      return 'Marapendi';
    }
    
    // Centro Metropolitano
    if (logradouroNorm.includes('abelardo bueno') || logradouroNorm.includes('salvador allende') ||
        logradouroNorm.includes('tim lopes')) {
      return 'Centro Metropolitano';
    }
    
    // Ayrton Senna
    if (logradouroNorm.includes('ayrton senna')) {
      return 'Ayrton Senna';
    }
    
    // Orla (Lúcio Costa)
    if (logradouroNorm.includes('lucio costa') || logradouroNorm.includes('lúcio costa')) {
      return 'Orla';
    }
    
    // Américas
    if (logradouroNorm.includes('americas') || logradouroNorm.includes('américas')) {
      return 'Américas';
    }
    
    // Itaúna (Dulcídio Cardoso alto)
    if (logradouroNorm.includes('dulcidio') || logradouroNorm.includes('dulcídio')) {
      return 'Itaúna';
    }
    
    // Barra Sul
    if (logradouroNorm.includes('erico verissimo') || logradouroNorm.includes('érico veríssimo')) {
      return 'Barra Sul';
    }
    
    // Quintas do Rio
    if (logradouroNorm.includes('rachel de queiroz')) {
      return 'Quintas do Rio';
    }
    
    // Ilha Pura
    if (logradouroNorm.includes('ilha pura')) {
      return 'Ilha Pura';
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

    // Buscar condominios existentes com todos os dados necessários
    const { data: existingCondos, error: fetchError } = await supabase
      .from("condominios_mapeamento")
      .select("id, nome_condominio, logradouro_padrao, numero_inicio");

    if (fetchError) {
      throw new Error(`Erro ao buscar existentes: ${fetchError.message}`);
    }

    // Criar mapa de nomes normalizados para dados existentes
    const existingMap = new Map<string, ExistingCondominio>();
    for (const condo of (existingCondos || [])) {
      const normalizedName = normalizeForComparison(condo.nome_condominio);
      existingMap.set(normalizedName, condo);
    }

    console.log(`Condominios existentes: ${existingMap.size}`);

    // Separar em: novos para inserir, existentes para atualizar número
    const novosParaInserir: CSVCondominio[] = [];
    const parasAtualizarNumero: { id: string; numero: number; logradouro?: string }[] = [];
    let duplicadosCompletos = 0;

    for (const csvCondo of condominiosCSV) {
      const normalizedName = normalizeForComparison(csvCondo.nome);
      const existing = existingMap.get(normalizedName);
      
      if (existing) {
        // Já existe - verificar se podemos atualizar o número
        if (existing.numero_inicio === null && csvCondo.numero !== null) {
          // Atualizar número (e logradouro se diferente)
          parasAtualizarNumero.push({
            id: existing.id,
            numero: csvCondo.numero,
            logradouro: csvCondo.logradouro !== existing.logradouro_padrao ? csvCondo.logradouro : undefined
          });
        } else {
          duplicadosCompletos++;
        }
      } else {
        // Novo - inserir
        novosParaInserir.push(csvCondo);
      }
    }

    console.log(`Novos para inserir: ${novosParaInserir.length}`);
    console.log(`Para atualizar número: ${parasAtualizarNumero.length}`);
    console.log(`Duplicados completos: ${duplicadosCompletos}`);

    // 1. Atualizar números nos existentes
    let numerosAtualizados = 0;
    const updateErrors: string[] = [];
    
    for (const update of parasAtualizarNumero) {
      const updateData: { numero_inicio: number; logradouro_padrao?: string } = {
        numero_inicio: update.numero
      };
      if (update.logradouro) {
        updateData.logradouro_padrao = update.logradouro;
      }
      
      const { error: updateError } = await supabase
        .from("condominios_mapeamento")
        .update(updateData)
        .eq("id", update.id);
      
      if (updateError) {
        updateErrors.push(`Update ${update.id}: ${updateError.message}`);
      } else {
        numerosAtualizados++;
      }
    }

    // 2. Inserir novos
    const dataToInsert = novosParaInserir.map(c => ({
      nome_condominio: c.nome,
      logradouro_padrao: c.logradouro,
      microbairro: mapearMicrobairro(c.bairro, c.logradouro),
      numero_inicio: c.numero,
      numero_fim: null,
      latitude: null,
      longitude: null,
    }));

    let inserted = 0;
    const insertErrors: string[] = [];
    const batchSize = 100;

    for (let i = 0; i < dataToInsert.length; i += batchSize) {
      const batch = dataToInsert.slice(i, i + batchSize);
      const { error: insertError, data: insertedData } = await supabase
        .from("condominios_mapeamento")
        .insert(batch)
        .select();

      if (insertError) {
        insertErrors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
        console.error(`Erro no lote ${i / batchSize + 1}:`, insertError);
      } else {
        inserted += insertedData?.length || 0;
        console.log(`Lote ${Math.floor(i / batchSize) + 1} inserido: ${insertedData?.length || 0} registros`);
      }
    }

    const allErrors = [...updateErrors, ...insertErrors];

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_csv: condominiosCSV.length,
          existentes: existingMap.size,
          duplicados: duplicadosCompletos,
          numeros_atualizados: numerosAtualizados,
          novos_inseridos: inserted,
          errors: allErrors.length > 0 ? allErrors : null,
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
