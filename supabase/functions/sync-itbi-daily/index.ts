import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// API correta - mesma usada no sync-itbi-prefeitura
// Layer 8: Transações por Logradouro e Mês
const PREFEITURA_API_URL = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Fazenda/ITBI/MapServer/8/query'

function classificarUso(uso: string | null): 'Residencial' | 'Comercial' {
  const texto = (uso || '').toLowerCase().trim()
  if (texto.includes('nao residencial') || texto.includes('não residencial') || texto.includes('comercial')) {
    return 'Comercial'
  }
  return 'Residencial'
}

function classificarTipologia(tipologia: string | null): string | null {
  if (!tipologia) return null
  const tipo = tipologia.toLowerCase().trim()
  if (tipo.includes('apartamento') || tipo.includes('apto') || tipo.includes('flat') || tipo.includes('cobertura')) {
    return 'Apartamento'
  } else if (tipo.includes('casa') || tipo.includes('sobrado') || tipo.includes('residencia')) {
    return 'Casa'
  } else if (tipo.includes('terreno') || tipo.includes('lote')) {
    return 'Terreno'
  } else if (tipo.includes('sala') || tipo.includes('loja') || tipo.includes('escritório')) {
    return 'Comercial'
  }
  return 'Apartamento'
}

function extractNumber(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const num = parseFloat(value)
    return isNaN(num) ? null : num
  }
  return null
}

function extractString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Verificação de segurança: validar secret header para cron jobs
  const cronSecret = req.headers.get('x-cron-secret')
  const expectedSecret = Deno.env.get('CRON_SECRET')
  
  if (!expectedSecret || cronSecret !== expectedSecret) {
    console.error('[CRON] Unauthorized: Invalid or missing cron secret')
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Ano e mês atual para filtrar dados recentes
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    
    // Também considerar o mês anterior para pegar dados que podem ter sido inseridos com atraso
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

    console.log(`[CRON] Buscando transações de ${prevYear}-${prevMonth} a ${currentYear}-${currentMonth}`)

    // Buscar dados da API com where=1=1 (filtrar no código)
    const allRecords: any[] = []
    let offset = 0
    const batchSize = 2000

    while (true) {
      const apiUrl = `${PREFEITURA_API_URL}?where=1%3D1&outFields=*&f=json&resultRecordCount=${batchSize}&resultOffset=${offset}`
      
      console.log(`[CRON] Offset ${offset}...`)

      const response = await fetch(apiUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'GodoyPrime/1.0' }
      })
      
      if (!response.ok) {
        console.error(`[CRON] HTTP Error: ${response.status}`)
        break
      }

      const data = await response.json()
      
      if (data.error) {
        console.error('[CRON] API Error:', data.error)
        break
      }

      const features = data.features || []
      
      if (features.length === 0) {
        console.log('[CRON] Fim dos dados')
        break
      }

      // Log de exemplo no primeiro batch
      if (offset === 0 && features[0]) {
        const attrs = features[0].attributes
        console.log('[CRON] Exemplo:', JSON.stringify({
          ano: attrs['ano_transação'],
          mes: attrs['mês_transação'],
          bairro: attrs['bairro'],
          logradouro: attrs['logradouro']
        }))
      }

      allRecords.push(...features)
      console.log(`[CRON] Página: ${features.length} registros (total: ${allRecords.length})`)

      if (features.length < batchSize) break
      offset += batchSize

      // Limite de segurança - para sync diário não precisamos de muitos
      if (offset > 20000) {
        console.log('[CRON] Limite de segurança para sync diário')
        break
      }
    }

    console.log(`[CRON] Total da API: ${allRecords.length}`)

    // Filtrar apenas registros do mês atual ou anterior (dados recentes)
    const recentRecords = allRecords.filter((feature: any) => {
      const attrs = feature.attributes || {}
      const ano = extractNumber(attrs['ano_transação'])
      const mes = extractNumber(attrs['mês_transação'])
      
      if (!ano || !mes) return false
      
      // Aceitar mês atual OU mês anterior
      const isCurrentMonth = ano === currentYear && mes === currentMonth
      const isPrevMonth = ano === prevYear && mes === prevMonth
      
      return isCurrentMonth || isPrevMonth
    })

    console.log(`[CRON] Registros recentes (últimos 2 meses): ${recentRecords.length}`)

    // Transformar registros
    const validRecords = recentRecords
      .map((feature: any) => {
        const attrs = feature.attributes || {}
        
        const valor = extractNumber(attrs['média_valor_transação'])
        const area = extractNumber(attrs['média_área_construída'])
        const ano = extractNumber(attrs['ano_transação'])
        const mes = extractNumber(attrs['mês_transação'])
        const logradouro = extractString(attrs['logradouro'])
        const bairro = extractString(attrs['bairro'])
        const uso = extractString(attrs['uso'])
        const tipologia = extractString(attrs['principais_tipologias'])

        // Validar dados essenciais
        if (!valor || !area || valor <= 0 || area <= 0 || !logradouro) {
          return null
        }

        // Construir data da transação
        let dataTransacao = new Date().toISOString().split('T')[0]
        if (ano && mes) {
          dataTransacao = `${ano}-${String(mes).padStart(2, '0')}-15`
        }

        // NÃO incluir valor_m2 - é coluna gerada automaticamente
        return {
          logradouro: logradouro.toUpperCase().substring(0, 500),
          numero: null,
          complemento: null,
          bairro: bairro ? bairro.trim().toUpperCase().substring(0, 100) : null,
          valor_transacao: Math.round(valor * 100) / 100,
          area_m2: Math.round(area * 100) / 100,
          data_transacao: dataTransacao,
          uso: classificarUso(uso),
          tipologia: classificarTipologia(tipologia)
        }
      })
      .filter(Boolean)

    console.log(`[CRON] Registros válidos: ${validRecords.length}`)

    if (validRecords.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Nenhum registro novo encontrado',
        found: allRecords.length,
        recent: recentRecords.length,
        valid: 0,
        inserted: 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Inserir usando upsert para evitar duplicatas
    let totalInserted = 0
    let errors = 0
    const insertBatchSize = 100

    for (let i = 0; i < validRecords.length; i += insertBatchSize) {
      const batch = validRecords.slice(i, i + insertBatchSize)
      
      // Usar insert simples - duplicatas serão rejeitadas naturalmente
      const { error } = await supabase
        .from('itbi_transactions')
        .insert(batch)

      if (error) {
        // Ignorar erros de duplicata, logar outros
        if (!error.message.includes('duplicate')) {
          console.error(`[CRON] Erro no lote: ${error.message}`)
          errors++
        }
      } else {
        totalInserted += batch.length
      }
    }

    console.log(`[CRON] Total inserido: ${totalInserted}`)

    return new Response(JSON.stringify({
      success: true,
      found: allRecords.length,
      recent: recentRecords.length,
      valid: validRecords.length,
      inserted: totalInserted,
      errors,
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
