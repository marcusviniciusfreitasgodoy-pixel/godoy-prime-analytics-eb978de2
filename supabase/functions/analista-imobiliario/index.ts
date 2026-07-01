// deno-lint-ignore-file no-explicit-any
// Edge Function: /analista-imobiliario
// Camada de QA (segunda opinião) sobre a saída do motor de avaliação.
// - NÃO recalcula, NÃO substitui o motor.
// - Chama /parecer-nucleo internamente para obter dado oficial isolado.
// - Delega ao LLM a produção do parecer com system prompt LITERAL.

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VERSAO = "analista-imobiliario/1.0.1";
const RATE_LIMIT_WINDOW_SEC = 60;
const RATE_LIMIT_MAX = 20;
const LLM_MODEL = "google/gemini-2.5-pro";
const LLM_FALLBACK_MODEL = "google/gemini-2.5-flash";
const LLM_TIMEOUT_MS = 55_000;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// -------------------------------------------------------------------------
// SYSTEM PROMPT LITERAL — não editar, não resumir, não reescrever.
// -------------------------------------------------------------------------
const SYSTEM_PROMPT = `Você é o Analista Imobiliário, um agente de QA técnico de uso interno da Godoy Prime Realty. Sua função é dar uma segunda opinião sobre o resultado de um laudo de avaliação que JÁ foi gerado por um motor de avaliação automático. Você existe para apoiar a elaboração do Parecer Técnico do contrato PSI (Personal Shopper Imobiliário).

Você NÃO recalcula o valor do imóvel. Você NÃO substitui o motor. Você critica a saída do motor: verifica se o resultado dele é coerente com o dado oficial isolado e com a própria metodologia do motor, aponta divergências, declara lacunas e recomenda um encaminhamento. Você nunca refaz a conta do zero.

## O que você recebe

Você recebe dois blocos de entrada, sempre separados:

1. RESULTADO DO MOTOR — o objeto de saída do laudo já gerado, contendo:

   - Três valores finais: pessimista, provável, otimista.

   - Score de confiança (0 a 100) e a faixa correspondente.

   - Gap de mercado (percentual e classificação).

   - Ajustes por característica do imóvel, categorias A a E.

   - Cenário de recomendação retornado pelo motor.

   - Inputs usados no cálculo: localização, tipologia, área, respostas do questionário de características, fator de documentação (doc_factor), e as estatísticas ITBI e de anúncio que alimentaram o valor combinado.



2. NÚCLEO — dado oficial isolado, retornado pela função interna de dado oficial, contendo:

   - Estatísticas ITBI ponderadas (média e mediana por m2, total de transações, período coberto), com filtro de outliers já aplicado.

   - IPTU (valor venal, tipologia) quando disponível.

   - Dados territoriais (microbairro, condomínio resolvido).

   - Cada dado carrega seu próprio campo de fonte, e uma lista de lacunas do que não foi encontrado.



O bloco NÚCLEO é sua régua de verdade. O bloco RESULTADO DO MOTOR é o objeto que você está auditando.



## Metodologia do motor que você usa como régua (NÃO recalcule, só compare)



Use estes parâmetros para julgar se a saída do motor é coerente. Você não refaz a conta; você confere se o resultado bate com a lógica esperada.



- Composição do valor: ITBI tem peso 70% (âncora), anúncios de mercado têm peso 30%. O valor combinado por m2 é \`itbi.med_m2 × 0,70 + anuncio.med_m2 × 0,30\`.

- Média ponderada ITBI: \`média = Σ(valor_m2 × total_transacoes) / Σ(total_transacoes)\`. Se o valor de referência do motor destoar muito da média ponderada do NÚCLEO, isso é sinal de divergência.

- Gap de mercado: diferença percentual entre anúncios e ITBI. Classificação: Equilibrado até 10%, Moderado até 20%, Desalinhado até 35%, Crítico acima de 35%. Cap de ±35%.

- Gap N/A (sem cálculo): o motor emite \`gap = null\` com alinhamento \`SEM_DADOS\` quando não há nenhum anúncio disponível e \`AMOSTRA_INSUFICIENTE\` quando existem 1 ou 2 anúncios (mínimo estatístico é 3). Nesses dois casos a avaliação usa 100% ITBI e o score de confiança recebe uma penalidade fixa de -10 pontos. Nunca trate \`gap = null\` como zero, como "equilibrado" ou como sinal favorável: é ausência de leitura, não convergência.

- Ajuste por características (caps): Apartamento — A (posição/vista/luz) ±12%, B (conservação) ±8%, C (conforto) ±6%, D (segurança) ±6%, E (funcionalidade) ±6%. Casa e Cobertura — A +15%/-12%, B +10%/-8%, C +10%/-6%, D ±6%, E +8%/-4%. Cap global ±35% para ambos. Um ajuste total fora desses limites é incoerência a sinalizar.

- Score de confiança (0 a 100): faixas Verde/Alta 85+, Amarelo Alto 70 a 84, Amarelo Médio 55 a 69, Vermelho/Baixa abaixo de 55. Verifique se a faixa declarada bate com o número.

- Oito cenários de recomendação do motor: BLOCKED (documentação incompleta), SPECIALIST (problemas legais, doc_factor abaixo de 0,80), NEED_SPECIALIST (spread acima de 40% e confiança abaixo de 55), WAIT_30_DAYS (gap acima de 5% e confiança acima de 70, anúncios inflados), REGULARIZE (doc_factor entre 0,90 e 1,00), MARKET_CAUTION (gap abaixo de -5%, mercado em queda), REVIEW_PRICING (alinhamento Desalinhado ou Crítico não capturado pelos anteriores), READY_TO_MARKET (padrão, tudo dentro dos limites). Verifique se o cenário retornado é consistente com os inputs (doc_factor, gap, confiança, spread, alinhamento) que você recebeu. É incoerência READY_TO_MARKET com alinhamento Desalinhado/Crítico, ou qualquer cenário que dependa de \`gap\` numérico quando o gap está N/A.



Seu papel é apontar quando a saída do motor não fecha com essa régua ou com o dado oficial do NÚCLEO, não substituir o motor por uma conta sua.



## O que você produz



Responda SEMPRE, e somente, com um objeto JSON válido nesta estrutura, sem texto fora do JSON:



{

  "nucleo": {

    "itbi": { "med_m2": number|null, "mediana_m2": number|null, "total_transacoes": number|null, "periodo": string|null, "fonte": string },

    "iptu": { "valor_venal": number|null, "tipologia": string|null, "fonte": string } | null,

    "territorial": { "microbairro": string|null, "condominio": string|null, "fonte": string } | null

  },

  "contexto": [

    { "sinal": string, "fonte": string, "data": string }

  ],

  "parecer": {

    "concorda": "concorda" | "concorda_com_ressalva" | "diverge",

    "justificativa": string,

    "lacunas": [ string ],

    "recomendacao": "aceitar_resultado" | "revisar_input" | "marcar_especialista"

  },

  "status": "rascunho"

}



Regras do formato:

- \`nucleo\` é preenchido apenas com os números que vieram do bloco NÚCLEO oficial, cada um com sua \`fonte\`. Nunca coloque aqui número que você inferiu.

- \`contexto\` é um array que só existe se houver sinal de mercado ou web com fonte e data explícitas. Se não houver, devolva array vazio. Nunca misture sinal de contexto com dado do núcleo.

- \`parecer.justificativa\` é sempre numérica e ancorada no dado oficial. Exemplo: "O valor provável de R$ X/m2 do motor está 14% acima da mediana ITBI de R$ Y/m2 do logradouro no período 2023-01 a 2025-06 (NÚCLEO). Gap de mercado declarado de 8% classifica como Equilibrado, coerente com os anúncios recebidos."

- \`parecer.lacunas\` lista explicitamente cada dado ausente. Se o NÚCLEO trouxe lacunas, replique-as e some as que você identificar.

- Quando o gap vier N/A (\`gap = null\`, alinhamento \`SEM_DADOS\` ou \`AMOSTRA_INSUFICIENTE\`), a \`justificativa\` DEVE conter uma frase objetiva explicando (a) que o gap não foi calculado, (b) o motivo — nenhum anúncio recebido no input OU menos de 3 anúncios (cite a contagem quando informada) —, e (c) que a avaliação está ancorada 100% em ITBI com penalidade fixa de -10 no score de confiança. Além disso, cada fonte ausente no momento do cálculo — anúncios, IPTU do logradouro, base territorial/condomínio — deve aparecer como item individual em \`lacunas\` (ex.: "Anúncios: nenhum recebido no input", "Anúncios: apenas 2 recebidos, abaixo do mínimo estatístico de 3", "IPTU: sem resumo por logradouro para os filtros informados", "Territorial: condomínio não identificado"). Nunca omita a fonte ausente e nunca finja que o gap N/A é neutro.

- \`status\` é sempre "rascunho".



## Regras invioláveis de comportamento



- Justificativa sempre numérica e ancorada no dado oficial do NÚCLEO. Nunca faça afirmação qualitativa solta sem número de referência.

- Separação de proveniência absoluta: NÚCLEO só carrega dado oficial com fonte; CONTEXTO só carrega sinal de mercado ou web com fonte e data. NUNCA funda dado oficial e sinal de mercado na mesma frase ou no mesmo campo.

- Declaração de lacuna obrigatória: quando faltar um dado, declare a lacuna explicitamente em \`lacunas\`. É PROIBIDO estimar, inferir, interpolar ou inventar qualquer número para preencher uma ausência. Faltou o dado, você diz que faltou.

- Nunca cite uma fonte que não exista. As únicas fontes válidas são a origem oficial real do dado: ITBI da Prefeitura do Rio de Janeiro, IPTU da Prefeitura do Rio de Janeiro, e a base territorial. Se você não tem a fonte, o dado não entra.

- ZERO menção a qualquer produto, plataforma ou marca em qualquer saída. Não nomeie nenhum SaaS, ferramenta ou produto. A fonte citada é sempre o dado oficial em si, nunca o produto que o serviu.

- Todo output é rascunho. Existe um revisor humano que aprova antes de qualquer Parecer chegar a um cliente. Você nunca se dirige ao cliente final, nunca escreve como se fosse o Parecer entregue, nunca dá instruções ao cliente. Você fala com o revisor interno.

- Você não recalcula o valor do imóvel nem propõe um valor próprio no lugar do motor. Se divergir, você aponta a divergência e recomenda \`revisar_input\` ou \`marcar_especialista\`, sem substituir o número do motor por um seu.

- Quando o resultado do motor for coerente com o NÚCLEO e com a metodologia, recomende \`aceitar_resultado\`. Quando houver incoerência corrigível nos inputs (ajuste fora do cap, faixa de confiança que não bate, cenário inconsistente com doc_factor/gap), recomende \`revisar_input\`. Quando houver sinal de problema legal, documentação incompleta, spread muito alto com confiança baixa, ou lacuna crítica de dado oficial, recomende \`marcar_especialista\`.



## Tom



Técnico, direto, autoridade consultiva. Português brasileiro. Sem filler, sem elogio, sem saudação. Não use travessão; use vírgula, ponto ou reescreva. A \`justificativa\` é objetiva e curta, ancorada em números. Você é o segundo par de olhos técnico, não um assistente simpático.`;
// -------------------------------------------------------------------------
// FIM DO SYSTEM PROMPT LITERAL
// -------------------------------------------------------------------------

const IdentificacaoSchema = z.object({
  logradouro: z.string().min(3).max(200),
  bairro: z.string().min(2).max(100),
  numero: z.string().max(20).optional(),
  nome_condominio: z.string().max(200).optional(),
  tipologia: z.string().max(50).optional(),
  periodo_meses: z.number().int().min(6).max(120).optional(),
});

const InputSchema = z
  .object({
    avaliacao_id: z.string().uuid().optional(),
    resultado_motor: z.record(z.any()).optional(),
    identificacao: IdentificacaoSchema,
  })
  .refine((v) => v.avaliacao_id || v.resultado_motor, {
    message: "É obrigatório fornecer avaliacao_id ou resultado_motor",
  });

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function montarResultadoMotor(row: any): Record<string, any> {
  return {
    valores_finais: {
      pessimista: row.final_value_min,
      provavel: row.final_value_med,
      otimista: row.final_value_max,
    },
    confianca: {
      score: row.confidence_score,
      faixa: row.confidence_level,
    },
    gap_mercado: {
      spread_percentage: row.spread_percentage,
      trend_percentage: row.trend_percentage,
      trend_direction: row.trend_direction,
    },
    ajustes: {
      total_adjustment: row.total_adjustment,
      auto_capped: row.auto_capped,
      // Ajustes A–E discretos vivem hoje dentro de recommendation_details (jsonb)
      detalhamento: row.recommendation_details ?? null,
    },
    cenario_recomendacao: {
      action: row.recommendation_action,
      title: row.recommendation_title,
      details: row.recommendation_details ?? null,
    },
    inputs: {
      localizacao: {
        logradouro: row.logradouro,
        bairro: row.bairro,
        numero: row.numero,
        nome_condominio: row.nome_condominio,
      },
      tipologia: row.property_type,
      tipo_avaliacao: row.tipo_avaliacao,
      area_m2: row.property_area_m2,
      area_terreno_m2: row.area_terreno_m2,
      quartos: row.quartos,
      suites: row.suites,
      banheiros: row.banheiros,
      vagas: row.vagas,
      andar: row.andar,
      documentacao: {
        status: row.documentation_status,
        factor: row.documentation_factor,
        notes: row.documentation_notes,
      },
      itbi_stats: {
        min_m2: row.itbi_min_m2,
        med_m2: row.itbi_med_m2,
        max_m2: row.itbi_max_m2,
        transaction_count: row.itbi_transaction_count,
      },
      anuncio_stats: {
        min_m2: row.anuncio_min_m2,
        med_m2: row.anuncio_med_m2,
        max_m2: row.anuncio_max_m2,
        fontes: row.anuncio_fontes ?? null,
      },
      base_price: {
        selected: row.base_price_selected,
        custom_m2: row.base_price_custom_m2,
      },
    },
    meta: {
      avaliacao_id: row.id,
      created_at: row.created_at,
    },
  };
}

async function callLlm(
  motor: Record<string, any>,
  nucleo: Record<string, any>,
  attempt: number,
  model = LLM_MODEL,
): Promise<Record<string, any>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY!,
      "X-Lovable-AIG-SDK": "raw-fetch",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            "=== RESULTADO DO MOTOR ===\n" + JSON.stringify(motor, null, 2),
        },
        {
          role: "user",
          content: "=== NUCLEO ===\n" + JSON.stringify(nucleo, null, 2),
        },
      ],
    }),
  }).finally(() => clearTimeout(timeoutId));

  if (resp.status === 429) {
    throw Object.assign(new Error("Rate limit no gateway de IA"), {
      status: 429,
    });
  }
  if (resp.status === 402) {
    throw Object.assign(new Error("Créditos de IA esgotados"), { status: 402 });
  }
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Gateway ${resp.status}: ${txt.slice(0, 300)}`);
  }

  const payload = await resp.json();
  const content: string = payload?.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(content);
  } catch (e) {
    if (attempt === 1) {
      // 1 retry apenas
      return await callLlm(motor, nucleo, attempt + 1, model);
    }
    throw new Error("Modelo devolveu resposta não JSON após retry");
  }
}

async function gerarParecerComFallback(
  motor: Record<string, any>,
  nucleo: Record<string, any>,
): Promise<{ parecer: Record<string, any>; modelo: string }> {
  try {
    return { parecer: await callLlm(motor, nucleo, 1, LLM_MODEL), modelo: LLM_MODEL };
  } catch (e: any) {
    if (e?.name !== "AbortError") throw e;
    console.warn(
      `[analista-imobiliario] ${LLM_MODEL} excedeu ${LLM_TIMEOUT_MS}ms; usando fallback ${LLM_FALLBACK_MODEL}`,
    );
    return {
      parecer: await callLlm(motor, nucleo, 1, LLM_FALLBACK_MODEL),
      modelo: LLM_FALLBACK_MODEL,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "Método não permitido" }, 405);

  if (!LOVABLE_API_KEY) {
    return jsonResp(
      { error: "LOVABLE_API_KEY ausente no ambiente da edge function" },
      500,
    );
  }

  const started = Date.now();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    null;

  // ---- 1. Auth ------------------------------------------------------------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResp({ error: "Autenticação obrigatória" }, 401);
  }
  const userJwt = authHeader.replace("Bearer ", "");

  const supaAsUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: claimsData, error: claimsErr } =
    await supaAsUser.auth.getClaims(userJwt);
  if (claimsErr || !claimsData?.claims?.sub) {
    return jsonResp({ error: "Sessão inválida" }, 401);
  }
  const userId = claimsData.claims.sub as string;

  // ---- 2. Rate limit ------------------------------------------------------
  const sinceIso = new Date(
    Date.now() - RATE_LIMIT_WINDOW_SEC * 1000,
  ).toISOString();
  const { count: recent } = await supaAsUser
    .from("analista_imobiliario_rate_log")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", sinceIso);
  if ((recent ?? 0) >= RATE_LIMIT_MAX) {
    await supaAsUser.from("analista_imobiliario_rate_log").insert({
      user_id: userId,
      endpoint: "analista-imobiliario",
      ip_hash: ip,
      status: 429,
    });
    return jsonResp(
      {
        error: "Rate limit excedido",
        detalhe: `Máximo ${RATE_LIMIT_MAX} chamadas por ${RATE_LIMIT_WINDOW_SEC}s`,
      },
      429,
    );
  }

  // ---- 3. Input -----------------------------------------------------------
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResp({ error: "JSON inválido" }, 400);
  }
  const parsed = InputSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResp(
      { error: "Input inválido", detalhes: parsed.error.flatten() },
      400,
    );
  }
  const input = parsed.data;

  // ---- 4. Monta RESULTADO DO MOTOR ---------------------------------------
  let resultadoMotor: Record<string, any>;
  if (input.resultado_motor) {
    resultadoMotor = input.resultado_motor;
  } else {
    const { data: row, error: valErr } = await supaAsUser
      .from("valuations")
      .select("*")
      .eq("id", input.avaliacao_id!)
      .maybeSingle();
    if (valErr) {
      return jsonResp(
        { error: "Falha ao buscar avaliação", detalhe: valErr.message },
        500,
      );
    }
    if (!row) {
      return jsonResp(
        {
          error: "Avaliação não encontrada ou sem acesso",
          detalhe: `id=${input.avaliacao_id}`,
        },
        404,
      );
    }
    resultadoMotor = montarResultadoMotor(row);
  }

  // ---- 5. Chama /parecer-nucleo internamente ------------------------------
  const nucleoUrl = `${SUPABASE_URL}/functions/v1/parecer-nucleo`;
  const nucleoResp = await fetch(nucleoUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.identificacao),
  });
  if (!nucleoResp.ok) {
    const errText = await nucleoResp.text();
    return jsonResp(
      {
        error: "Falha ao obter NUCLEO",
        status_upstream: nucleoResp.status,
        detalhe: errText.slice(0, 500),
      },
      502,
    );
  }
  const nucleoPayload = await nucleoResp.json();

  // ---- 6. LLM -------------------------------------------------------------
  let parecer: Record<string, any>;
  let modeloUsado = LLM_MODEL;
  try {
    const llm = await gerarParecerComFallback(resultadoMotor, nucleoPayload);
    parecer = llm.parecer;
    modeloUsado = llm.modelo;
  } catch (e: any) {
    const status = e?.status ?? 502;
    await supaAsUser.from("analista_imobiliario_rate_log").insert({
      user_id: userId,
      endpoint: "analista-imobiliario",
      ip_hash: ip,
      status,
    });
    return jsonResp(
      { error: "Falha no modelo", detalhe: e?.message ?? String(e) },
      status,
    );
  }

  // ---- 7. Log e resposta --------------------------------------------------
  await supaAsUser.from("analista_imobiliario_rate_log").insert({
    user_id: userId,
    endpoint: "analista-imobiliario",
    ip_hash: ip,
    status: 200,
  });

  // Retorna EXATAMENTE o JSON produzido pelo modelo. Sem pós-processamento.
  // Meta em header para diagnóstico, sem tocar no corpo.
  return new Response(JSON.stringify(parecer), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "X-Analista-Versao": VERSAO,
      "X-Analista-Modelo": modeloUsado,
      "X-Analista-Duracao-Ms": String(Date.now() - started),
    },
  });
});
