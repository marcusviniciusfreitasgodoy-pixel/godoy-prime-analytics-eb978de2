import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportProductOnePagerPDF } from "@/utils/productOnePagerPdfExport";

interface TractionMetrics {
  totalTransacoes: number;
  bairrosMapeados: number;
  avaliacoes: number;
  usuarios: number;
}

const formatNumber = (n: number) => n.toLocaleString("pt-BR");

export default function OnePagerPreview() {
  const [metrics, setMetrics] = useState<TractionMetrics | null>(null);
  const [companyName, setCompanyName] = useState("GODOY PRIME ANALYTICS");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [bairroRes, valRes, usersRes, settingsRes] = await Promise.all([
        supabase.from("bairros_cache").select("bairro, total_transacoes"),
        supabase.from("valuations").select("id"),
        supabase.from("profiles").select("id"),
        supabase.from("company_settings").select("setting_key, setting_value")]
        );
        const bairros = bairroRes.data ?? [];
        const totalTx = bairros.reduce((s, r) => s + (r.total_transacoes ?? 0), 0);
        setMetrics({
          totalTransacoes: totalTx,
          bairrosMapeados: bairros.length,
          avaliacoes: valRes.data?.length ?? 0,
          usuarios: usersRes.data?.length ?? 0
        });
        const nameRow = settingsRes.data?.find((r) => r.setting_key === "company_name");
        if (nameRow?.setting_value) setCompanyName(nameRow.setting_value);
      } catch {
        setMetrics({ totalTransacoes: 0, bairrosMapeados: 0, avaliacoes: 0, usuarios: 0 });
      }
    }
    load();
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await exportProductOnePagerPDF();
    } finally {
      setDownloading(false);
    }
  };

  const dateStr = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  const modules = [
  { title: "Motor de Avaliação", dor: "Precificação por \"achismo\" sem base em dados reais", beneficio: "Laudo em 5 min com 3 cenários + dados IPTU (imóveis, preço real, venal vs real)" },
  { title: "Inteligência Territorial", dor: "Sem visão geoespacial, prospecção por experiência pessoal", beneficio: "Mapa 1.567 condomínios, ficha com torres/histórico ITBI, ranking por logradouro" },
  { title: "Gestão de Clientes e Funil", dor: "Contatos perdidos em WhatsApp, sem acompanhamento estruturado", beneficio: "Quadro 8 estágios, conversão rastreável, notificações automáticas" },
  { title: "Sofia IA", dor: "Horas pesquisando dados dispersos em múltiplas fontes", beneficio: "Resposta contextual instantânea com base em dados ITBI oficiais" }];

  const diferenciais = [
  { title: "Dados Oficiais ITBI", desc: "Transações reais da prefeitura, não anúncios inflados" },
  { title: "Mapeamento Geoespacial", desc: "1.567 condomínios, 52.761 edificações e 485 logradouros IPTU" },
  { title: "Resultado em 5 Minutos", desc: "Da busca ao laudo profissional em PDF pronto para apresentação" },
  { title: "Multiorganização Segura", desc: "Isolamento total de dados por organização, segurança corporativa" }];

  const detailedModules = [
  { title: "Painel Analítico", dor: "Sem visão consolidada do mercado, decisões às cegas", entrega: "4 KPIs em tempo real, gráficos de 60 meses, exportação PDF/Excel" },
  { title: "Microrregiões", dor: "Barra tratada como região única, ignorando variações de R$/m²", entrega: "Classificação e evolução por sub-região com dados ITBI segmentados" },
  { title: "Gestão de Visitas", dor: "Agendamento por WhatsApp, fichas em papel, sem controle", entrega: "Fichas digitais com assinatura eletrônica, selo de proximidade\nFeedback instantâneo" },
  { title: "Propostas Digitais", dor: "Propostas informais sem validade jurídica ou rastreio", entrega: "Modelos simplificado/completo com aceite eletrônico e PDF" },
  { title: "Estratégia de Precificação", dor: "Preço de anúncio definido sem metodologia, sem plano B", entrega: "Diagnóstico 9 perguntas, 3 faixas (Atração/Mercado/Premium)\nLaudo de Avaliação e Vistoria" },
  { title: "Pesquisa de Mercado", dor: "Sem acesso a dados reais de transações por localização e tipologia", entrega: "Dados ITBI + unidades IPTU, valor venal vs preço real pago, variação geocodificada" },
  { title: "Inteligência Territorial", dor: "Sem visão geoespacial dos condomínios para prospecção", entrega: "Mapa 1.567 condomínios, ficha com torres/histórico ITBI, ranking por logradouro, painel admin" },
  { title: "Agendamento de Visitas", dor: "Cliente depende do corretor para agendar, processo lento por WhatsApp", entrega: "Agendamento automático pelo cliente com disponibilidade online e confirmação instantânea" },
  { title: "Análise de Documentação IA", dor: "Revisão manual de documentos consome horas e gera erros", entrega: "Upload de imagem/PDF com análise automática por IA, extração de campos e alertas" },
  { title: "Documentação Comprador/Vendedor", dor: "Sem controle dos documentos necessários, esquecimentos geram atrasos", entrega: "Lista de verificação completa para comprador e vendedor com progresso rastreável" },
  { title: "Gestão de Leads e CRM", dor: "Contatos dispersos em WhatsApp, sem funil estruturado", entrega: "Quadro de 8 estágios, captura de contatos, acompanhamento e notificações automáticas" },
  { title: "Feedback Analítico", dor: "Sem retorno estruturado das visitas, insights perdidos", entrega: "Dashboard métricas, comparativo cliente×corretor, ranking de corretores, exportação PDF" },
  { title: "Avaliação Pública (Captação)", dor: "Sem canal de captação passiva de compradores", entrega: "Página pública com avaliação gratuita, geração de leads e notificações duais" },
  { title: "Calibradores e Personalização", dor: "Pesos fixos, formulários genéricos, sem marca própria", entrega: "Ajuste de 30+ variáveis, formulários configuráveis, branding white-label com logo" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Download button */}
      <div className="flex justify-end">
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="gap-2 bg-[hsl(212,62%,15%)] text-white hover:bg-[hsl(212,62%,22%)]">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Baixar PDF
        </Button>
      </div>

      {/* ═══ PAGE 1 ═══ */}
      <div className="bg-white rounded-lg shadow-xl overflow-hidden border" style={{ aspectRatio: "210 / 297" }}>
        <div className="h-full flex flex-col text-[11px] leading-snug">
          {/* Header */}
          <div className="bg-[#0C2340] text-white text-center py-4 px-6 relative">
            <h2 className="text-lg font-bold tracking-wide">{companyName}</h2>
            <p className="text-[#D4AF37] text-xs mt-0.5">Inteligência Imobiliária Premium</p>
            <div className="w-40 mx-auto mt-1.5 border-t border-[#D4AF37]" />
            <p className="text-[10px] text-gray-400 mt-1">{dateFormatted}</p>
          </div>

          <div className="flex-1 px-5 py-3 space-y-3 overflow-hidden">
            {/* O Mercado */}
            <div className="bg-[#122D4E] rounded-md p-3 flex gap-3">
              <div className="flex-1 text-white">
                <p className="text-[#D4AF37] font-bold text-xs mb-1.5">O MERCADO</p>
                <ul className="space-y-0.5 text-[10px]">
                  <li>{"• Mercado Imobiliário da cidade do Rio de Janeiro na primeira fase."}</li>
                  <li>{"• 1.567 condomínios mapeados com dados geoespaciais completos"}</li>
                  <li>{"• Valor médio por imóvel: > R$ 1M"}</li>
                  <li>{"• Mercado endereçável: 5.000+ corretores ativos na região"}</li>
                </ul>
              </div>
              <div className="bg-[#0A1C34] rounded-md px-3 py-2 text-center min-w-[90px] flex flex-col justify-center">
                <p className="text-[#D4AF37] text-xl font-bold">80.000+</p>
                <p className="text-white text-[9px]">transações ITBI<br />registradas</p>
                <p className="text-[#D4AF37] text-sm font-bold mt-1">5 anos</p>
                <p className="text-white text-[9px]">de histórico</p>
              </div>
            </div>

            {/* Dor do Mercado */}
            <div className="bg-[#FFF8E6] border border-[#DCB450] rounded-md p-3">
              <p className="text-[#966400] font-bold text-xs mb-1">⚠ AS DORES DO MERCADO</p>
              <ul className="space-y-0.5 text-[9px] text-[#966400]">
                <li>• Assimetria de informação: Imobiliárias e corretores precificam com base em anúncios inflados e experiências pessoais e pontuais, não em valores reais.</li>
                <li>• Custo do erro: R$ 100K–300K por transação mal precificada e demora na venda.</li>
                <li>• Operação manual: fichas de visita em papel, controle por WhatsApp, sem rastreabilidade.</li>
                <li>• Dificuldades na obtenção de informações para preenchimento de ferramentas de CRM.</li>
                <li>• Falta de inteligência de mercado: sem dados de tendência de valor de m2 por microbairro e pesquisas de mercado por região e tipologia</li>
                <li>• Falta de critérios e padronização para a realização de avaliações imobiliárias e vistorias de imóveis.</li>
                <li>• Dificuldades com a definição e análise da documentação necessária para realizar uma captação de imóvel e depois uma venda.</li>
                <li>• Percepção negativa do mercado sobre o trabalho das imobiliárias e corretores.</li>
                <li>• Dificuldades de captação de imóveis com gestão exclusiva (Exclusividade)</li>
              </ul>
            </div>

            {/* A Solução */}
            <div>
              <p className="text-[#0C2340] font-bold text-xs mb-0.5">A SOLUÇÃO</p>
              <div className="w-8 border-t-2 border-[#D4AF37] mb-2" />
              <div className="grid grid-cols-2 gap-2">
                {modules.map((m) => <div key={m.title} className="bg-[#F5F7FA] rounded-md p-2">
                    <p className="text-[#0C2340] font-bold text-[10px]">{m.title}</p>
                    <div className="w-full border-t border-[#D4AF37] my-0.5" />
                    <p className="text-red-700 text-[9px]">Dor: {m.dor}</p>
                    <p className="text-green-700 text-[9px] mt-0.5">Benefício: {m.beneficio}</p>
                  </div>)}
              </div>
            </div>

            {/* Diferenciais */}
            <div>
              <p className="text-[#0C2340] font-bold text-xs mb-0.5">DIFERENCIAIS COMPETITIVOS</p>
              <div className="w-14 border-t-2 border-[#D4AF37] mb-2" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {diferenciais.map((d) =>
                <div key={d.title} className="flex items-start gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#D4AF37] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[#0C2340] font-bold text-[10px]">{d.title}</p>
                      <p className="text-gray-500 text-[9px]">{d.desc}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Métricas de Tração */}
            <div className="bg-[#0C2340] rounded-md p-3 text-center">
              <p className="text-[#D4AF37] font-bold text-xs mb-2">MÉTRICAS DE TRAÇÃO</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                { value: metrics ? formatNumber(metrics.totalTransacoes) : "—", label: "Transações ITBI" },
                { value: metrics ? formatNumber(metrics.bairrosMapeados) : "—", label: "Bairros Mapeados" },
                { value: metrics ? formatNumber(metrics.avaliacoes) : "—", label: "Avaliações" },
                { value: metrics ? formatNumber(metrics.usuarios) : "—", label: "Usuários Ativos" }].
                map((m) =>
                <div key={m.label}>
                    <p className="text-[#D4AF37] text-lg font-bold">{m.value}</p>
                    <p className="text-white text-[9px]">{m.label}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PAGE 2 ═══ */}
      <div className="bg-white rounded-lg shadow-xl overflow-hidden border" style={{ aspectRatio: "210 / 297" }}>
        <div className="h-full flex flex-col text-[11px] leading-snug">
          {/* Top bar */}
          <div className="h-2 bg-[#0C2340]" />

          <div className="flex-1 px-5 py-4 space-y-3 overflow-hidden">
            <div>
              <p className="text-[#0C2340] font-bold text-sm">FUNCIONALIDADES DETALHADAS</p>
              <div className="w-16 border-t-2 border-[#D4AF37] mt-0.5 mb-3" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {detailedModules.map((m) =>
              <div key={m.title} className="bg-[#F8F9FC] rounded-md p-3 border border-[#D4AF37]/30">
                  <p className="text-[#0C2340] font-bold text-[11px]">{m.title}</p>
                  <div className="w-full border-t border-[#D4AF37] my-1" />
                  <p className="text-red-700 italic text-[9px]">Dor: {m.dor}</p>
                  <p className="text-green-700 text-[9px] mt-1">Entrega: {m.entrega}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>);
}
