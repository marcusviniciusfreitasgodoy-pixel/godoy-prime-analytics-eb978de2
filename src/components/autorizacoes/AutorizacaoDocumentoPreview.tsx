import type { AutorizacaoFormData } from "@/types/autorizacao";

interface Props {
  data: AutorizacaoFormData;
  corretorNome?: string | null;
  corretorCreci?: string | null;
  codigo?: string;
  dataAssinatura?: string | null;
  assinaturaProprietario?: string | null;
  assinaturaCorretor?: string | null;
  cidade?: string;
}

const formatBRL = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

export function AutorizacaoDocumentoPreview({
  data,
  corretorNome,
  corretorCreci,
  codigo,
  dataAssinatura,
  assinaturaProprietario,
  assinaturaCorretor,
  cidade,
}: Props) {
  const hoje = dataAssinatura ? new Date(dataAssinatura) : new Date();
  const dia = String(hoje.getDate()).padStart(2, "0");
  const meses = [
    "janeiro","fevereiro","março","abril","maio","junho",
    "julho","agosto","setembro","outubro","novembro","dezembro",
  ];
  const mes = meses[hoje.getMonth()];
  const ano = hoje.getFullYear();
  const cidadeFmt = cidade || data.cidade || "Rio de Janeiro";

  const cb = (selected: boolean) => (selected ? "☒" : "☐");

  return (
    <div className="bg-white text-[#1a1a2e] mx-auto rounded border border-border shadow-sm p-6 sm:p-10 text-[12px] sm:text-[13px] leading-relaxed font-sans max-w-[820px]">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6 border-b border-[#d4af37] pb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37] font-semibold">
            Godoy Prime Realty
          </div>
          <div className="text-[10px] text-muted-foreground">
            Av. das Américas 10.101, Bloco 2 — Tel: (21) 96407-5124
          </div>
        </div>
        {codigo && (
          <div className="text-right">
            <div className="text-[9px] uppercase text-muted-foreground tracking-wider">Código</div>
            <div className="text-[11px] font-mono font-semibold">{codigo}</div>
          </div>
        )}
      </div>

      <h1 className="text-center font-bold text-[14px] sm:text-[15px] uppercase mb-5 tracking-wide">
        Autorização para Divulgação e Venda de Imóvel
      </h1>

      {/* CONTRATANTES */}
      <h2 className="font-bold text-[12px] uppercase mb-2 border-b border-[#d4af37]/40 pb-1">
        Contratantes
      </h2>
      <div className="space-y-1 mb-4">
        <div><strong>NOME:</strong> {data.proprietario_nome || "—"}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
          <div><strong>IDENTIDADE:</strong> {data.proprietario_rg || "—"}</div>
          <div><strong>ÓRGÃO EMISSOR:</strong> {data.proprietario_rg_orgao || "—"}</div>
          <div><strong>CPF:</strong> {data.proprietario_cpf || "—"}</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          <div><strong>TELEFONES:</strong> {data.proprietario_telefone || "—"}</div>
          <div><strong>E-MAIL:</strong> {data.proprietario_email || "—"}</div>
        </div>
      </div>

      <div className="mb-4">
        <strong>CONTRATADO:</strong> MARCUS V F GODOY ASSESSORIA IMOBILIARIA — CNPJ: 58.409.058/0001-73
      </div>

      {/* DESCRIÇÃO DO IMÓVEL */}
      <h2 className="font-bold text-[12px] uppercase mb-2 border-b border-[#d4af37]/40 pb-1">
        Descrição do Imóvel
      </h2>
      <div className="space-y-1 mb-4">
        <div>
          <strong>ENDEREÇO:</strong>{" "}
          {data.endereco}
          {data.numero ? `, nº ${data.numero}` : ""}
          {data.complemento ? ` — ${data.complemento}` : ""}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
          <div><strong>BAIRRO:</strong> {data.bairro || "—"}</div>
          <div><strong>CIDADE:</strong> {data.cidade || "—"}</div>
          <div><strong>CEP:</strong> {data.cep || "—"}</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
          <div><strong>R$ CONDOMÍNIO:</strong> {formatBRL(data.valor_condominio)}</div>
          <div><strong>R$ IPTU:</strong> {formatBRL(data.valor_iptu)}</div>
          <div><strong>VAGAS:</strong> {data.vagas ?? "—"}</div>
          <div><strong>QUARTOS:</strong> {data.quartos ?? "—"}</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
          <div><strong>VALOR DE AVALIAÇÃO:</strong> {formatBRL(data.valor_avaliacao)}</div>
          <div><strong>VALOR DE VENDA:</strong> {formatBRL(data.valor_venda)}</div>
        </div>
      </div>

      {/* CLÁUSULAS */}
      <h2 className="font-bold text-[12px] uppercase mb-2 border-b border-[#d4af37]/40 pb-1">
        Condições
      </h2>
      <ol className="list-decimal pl-5 space-y-2 text-justify">
        <li>
          A presente Autorização de Venda,{" "}
          <strong>{cb(data.tipo_gestao === "com_exclusiva")} COM GESTÃO EXCLUSIVA</strong>{" "}
          /{" "}
          <strong>{cb(data.tipo_gestao === "sem_exclusiva")} SEM GESTÃO EXCLUSIVA</strong>,
          tem o seu amparo na Lei 6.530, Art. 20, item III, de 12/05/1978 e pela Resolução do COFECI nº 458/95 de 17/11/1995.
        </li>
        <li>
          Entenda-se por <strong>GESTÃO EXCLUSIVA</strong>, a escolha do CONTRATADO, como responsável exclusivo pela
          Representação Comercial do imóvel perante o mercado. A ele caberá centralizar os contatos de possíveis
          interessados (Clientes Diretos ou Corretores), acompanhar todas as visitas realizadas, atender outros Corretores
          interessados em estabelecer parceria comercial para venda do Imóvel e investir na divulgação do imóvel de forma ampla.
        </li>
        <li>
          É concedida esta autorização pelo prazo de <strong>{data.prazo_dias} dias</strong>, a contar desta data, nela também
          está incluída a veiculação de anúncios e fotos do imóvel em todos os meios de publicidade utilizados pelo
          CONTRATADO, prorrogada automaticamente pelo mesmo período, caso, após o término do citado prazo, não ocorra
          manifestação expressa dos CONTRATANTES.
        </li>
        <li>
          Os CONTRATANTES se comprometem a pagar ao CONTRATADO o percentual de{" "}
          <strong>{data.percentual_honorarios}%</strong> sobre o preço de venda efetivamente transacionado, a título de
          honorários de corretagem, que serão pagos no ato da assinatura da escritura de compra e venda.
        </li>
        <li>
          A mesma remuneração será devida pelos CONTRATANTES se, durante a vigência desta autorização o proprietário
          realizar a venda do imóvel sem a ciência e acompanhamento do CONTRATADO ou se após o término do prazo
          estabelecido neste instrumento, eles venham a realizar, por conta própria ou através de terceiros, a venda do imóvel
          objeto da presente autorização, com pretendentes apresentados ou indicados <strong>pelo CONTRATADO</strong>,
          conforme relação nominal que lhes será ou tenha sido entregue, relação essa obtida por meio de registro nas
          respectivas fichas de visita ao imóvel.
        </li>
        <li>
          O CONTRATADO se compromete a não medir esforços no sentido de intermediar a venda do imóvel com base nas
          condições acima descritas, agindo de forma legal, obedecendo fielmente à legislação vigente e o Código de Ética da
          Profissão, estabelecido pelo CONSELHO FEDERAL DE CORRETORES DE IMÓVEIS — COFECI.
        </li>
        <li>
          Os CONTRATANTES se responsabilizam por todas as informações pessoais e de propriedade aqui prestadas acerca
          do imóvel objeto da presente Autorização.
        </li>
        <li>
          Para dirimir eventuais dúvidas ou questões oriundas da presente Autorização, que não possam ser resolvidas de
          comum acordo entre as partes, fica eleito o foro da Comarca do Rio de Janeiro, RJ, com renúncia a qualquer outro,
          por mais privilegiado que seja.
        </li>
      </ol>

      <div className="mt-6 mb-4">
        {cidadeFmt}, {dia} de {mes} de {ano}.
      </div>

      {/* Assinaturas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
        <div className="text-center">
          <div className="border-b border-[#1a1a2e] h-16 flex items-end justify-center">
            {assinaturaProprietario && (
              <img src={assinaturaProprietario} alt="Assinatura" className="max-h-16 object-contain" />
            )}
          </div>
          <div className="text-[11px] mt-1">
            <div><strong>NOME:</strong> {data.proprietario_nome || "____________________"}</div>
            <div><strong>CONTRATANTE(S)</strong></div>
            <div><strong>CPF:</strong> {data.proprietario_cpf || "____________________"}</div>
          </div>
        </div>
        <div className="text-center">
          <div className="border-b border-[#1a1a2e] h-16 flex items-end justify-center">
            {assinaturaCorretor && (
              <img src={assinaturaCorretor} alt="Assinatura corretor" className="max-h-16 object-contain" />
            )}
          </div>
          <div className="text-[11px] mt-1">
            <div><strong>CORRETOR:</strong> {corretorNome || "____________________"}</div>
            <div><strong>CONTRATADO</strong></div>
            <div><strong>CRECI:</strong> {corretorCreci || "____________________"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}