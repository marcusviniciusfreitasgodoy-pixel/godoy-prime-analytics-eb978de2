import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: any;
    try {
      const text = await req.text();
      if (!text || text.trim() === "") throw new Error("body vazio");
      body = JSON.parse(text);
    } catch (e: any) {
      console.error("Failed to parse request body:", e.message);
      return new Response(JSON.stringify({ error: "Body inválido: " + e.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { batch } = body;
    if (!batch?.length) throw new Error("batch vazio");

    const prompt = `Você é um especialista em mercado imobiliário do Rio de Janeiro, especificamente da Barra da Tijuca e Recreio dos Bandeirantes. Classifique cada condomínio com base no nome, microbairro e endereço.

Campos a preencher:
- padrao_construtivo: "Ultra Luxo" | "Alto Padrão" | "Médio-Alto Padrão" | "Médio Padrão"
- tipologia_predominante: "Casas" | "Apartamentos" | "Comercial" | "Misto"
- unidades_estimadas: número inteiro estimado de unidades
- numero_torres: número inteiro estimado de torres (1 para casas/comercial)
- confianca: "alta" | "média" | "baixa"

Critérios por microbairro:
- Península, Alambique → tende a Ultra Luxo / Alto Padrão
- Eixo Lúcio Costa → tende a Alto Padrão / Ultra Luxo
- Barra Central → varia entre Ultra Luxo (casas como Alphaville, Malibu, Del Lago) e Alto/Médio-Alto (apartamentos)
- Eixo Américas → Médio-Alto Padrão / Alto Padrão
- Paralela → Médio-Alto Padrão
- Recreio → Médio-Alto Padrão / Alto Padrão

Condomínios para classificar:
${batch.map((c: any, i: number) =>
  `${i + 1}. ID: ${c.id} | Nome: ${c.nome_condominio} | Microbairro: ${c.microbairro} | Logradouro: ${c.logradouro_padrao} | Endereço: ${c.endereco_completo}`
).join("\n")}

Retorne APENAS um JSON válido com o array, sem nenhum texto adicional:
[
  {
    "id": "uuid exato do registro",
    "nome_condominio": "nome exato",
    "padrao_construtivo": "Ultra Luxo|Alto Padrão|Médio-Alto Padrão|Médio Padrão",
    "unidades_estimadas": 0,
    "numero_torres": 0,
    "tipologia_predominante": "Casas|Apartamentos|Comercial|Misto",
    "confianca": "alta|média|baixa"
  }
]`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("JSON não encontrado na resposta");

    const results = JSON.parse(match[0]);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("enrich-condominios-ai error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
