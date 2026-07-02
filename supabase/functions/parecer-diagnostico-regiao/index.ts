const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function stripTravessoes(s: string): string {
  return String(s || "")
    .replace(/\s—\s/g, ", ")
    .replace(/—/g, ",")
    .replace(/\s–\s/g, ", ")
    .replace(/–/g, ",")
    .replace(/\s--\s/g, ", ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { endereco, bairro, cidade } = await req.json();

    if (!endereco || !bairro) {
      return new Response(
        JSON.stringify({ error: "endereco e bairro sao obrigatorios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY nao configurada");

    const cidadeFinal = cidade || "Rio de Janeiro";

    const systemPrompt = `Voce e um perito imobiliario brasileiro elaborando a secao "Diagnostico da Regiao" de um Parecer Tecnico de Avaliacao Mercadologica (PTAM), em portugues do Brasil, tom tecnico, descritivo e imparcial.

REGRAS OBRIGATORIAS DE ESTILO:
- NAO utilize travessao em nenhuma forma (nem "—", nem "–", nem "--"). Substitua por ponto, virgula, dois-pontos ou parenteses.
- NAO use as palavras/expressoes: laudo, valorizacao garantida, retorno garantido, lucro certo, investimento sem risco, ITBI, cartorio.
- NAO faca promessas de valorizacao futura, rentabilidade ou liquidez.
- Nao invente dados especificos que voce nao tenha certeza (nomes exatos de escolas, hospitais, restaurantes). Prefira formulacoes genericas ("escolas de rede particular reconhecida", "hospitais gerais de referencia", "polos comerciais lineares") quando nao tiver certeza absoluta.

CONTEUDO OBRIGATORIO (raio aproximado de 1 km do endereco informado):
1. Localizacao e insercao urbana.
2. Acessibilidade: vias arteriais principais e transporte publico (onibus, BRT, metro, trem quando aplicavel).
3. Comercio e servicos do entorno (shoppings, supermercados, farmacias, bancos, academias).
4. Gastronomia.
5. Arte e cultura (centros culturais, cinemas, espacos de eventos).
6. Educacao (escolas de ensino basico e medio, universidades quando aplicavel).
7. Saude (clinicas, prontos-atendimentos, hospitais).
8. Lazer e areas verdes (praias, parques, ciclovias).
9. Perfil socioeconomico do entorno imediato.
10. Paragrafo final com ressalva de que a descricao e qualitativa e nao substitui vistoria de campo, e nao contempla analise especifica de seguranca publica ou intervencoes urbanas em curso.

FORMATO:
- 4 a 6 paragrafos.
- Entre 1500 e 2200 caracteres.
- Texto corrido, sem listas com marcadores, sem markdown, sem titulos.`;

    const userPrompt = `Enderreco do imovel: ${endereco}
Bairro: ${bairro}
Cidade: ${cidadeFinal}

Gere o Diagnostico da Regiao considerando um raio aproximado de 1 km deste endereco.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Muitas requisicoes. Tente novamente em instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (resp.status === 402) {
      return new Response(
        JSON.stringify({ error: "Creditos de IA esgotados. Adicione creditos no workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`AI Gateway falhou (${resp.status}): ${txt.slice(0, 300)}`);
    }

    const json = await resp.json();
    const rawTexto: string = json?.choices?.[0]?.message?.content || "";
    const texto = stripTravessoes(rawTexto).trim();

    return new Response(JSON.stringify({ texto }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
