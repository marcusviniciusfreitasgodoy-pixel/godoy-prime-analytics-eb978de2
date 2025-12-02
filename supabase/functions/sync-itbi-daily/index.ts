import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PREFEITURA_API_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/SMF/Mapa_ITBI/MapServer/0/query'

function classifyUso(uso: string | null): 'Residencial' | 'Comercial' {
  if (!uso) return 'Residencial'
  const usoUpper = uso.toUpperCase()
  if (['COMERCIAL', 'LOJA', 'SALA', 'ESCRITORIO', 'GALPAO', 'INDUSTRIAL'].some(t => usoUpper.includes(t))) {
    return 'Comercial'
  }
  return 'Residencial'
}

function classifyTipologia(tipo: string | null): string | null {
  if (!tipo) return null
  const tipoUpper = tipo.toUpperCase()
  if (tipoUpper.includes('APARTAMENTO') || tipoUpper.includes('APTO')) return 'Apartamento'
  if (tipoUpper.includes('CASA')) return 'Casa'
  if (tipoUpper.includes('SALA') || tipoUpper.includes('LOJA')) return 'Sala/Loja'
  if (tipoUpper.includes('TERRENO')) return 'Terreno'
  return tipo
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar dados dos últimos 7 dias
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    
    console.log(`[CRON] Buscando transações desde ${new Date(sevenDaysAgo).toISOString()}`)

    const allRecords: any[] = []
    let offset = 0
    const batchSize = 1000

    // Fetch all pages from API
    while (true) {
      const params = new URLSearchParams({
        where: `DT_ACEITE_ITBI >= ${sevenDaysAgo}`,
        outFields: '*',
        f: 'json',
        resultOffset: offset.toString(),
        resultRecordCount: batchSize.toString(),
        orderByFields: 'DT_ACEITE_ITBI DESC'
      })

      const response = await fetch(`${PREFEITURA_API_URL}?${params}`)
      const data = await response.json()
      const features = data.features || []

      if (features.length === 0) break

      allRecords.push(...features)
      console.log(`[CRON] Obtidos ${features.length} registros (total: ${allRecords.length})`)

      if (features.length < batchSize) break
      offset += batchSize
    }

    console.log(`[CRON] Total da API: ${allRecords.length}`)

    // Transform records
    const validRecords = allRecords
      .map((feature: any) => {
        const attrs = feature.attributes || {}
        
        const valor = attrs.VL_TRANSACAO
        const area = attrs.AREA_M2 || attrs.AREA
        const dataMs = attrs.DT_ACEITE_ITBI
        const logradouro = attrs.LOGRADOURO || attrs.ENDERECO || ''
        const numero = attrs.NUMERO
        const complemento = attrs.COMPLEMENTO
        const bairro = attrs.BAIRRO || ''
        const usoRaw = attrs.USO || attrs.TIPO_USO
        const tipologiaRaw = attrs.TIPOLOGIA || attrs.TIPO_IMOVEL

        if (!valor || !area || !dataMs || valor <= 0 || area <= 0) {
          return null
        }

        const dataTransacao = new Date(dataMs).toISOString().split('T')[0]

        return {
          logradouro: String(logradouro).trim().toUpperCase().substring(0, 500),
          numero: numero ? String(numero).trim().substring(0, 20) : null,
          complemento: complemento ? String(complemento).trim().substring(0, 100) : null,
          bairro: bairro ? String(bairro).trim().toUpperCase().substring(0, 100) : null,
          valor_transacao: Number(valor),
          area_m2: Number(area),
          data_transacao: dataTransacao,
          uso: classifyUso(usoRaw),
          tipologia: classifyTipologia(tipologiaRaw)
        }
      })
      .filter(Boolean)

    console.log(`[CRON] Registros válidos: ${validRecords.length}`)

    if (validRecords.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Nenhum registro novo encontrado',
        found: allRecords.length,
        valid: 0,
        inserted: 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Insert in batches using upsert to avoid duplicates
    let totalInserted = 0
    const insertBatchSize = 500

    for (let i = 0; i < validRecords.length; i += insertBatchSize) {
      const batch = validRecords.slice(i, i + insertBatchSize)
      
      const { data, error } = await supabase
        .from('itbi_transactions')
        .upsert(batch, { 
          onConflict: 'logradouro,numero,data_transacao,valor_transacao',
          ignoreDuplicates: true 
        })
        .select('id')

      if (error) {
        console.error(`[CRON] Erro no lote: ${error.message}`)
      } else {
        totalInserted += data?.length || 0
      }
    }

    console.log(`[CRON] Total inserido: ${totalInserted}`)

    return new Response(JSON.stringify({
      success: true,
      found: allRecords.length,
      valid: validRecords.length,
      inserted: totalInserted,
      timestamp: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[CRON] Erro:', errorMessage)
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
