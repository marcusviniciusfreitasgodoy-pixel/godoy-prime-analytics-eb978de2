import { ParecerTecnico } from "@/lib/parecer/types";

const LOGO_NAVY_BG = "https://brand-assets-godoyprime.vercel.app/transparencias/Logotipo%20Principal%20Transparente.png";
const LOGO_LIGHT_BG = "https://brand-assets-godoyprime.vercel.app/logo-sem-fundo/Logotipo%20Azul.png";

const EMISSOR = {
  nome: "Marcus Godoy",
  credencial: "Perito Avaliador credenciado pelo TJRJ",
  crecipf: "CRECI PF 80.199",
  crecipj: "CRECI PJ 11.841",
  cnpj: "CNPJ 58.409.058/0001-73",
  empresa: "Godoy Prime Realty",
  nbr: "ABNT NBR 14.653",
};

function fmtDate(iso: string) {
  if (!iso) return "___/___/____";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtBRL(v: string | number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n === 0) return "R$ ______";
  return `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

function Selo({ nivel }: { nivel: string }) {
  if (!nivel) return <span className="p-selo p-selo-baixo">Nao classificado</span>;
  const cls = nivel === "alto" ? "p-selo-alto" : nivel === "medio" ? "p-selo-medio" : "p-selo-baixo";
  return <span className={`p-selo ${cls}`}>Nivel {nivel}</span>;
}

export function ParecerPreview({ data }: { data: ParecerTecnico }) {
  return (
    <div className="parecer-print-root">
      <div className="parecer-doc">
        {/* CAPA */}
        <section className="parecer-cover">
          <div>
            <img src={LOGO_NAVY_BG} alt="Godoy Prime" className="parecer-logo-cover" />
            <div className="p-gold-line" />
            <span className="p-eyebrow">Parecer Tecnico</span>
            <h1>Parecer Tecnico de Avaliacao Mercadologica</h1>
            <p style={{ color: "var(--p-parchment)", marginTop: 24, fontSize: "13pt" }}>
              {data.endereco_imovel || "Endereco do imovel"}
              {data.bairro ? `, ${data.bairro}` : ""}
            </p>
          </div>
          <div>
            <div className="p-gold-line" />
            <p className="p-mono" style={{ color: "var(--p-parchment)" }}>
              REF {data.referencia_documento}
            </p>
            <p className="p-mono" style={{ color: "var(--p-parchment)" }}>
              EMISSAO {fmtDate(data.data_emissao)} | REFERENCIA {fmtDate(data.data_referencia)}
            </p>
            <div style={{ marginTop: 30 }}>
              <p style={{ color: "var(--p-off-white)", fontFamily: "Cormorant Garamond", fontSize: "16pt", fontWeight: 600 }}>
                {EMISSOR.empresa}
              </p>
              <p className="p-mono" style={{ color: "var(--p-gold)" }}>{EMISSOR.credencial}</p>
              <p className="p-mono" style={{ color: "var(--p-parchment)" }}>
                {EMISSOR.crecipf} | {EMISSOR.crecipj} | {EMISSOR.cnpj}
              </p>
              <p className="p-mono" style={{ color: "var(--p-parchment)" }}>{EMISSOR.nbr}</p>
            </div>
          </div>
        </section>

        {/* 1 SUMARIO EXECUTIVO */}
        <section className="parecer-section">
          <img src={LOGO_LIGHT_BG} alt="Godoy Prime" className="parecer-logo-nav" />
          <span className="p-eyebrow">Capitulo 01</span>
          <h2>Sumario Executivo</h2>
          <p>
            Este parecer tecnico consolida a analise mercadologica do imovel situado em {data.endereco_imovel || "endereco a informar"},
            {data.bairro ? ` ${data.bairro},` : ""} conduzida sob autoridade tecnica de {EMISSOR.nome},
            {" "}{EMISSOR.credencial}, com fundamentacao na {EMISSOR.nbr}.
          </p>
          <div className="p-card">
            <span className="p-eyebrow">Objetivo, finalidade e pressupostos</span>
            <p><strong>Objetivo.</strong> {data.objetivo}</p>
            <p><strong>Finalidade.</strong> {data.finalidade}</p>
            <p><strong>Pressupostos.</strong> {data.pressupostos}</p>
          </div>
          <div className="p-navy-card">
            <span className="p-eyebrow" style={{ color: "var(--p-gold)" }}>Valor de mercado apurado</span>
            <div className="p-big-value" style={{ color: "var(--p-off-white)" }}>
              {fmtBRL(data.valor_mercado)}
            </div>
            <p className="p-mono">Valor por m2: {fmtBRL(data.valor_m2_apurado)}</p>
            <p className="p-mono">
              Grau de Fundamentacao {data.grau_fundamentacao || "II"} | Grau de Precisao {data.grau_precisao || "II"}
            </p>
          </div>
          <p>
            O detalhamento tecnico da apuracao, do enquadramento NBR e da estrategia de negociacao encontra-se nas secoes 4, 8 e 9 deste parecer.
          </p>
        </section>

        {/* 2 IDENTIFICACAO */}
        <section className="parecer-section">
          <span className="p-eyebrow">Capitulo 02</span>
          <h2>Identificacao e Caracterizacao do Imovel</h2>
          <p>
            A caracterizacao a seguir foi consolidada a partir de documentacao apresentada e da inspecao presencial realizada pelo perito.
          </p>
          <div className="p-card">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8pt 24pt" }}>
              <div><span className="p-eyebrow">Endereco</span><p className="p-mono">{data.endereco_imovel || "___"}</p></div>
              <div><span className="p-eyebrow">Bairro</span><p className="p-mono">{data.bairro || "___"}</p></div>
              <div><span className="p-eyebrow">Tipologia</span><p className="p-mono">{data.tipologia || "___"}</p></div>
              <div><span className="p-eyebrow">Condominio</span><p className="p-mono">{data.condominio || "___"}</p></div>
              <div><span className="p-eyebrow">Area privativa</span><p className="p-mono">{data.area_privativa || "___"} m2</p></div>
              <div><span className="p-eyebrow">Area total</span><p className="p-mono">{data.area_total || "___"} m2</p></div>
              <div><span className="p-eyebrow">Quartos</span><p className="p-mono">{data.quartos || "___"}</p></div>
              <div><span className="p-eyebrow">Suites</span><p className="p-mono">{data.suites || "___"}</p></div>
              <div><span className="p-eyebrow">Vagas</span><p className="p-mono">{data.vagas || "___"}</p></div>
              <div><span className="p-eyebrow">Ano construcao</span><p className="p-mono">{data.ano_construcao || "___"}</p></div>
              <div style={{ gridColumn: "1 / -1" }}><span className="p-eyebrow">Matricula</span><p className="p-mono">{data.matricula || "___"}</p></div>
            </div>
          </div>
          <p>
            A conjuncao dos atributos declarados posiciona o imovel dentro do segmento tecnico avaliado na secao 4, com aderencia amostral discutida na secao 5.
          </p>
        </section>

        {/* 3 DIAGNOSTICO REGIAO */}
        <section className="parecer-section">
          <span className="p-eyebrow">Capitulo 03</span>
          <h2>Diagnostico da Regiao e do Mercado</h2>
          <p>
            A analise territorial fundamenta o comportamento de precos, a liquidez e o perfil de demanda para a microrregiao de referencia.
          </p>
          <div className="p-card">
            {(data.diagnostico_regiao || "Diagnostico a ser preenchido.").split("\n").filter(Boolean).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <p>
            Os elementos aqui apresentados servem de contexto para a fundamentacao metodologica descrita a seguir.
          </p>
        </section>

        {/* 4 FUNDAMENTACAO */}
        <section className="parecer-section">
          <span className="p-eyebrow">Capitulo 04</span>
          <h2>Fundamentacao de Mercado e Metodologia</h2>
          <p>
            Adotou-se o <strong>Metodo Comparativo Direto de Dados de Mercado (MCDDM)</strong>, em conformidade com a {EMISSOR.nbr}.
          </p>
          <div className="p-card">
            <span className="p-eyebrow">Tipo de tratamento aplicado</span>
            <p className="p-mono">{data.tipo_tratamento || "Tratamento por fatores"}</p>
          </div>
          <div className="p-card">
            {(data.fundamentacao_metodologica || "").split("\n").filter(Boolean).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <p>
            A escolha metodologica respeita os principios de aderencia amostral, tratamento estatistico e transparencia auditavel exigidos pela norma tecnica.
          </p>
        </section>

        {/* 5 AMOSTRA */}
        <section className="parecer-section">
          <span className="p-eyebrow">Capitulo 05</span>
          <h2>Amostra e Comparativos</h2>
          <p>A amostra apresentada foi composta por transacoes reais e oficiais e por ofertas ativas comparaveis.</p>
          <table className="p-table">
            <thead>
              <tr>
                <th>Endereco</th><th>Area</th><th>Valor</th><th>Valor/m2</th><th>Fonte</th><th>Ajuste</th>
              </tr>
            </thead>
            <tbody>
              {(data.comparativos.length ? data.comparativos : [{endereco:"", area:"", valor:"", valor_m2:"", fonte:"", ajuste:""}]).map((c, i) => (
                <tr key={i}>
                  <td>{c.endereco || "___"}</td>
                  <td>{c.area || "___"}</td>
                  <td>{c.valor || "___"}</td>
                  <td>{c.valor_m2 || "___"}</td>
                  <td>{c.fonte || "___"}</td>
                  <td>{c.ajuste || "___"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-card">
            <span className="p-eyebrow">Saneamento e tratamento da amostra</span>
            <p>{data.tratamento_amostra}</p>
          </div>

          {data.anuncios && data.anuncios.length > 0 && (
            <>
              <h3>Amostra de anuncios analisados</h3>
              <p>
                Conjunto de ofertas ativas coletadas para triangulacao de referencia mercadologica, complementar aos comparativos oficiais.
              </p>
              <table className="p-table">
                <thead>
                  <tr>
                    <th>Anuncio</th><th>Valor</th><th>Area (m²)</th><th>Valor/m²</th><th>Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {data.anuncios.map((a, i) => {
                    const m2 = a.valor > 0 && a.area > 0 ? a.valor / a.area : 0;
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{a.valor ? fmtBRL(a.valor) : "___"}</td>
                        <td>{a.area || "___"}</td>
                        <td>{m2 ? fmtBRL(m2) : "___"}</td>
                        <td style={{ wordBreak: "break-all" }}>{a.fonte || "___"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </section>

        {/* 6 VISTORIA */}
        <section className="parecer-section">
          <span className="p-eyebrow">Capitulo 06</span>
          <h2>Vistoria Presencial</h2>
          <p>
            Os elementos desta secao resultam da <strong>inspecao presencial</strong> realizada pelo perito no imovel, e nao de informacoes declaradas por terceiros.
          </p>
          <div className="p-card">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8pt 24pt" }}>
              <div><span className="p-eyebrow">Estado de conservacao</span><p>{data.estado_conservacao || "___"}</p></div>
              <div><span className="p-eyebrow">Padrao de acabamento</span><p>{data.padrao_acabamento || "___"}</p></div>
              <div><span className="p-eyebrow">Vista</span><p>{data.vista || "___"}</p></div>
              <div><span className="p-eyebrow">Posicao solar</span><p>{data.posicao_solar || "___"}</p></div>
              <div style={{ gridColumn: "1 / -1" }}><span className="p-eyebrow">Reformas e benfeitorias</span><p>{data.reformas || "___"}</p></div>
              <div style={{ gridColumn: "1 / -1" }}><span className="p-eyebrow">Observacoes do perito</span>
                {(data.observacoes_perito || "___").split("\n").map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          </div>
          {data.fotos.length > 0 && (
            <>
              <h3>Registro fotografico da inspecao</h3>
              <div className="p-gallery">
                {data.fotos.map((f, i) => (
                  <div key={i} className="p-gallery-item">
                    <img src={f.url} alt={f.legenda || `Foto ${i+1}`} />
                    <div className="legend">{f.legenda || `Registro ${i+1}`}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* 7 RISCOS */}
        <section className="parecer-section">
          <span className="p-eyebrow">Capitulo 07</span>
          <h2>Analise de Riscos da Unidade</h2>
          <p>
            Esta secao sustenta o compromisso tecnico de identificar ao menos um ponto critico concreto do imovel, mapeado em tres eixos.
          </p>

          <div className="p-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Riscos estruturais</h3>
              <Selo nivel={data.nivel_estrutural} />
            </div>
            <p>{data.riscos_estruturais || "A ser preenchido pelo perito."}</p>
          </div>
          <div className="p-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Riscos documentais</h3>
              <Selo nivel={data.nivel_documental} />
            </div>
            <p>{data.riscos_documentais || "A ser preenchido pelo perito."}</p>
          </div>
          <div className="p-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Riscos condominiais</h3>
              <Selo nivel={data.nivel_condominial} />
            </div>
            <p>{data.riscos_condominiais || "A ser preenchido pelo perito."}</p>
          </div>
        </section>

        {/* 8 RESULTADO */}
        <section className="parecer-section">
          <span className="p-eyebrow">Capitulo 08</span>
          <h2>Resultado e Enquadramento Tecnico</h2>
          <p className="p-mono">Autoridade tecnica: {EMISSOR.credencial}.</p>
          <div className="p-navy-card">
            <span className="p-eyebrow" style={{ color: "var(--p-gold)" }}>Valor de mercado</span>
            <div className="p-big-value" style={{ color: "var(--p-off-white)" }}>{fmtBRL(data.valor_mercado)}</div>
            <p className="p-mono">Valor por m2: {fmtBRL(data.valor_m2_apurado)}</p>
            {data.intervalo_valor && <p className="p-mono">Intervalo: {data.intervalo_valor}</p>}
          </div>
          <h3>Enquadramento ABNT NBR 14.653</h3>
          <div className="p-nbr-grid">
            <div className="p-card">
              <span className="p-eyebrow">Grau de Fundamentacao</span>
              <p className="p-mono" style={{ fontSize: "18pt" }}>{data.grau_fundamentacao || "II"}</p>
              <p style={{ fontSize: "9pt" }}>Reflete o rigor da amostra, do tratamento e da documentacao tecnica utilizada.</p>
            </div>
            <div className="p-card">
              <span className="p-eyebrow">Grau de Precisao</span>
              <p className="p-mono" style={{ fontSize: "18pt" }}>{data.grau_precisao || "II"}</p>
              <p style={{ fontSize: "9pt" }}>Reflete a amplitude do intervalo de confianca em torno do valor apurado.</p>
            </div>
            <div className="p-card">
              <span className="p-eyebrow">Metodo</span>
              <p className="p-mono" style={{ fontSize: "10pt" }}>MCDDM</p>
              <p style={{ fontSize: "9pt" }}>Metodo Comparativo Direto de Dados de Mercado, com {data.tipo_tratamento || "tratamento por fatores"}.</p>
            </div>
          </div>
        </section>

        {/* 9 NEGOCIACAO */}
        <section className="parecer-section">
          <span className="p-eyebrow">Capitulo 09</span>
          <h2>Estrategia de Negociacao</h2>
          <div className="p-nbr-grid">
            <div className="p-card">
              <span className="p-eyebrow">Faixa de abertura</span>
              <p className="p-mono" style={{ fontSize: "13pt" }}>{data.faixa_abertura || "___"}</p>
            </div>
            <div className="p-card">
              <span className="p-eyebrow">Valor-alvo</span>
              <p className="p-mono" style={{ fontSize: "13pt" }}>{data.valor_alvo || "___"}</p>
            </div>
            <div className="p-card">
              <span className="p-eyebrow">Piso de negociacao</span>
              <p className="p-mono" style={{ fontSize: "13pt" }}>{data.piso_negociacao || "___"}</p>
            </div>
          </div>
          <h3>Argumentos tecnicos de sustentacao</h3>
          {(data.argumentos.length ? data.argumentos : ["Argumento tecnico a preencher."]).map((a, i) => (
            <div key={i} className="p-card"><p>{a}</p></div>
          ))}
          <h3>Alavancagem para o comprador</h3>
          <div className="p-card">
            {(data.alavancagem || "___").split("\n").map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </section>

        {/* 10 CONCLUSAO */}
        <section className="parecer-section">
          <span className="p-eyebrow">Capitulo 10</span>
          <h2>Conclusao</h2>
          {(data.conclusao || "Conclusao a ser preenchida pelo perito.").split("\n").filter(Boolean).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <div className="p-divider" />
          <p style={{ fontStyle: "italic", color: "var(--p-warm-gray)" }}>
            Este parecer sintetiza os elementos apresentados nos capitulos anteriores e observa integralmente a {EMISSOR.nbr}.
          </p>
        </section>

        {/* 11 RESSALVAS + ASSINATURA */}
        <section className="parecer-section">
          <span className="p-eyebrow">Capitulo 11</span>
          <h2>Ressalvas, Condicoes e Assinatura</h2>
          <div className="p-card">
            <span className="p-eyebrow">Ressalvas e condicoes</span>
            <p>
              Este parecer tecnico de avaliacao mercadologica reflete as condicoes de mercado vigentes na data de referencia indicada e a inspecao presencial realizada pelo perito. As conclusoes tem carater tecnico e nao vinculam o comportamento futuro do mercado. O valor apurado nao constitui promessa de liquidez, nao garante preco de revenda e nao substitui a analise juridica e documental integral do imovel, que deve ser conduzida em due diligence propria. As informacoes prestadas por terceiros e nao verificaveis presencialmente foram assumidas como verdadeiras para fins deste trabalho. Este documento perde validade tecnica caso alteradas as premissas, a documentacao ou as condicoes de mercado consideradas.
            </p>
          </div>
          <div className="p-divider" />
          <div>
            <p className="p-mono">{EMISSOR.empresa}</p>
            <div className="p-sign-line" />
            <p style={{ fontFamily: "Cormorant Garamond", fontSize: "14pt", fontWeight: 600, margin: 0 }}>{EMISSOR.nome}</p>
            <p className="p-mono">{EMISSOR.credencial}</p>
            <p className="p-mono">{EMISSOR.crecipf} | {EMISSOR.crecipj} | {EMISSOR.cnpj}</p>
            <p className="p-mono">Rio de Janeiro, {fmtDate(data.data_emissao)}</p>
          </div>
        </section>
      </div>
      <div className="parecer-print-footer">
        {EMISSOR.empresa} | Parecer Tecnico de Avaliacao Mercadologica | {EMISSOR.crecipj} | {EMISSOR.credencial} | {EMISSOR.nbr}
      </div>
    </div>
  );
}
