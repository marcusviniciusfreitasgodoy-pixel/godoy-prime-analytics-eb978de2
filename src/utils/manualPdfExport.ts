import jsPDF from 'jspdf';
import { drawGodoyHeader, drawSectionTitle, BRAND_COLORS, applyFootersToAllPages, fetchCompanyInfoForPDF } from './pdfTemplate';

const manualContent = {
  introducao: {
    titulo: "Introdução",
    texto: "O Godoy Prime Analytics é a plataforma de inteligência imobiliária mais completa do Rio de Janeiro. Feita para corretores, avaliadores e gestores do mercado de alto padrão, oferece análise de dados oficiais de transações da Prefeitura (ITBI), avaliações automatizadas com metodologia própria, vistorias digitais, gestão de visitas com assinatura digital, documentação jurídica, estratégias de precificação e assistência por inteligência artificial. Versão 2.0 - Janeiro 2026."
  },
  modulos: [
    {
      titulo: "1. Painel Principal",
      descricao: "Visão geral do mercado imobiliário com indicadores atualizados baseados em dados oficiais de transações da Prefeitura do Rio de Janeiro.",
      funcionalidades: [
        "Indicadores Principais: Preço médio R$/m², liquidez acumulada, variação anual, região mais valorizada",
        "Separação por Tipo de Imóvel: Apartamentos e Casas com métricas independentes",
        "Gráfico de Evolução: Visualização semestral/anual com indicadores de tendência desde 2020",
        "Evolução por Microregião: Comparativo de valorização entre diferentes regiões",
        "Ranking de Microregiões: Ordenado por R$/m² ou quantidade de transações",
        "Mapa de Transações: Visualização geográfica das transações com filtros",
        "Seletor de Bairro: Filtro global que atualiza todos os gráficos e indicadores",
        "Exportação: Relatórios em PDF (Indicadores + Ranking), planilha Excel, arquivo CSV e cópia de segurança"
      ],
      beneficios: "Permite tomada de decisão rápida baseada em dados oficiais atualizados do mercado."
    },
    {
      titulo: "2. Manual / Treinamento",
      descricao: "Central de aprendizado com treinamento interativo, tutoriais guiados e documentação completa.",
      funcionalidades: [
        "Treinamento em Etapas: 10 módulos explicativos da plataforma com navegação livre",
        "Perguntas Frequentes: Mais de 50 perguntas organizadas em 12 categorias",
        "Busca Inteligente: Encontre respostas rapidamente com filtro",
        "Tutoriais Guiados: Treinamento interativo ativado na primeira visita de cada página",
        "Baixar em PDF: Manual completo, Guia Rápido e Roteiro de Vídeo disponíveis",
        "Vídeos de Treinamento: Acesso a conteúdos explicativos em vídeo"
      ],
      beneficios: "Acelera o aprendizado e reduz tempo de adaptação à plataforma."
    },
    {
      titulo: "3. Microregiões",
      descricao: "Análise detalhada por rua e condomínio com comparativos e tendências.",
      funcionalidades: [
        "Pesquisa por Rua: Busca inteligente com sugestões automáticas baseadas em dados oficiais",
        "Análise de Condomínios: Dados específicos por empreendimento com mapeamento",
        "Separação por Tipo: Casas e Apartamentos com métricas independentes",
        "Comparativo de Ruas: Gráfico comparando até 5 ruas ao mesmo tempo",
        "Gráfico de Evolução: Histórico de preços por rua com linha de tendência",
        "Cartões de Microregião: Estatísticas detalhadas (mediana, média, mínimo, máximo, transações)"
      ],
      beneficios: "Identifica oportunidades em áreas específicas com precisão."
    },
    {
      titulo: "4. Pesquisas de Mercado",
      descricao: "Ferramenta avançada de busca de transações oficiais com diversos filtros.",
      funcionalidades: [
        "Aba Localização: Busca por rua, número ou condomínio específico",
        "Aba Transações: Encontre ruas por faixa de valor (R$ 100 mil a R$ 100 milhões)",
        "Filtros por Período: Intervalo de 6 a 24 meses desde 2020",
        "Filtros por Área: Metragem mínima e máxima em m²",
        "Filtros por Tipo: Apartamentos, Casas ou ambos",
        "Resultados em Tabela: Paginação, ordenação e estatísticas automáticas",
        "Histórico de Pesquisas: Consultas salvas automaticamente",
        "Exportação: Arquivos CSV e Excel com dados completos"
      ],
      beneficios: "Fundamenta avaliações com comparativos de mercado confiáveis e oficiais."
    },
    {
      titulo: "5. Avaliação Imobiliária",
      descricao: "Sistema de avaliação automatizado em 6 etapas com metodologia Godoy Prime e geração de parecer técnico.",
      funcionalidades: [
        "Etapa 0 - Identificação: Dados do proprietário, objetivo (venda/captação) e tipo de imóvel",
        "Etapa 1 - Localização: Endereço com sugestões automáticas e busca de dados oficiais",
        "Etapa 2 - Dados Básicos: Área, quartos, suítes, banheiros, vagas e escolha da base de preço",
        "Etapa 3 - Questionário: 26 características em 5 categorias (Posição, Conservação, Conforto, Segurança, Funcionalidade)",
        "Etapa 4 - Resultados: Valores pessimista, provável e otimista com faixa e nível de confiança",
        "Etapa 5 - Recomendação: Estratégia de precificação personalizada com próximos passos",
        "Análise Histórica: Gráfico de evolução e projeção futura baseada em tendências",
        "PDF Profissional: Laudo completo com metodologia, dados de mercado e gráficos"
      ],
      beneficios: "Produz avaliações profissionais com metodologia consistente e dados oficiais."
    },
    {
      titulo: "6. Histórico de Avaliações",
      descricao: "Consulta, gerenciamento e exportação de todas as avaliações realizadas.",
      funcionalidades: [
        "Lista Completa: Todas as avaliações salvas com data, valores e situação",
        "Filtros: Por período, rua, faixa de valor e nível de confiança",
        "Detalhamento: Visualização completa de cada avaliação em janela",
        "Edição: Reabra avaliações para atualização de dados",
        "Seleção de Várias: Selecione várias avaliações para ações em lote",
        "Regeneração de PDF: Gere novos laudos a qualquer momento",
        "Exportação: Lista em Excel/CSV para análise externa",
        "Integração: Acesse vistoria ou estratégia de precificação diretamente"
      ],
      beneficios: "Mantém histórico organizado para consulta, atualização e análise de produtividade."
    },
    {
      titulo: "7. Estratégia de Precificação",
      descricao: "Módulo avançado para definição de estratégia de venda com diagnóstico e análise de cenários.",
      funcionalidades: [
        "Diagnóstico Inicial: 9 perguntas sobre situação do imóvel e objetivos do proprietário",
        "3 Estratégias: Atração (venda rápida), Mercado (equilibrada) e Premium (maximização)",
        "Cálculos Automáticos: Preço de anúncio, comissão, líquido ao vendedor e prêmio",
        "Recomendação Inteligente: Sistema sugere estratégia ideal baseado nas respostas",
        "Plano de Ajuste: Opção de redução programada após período sem venda",
        "Seleção e Confirmação: Escolha a estratégia e confirme para gerar materiais",
        "Integração: Conectado ao motor de avaliação para valores precisos"
      ],
      beneficios: "Define posicionamento estratégico de preço com base técnica e de mercado."
    },
    {
      titulo: "8. Vistoria Digital",
      descricao: "Lista de verificação completa para inspeção técnica de imóveis com fotos e nota de conservação.",
      funcionalidades: [
        "Mais de 55 Itens para Casas: 20 categorias incluindo área externa, telhado, jardim, piscina",
        "Mais de 50 Itens para Apartamentos: 18 categorias para áreas comuns e privativas",
        "Sistema de Pontuação: OK / Atenção / Crítico / Não Verificado / Não se Aplica com peso automático",
        "Registro de Fotos: Documentação visual por item com envio direto",
        "Nota de Conservação: Pontuação de 0 a 100 com classificação por cores",
        "Salvamento Automático: Dados salvos automaticamente no banco de dados",
        "Integração: Fluxo direto para avaliação com dados pré-preenchidos",
        "Laudo em PDF: Relatório profissional com gráfico de diagnóstico e galeria de fotos"
      ],
      beneficios: "Padroniza vistorias, documenta estado do imóvel e reduz riscos em transações."
    },
    {
      titulo: "9. Histórico de Vistorias",
      descricao: "Consulta e gerenciamento de todas as vistorias realizadas.",
      funcionalidades: [
        "Lista Completa: Todas as vistorias com data, endereço, nota e situação",
        "Filtros: Por período, tipo de imóvel, faixa de nota e status",
        "Visualização: Detalhes completos de cada vistoria em janela",
        "Regeneração de PDF: Gere novos laudos quando necessário",
        "Integração: Acesse avaliação vinculada diretamente",
        "Exportação: Lista em Excel/CSV para análise externa"
      ],
      beneficios: "Mantém registro organizado de todas as inspeções realizadas."
    },
    {
      titulo: "10. Agendamento de Visitas",
      descricao: "Gestão completa de visitas com fichas digitais, assinaturas e avaliação do cliente.",
      funcionalidades: [
        "Painel de Visitas: Indicadores de volume, conversão e desempenho",
        "Agendamentos: Criação com data/hora, tipo de serviço e dados do cliente",
        "Fichas de Visita: Código único, dados completos e declaração de intermediação",
        "Gestão de Disponibilidade: Calendário do corretor com horários livres",
        "Assinaturas Digitais: Visitante e corretor assinam na tela ou via link remoto",
        "Link de Avaliação: Envio automático para avaliação pós-visita pelo cliente",
        "Gráfico de Evolução: Histórico mensal de visitas realizadas",
        "Ranking de Corretores: Comparativo por volume de visitas e conversão"
      ],
      beneficios: "Profissionaliza o processo de visitas, coleta avaliação valiosa e melhora conversão."
    },
    {
      titulo: "11. Documentação (Segurança Jurídica)",
      descricao: "Lista de verificação completa para garantir segurança jurídica em transações imobiliárias.",
      funcionalidades: [
        "Lista Dinâmica: Documentos separados para Vendedor e Comprador",
        "Perfil Condicional: Campos extras para Empresa, União Estável ou Comunhão de Bens",
        "Análise por IA: Envio de documentos com identificação automática de tipo",
        "Situação Visual: Acompanhamento do progresso de coleta por documento",
        "Alertas: Notificação de documentos pendentes ou com prazo de validade",
        "Exportação em PDF: Relatório separado por parte (Vendedor/Comprador/Completo)"
      ],
      beneficios: "Garante segurança jurídica e organização profissional nas transações."
    },
    {
      titulo: "12. Onboarding e Tutoriais",
      descricao: "Sistema de boas-vindas e treinamento interativo para novos usuários.",
      funcionalidades: [
        "Página de Boas-Vindas: Apresentação visual da plataforma",
        "Tutorial Guiado: Passo a passo interativo em cada página",
        "Navegação por Etapas: Conheca cada módulo no seu ritmo",
        "Reativação: Reinicie tutoriais a qualquer momento pelo menu"
      ],
      beneficios: "Acelera a curva de aprendizado e reduz dúvidas iniciais."
    },
    {
      titulo: "13. Configurações",
      descricao: "Personalização da plataforma e dados da empresa.",
      funcionalidades: [
        "Logomarca da Empresa: Envio para exibir nos cabeçalhos de todos os PDFs",
        "Dados da Empresa: Nome, CNPJ, CRECI, telefone, email e endereço",
        "Visualização em Tempo Real: Veja como ficará o rodapé dos relatórios",
        "Preferências: Ajustes de interface e notificações"
      ],
      beneficios: "Permite personalização para identidade visual própria da imobiliária."
    },
    {
      titulo: "14. Sofia - Assistente de Inteligência Artificial",
      descricao: "Assistente virtual inteligente disponível em todas as páginas da plataforma.",
      funcionalidades: [
        "Conversa em Tempo Real: Respostas instantâneas sobre mercado e plataforma",
        "Consultas por Voz: Interação sem usar as mãos com reconhecimento de fala",
        "Análise de Documentos: Envio e interpretação automática de certidões",
        "Base de Conhecimento: Informações especializadas do mercado da Barra da Tijuca",
        "Sugestões Inteligentes: Recomendações baseadas na página atual",
        "Leitura de Respostas: Respostas podem ser ouvidas em áudio"
      ],
      beneficios: "Acelera consultas e fornece informações especializadas em tempo real."
    },
    {
      titulo: "15. Recursos Administrativos",
      descricao: "Ferramentas de gestão exclusivas para administradores.",
      funcionalidades: [
        "Base de Conhecimento Sofia: Gerenciar conteúdo e treinamento da IA",
        "Calibrador de Avaliação: Ajustar pesos e fatores do sistema de avaliação",
        "Calibrador de Vistoria: Gerenciar categorias e itens do checklist de inspeção para casas e apartamentos",
        "Gestão de Contatos: Acompanhar possíveis clientes capturados com filtros e exportação",
        "Gerenciamento de Usuários: Controle de acessos, papéis e permissões",
        "Rastreamento de Atividades: Acompanhamento completo de uso por usuário",
        "Sincronização de Dados: Atualização manual de dados da Prefeitura",
        "Mapeamento de Condomínios: Cadastro de empreendimentos e microregiões",
        "Importação CSV: Carregamento de dados em lote"
      ],
      beneficios: "Permite personalização, controle total e gestão profissional da plataforma."
    },
    {
      titulo: "16. Avaliação Pública",
      descricao: "Página de captação de leads através de avaliação rápida.",
      funcionalidades: [
        "Acesso Sem Login: Visitantes podem usar sem criar conta",
        "Formulário Simplificado: Dados básicos do imóvel e contato",
        "Limite por Email: Controle de quantidade de avaliações por pessoa",
        "Assistente Sofia Público: Versão simplificada para visitantes",
        "Captura de Leads: Dados salvos automaticamente para acompanhamento"
      ],
      beneficios: "Gera leads qualificados através de ferramenta de valor para visitantes."
    }
  ],
  recursosAdicionais: [
    {
      titulo: "Tutoriais Guiados",
      descricao: "Treinamentos interativos em cada página, ativados automaticamente na primeira visita ou via botão 'Tutorial Guiado'. 16 tutoriais específicos cobrindo todas as funcionalidades."
    },
    {
      titulo: "Exportações Completas",
      descricao: "Suporte a PDF profissional, planilha Excel, arquivo CSV e cópia de segurança para todos os módulos. Material de Apoio inclui Manual Completo, Guia Rápido e Roteiro de Vídeo."
    },
    {
      titulo: "Funciona em Qualquer Dispositivo",
      descricao: "Interface totalmente adaptada para computador, tablet e celular com gestos de toque e navegação otimizada para cada dispositivo."
    },
    {
      titulo: "Aplicativo Web Instalável",
      descricao: "Instale a plataforma como aplicativo no celular para acesso rápido via ícone na tela inicial, sem necessidade de loja de aplicativos."
    },
    {
      titulo: "Mapa de Transações",
      descricao: "Visualização geográfica das transações com marcadores interativos, filtros por período e valor, e integração com pesquisas."
    },
    {
      titulo: "Avaliação Pública",
      descricao: "Página pública para captação de contatos via avaliação rápida. Visitantes inserem dados básicos e recebem estimativa inicial."
    }
  ],
  faq: [
    {
      categoria: "Geral",
      perguntas: [
        { p: "O que é o Godoy Prime Analytics?", r: "É a plataforma de inteligência imobiliária mais completa do Rio de Janeiro, oferecendo análise de dados oficiais da Prefeitura, avaliações automatizadas, vistorias digitais, gestão de visitas e assistência por inteligência artificial." },
        { p: "Quem pode usar a plataforma?", r: "Corretores de imóveis, avaliadores, gestores imobiliários e empresas do setor imobiliário que atuam no mercado de alto padrão do Rio de Janeiro." },
        { p: "A plataforma funciona em celulares e tablets?", r: "Sim, a interface funciona em computadores, tablets e celulares. Pode ser instalada como aplicativo para acesso rápido." },
        { p: "Preciso instalar algum programa?", r: "Não, a plataforma funciona diretamente no navegador de internet, sem necessidade de instalação. Opcionalmente, pode ser instalada como aplicativo." },
        { p: "Com que frequência a plataforma é atualizada?", r: "A plataforma recebe atualizações contínuas com melhorias de funcionalidades, novos recursos e correções." }
      ]
    },
    {
      categoria: "Painel e Indicadores",
      perguntas: [
        { p: "Com que frequência os dados são atualizados?", r: "Os dados são sincronizados mensalmente com as bases oficiais da Prefeitura do Rio de Janeiro." },
        { p: "O que significa a mediana de preço por m²?", r: "É o valor central quando todos os preços são ordenados, representando melhor o mercado por não ser afetado por valores muito altos ou muito baixos." },
        { p: "Como funciona o ranking de microregiões?", r: "As microregiões são ordenadas pela mediana de preço por m² ou quantidade de transações, permitindo identificar as regiões mais valorizadas ou com mais vendas." },
        { p: "Posso exportar os gráficos do painel?", r: "Sim, você pode exportar relatórios completos em PDF, dados em Excel/CSV e fazer cópia de segurança completa do banco de dados." },
        { p: "O que é o mapa de transações?", r: "É uma visualização geográfica das transações com marcadores interativos mostrando localização, valor e data de cada transação." }
      ]
    },
    {
      categoria: "Pesquisas de Mercado",
      perguntas: [
        { p: "Quais filtros estão disponíveis nas pesquisas?", r: "Localização (bairro, rua), faixa de valor (R$ 100 mil a R$ 100 milhões), período (6 a 24 meses), área em m² e tipo (Apartamento/Casa)." },
        { p: "Posso salvar minhas pesquisas favoritas?", r: "Sim, o histórico de pesquisas é salvo automaticamente para consulta posterior." },
        { p: "Qual o período máximo de dados disponíveis?", r: "Os dados cobrem transações desde 2020, representando mais de 5 anos de histórico oficial." },
        { p: "Como exportar os resultados das pesquisas?", r: "Use os botões de exportação para gerar arquivos CSV ou Excel com todos os dados filtrados, incluindo estatísticas." }
      ]
    },
    {
      categoria: "Avaliação Imobiliária",
      perguntas: [
        { p: "Quantas características são avaliadas?", r: "São 26 características divididas em 5 categorias: Posição/Vista, Conservação, Conforto, Segurança e Funcionalidade." },
        { p: "O que são os cenários pessimista, provável e otimista?", r: "São três estimativas de valor que consideram diferentes condições de mercado e negociação, oferecendo uma faixa de valores realista." },
        { p: "Como é calculado o nível de confiança?", r: "Baseado na quantidade de transações disponíveis para a rua e na consistência das características avaliadas." },
        { p: "Posso gerar um laudo em PDF?", r: "Sim, ao final da avaliação você pode gerar um laudo profissional completo com metodologia, gráficos e dados de mercado." },
        { p: "As avaliações ficam salvas?", r: "Sim, todas as avaliações são salvas no histórico e podem ser consultadas, editadas ou atualizadas posteriormente." },
        { p: "O que é a estratégia de precificação?", r: "É um módulo adicional que define a melhor estratégia de venda (Atração, Mercado ou Premium) baseado em diagnóstico do imóvel e objetivos do proprietário." }
      ]
    },
    {
      categoria: "Vistoria Digital",
      perguntas: [
        { p: "Qual a diferença entre vistoria de casa e apartamento?", r: "Casas têm lista de verificação com mais de 55 itens em 20 categorias incluindo área externa, telhado e jardim. Apartamentos têm mais de 50 itens em 18 categorias focadas em áreas comuns e privativas." },
        { p: "Como funciona o sistema de pontuação?", r: "Cada item é avaliado de 1 (Crítico) a 5 (Excelente) ou Não se Aplica. O sistema calcula automaticamente uma nota de conservação de 0 a 100." },
        { p: "Posso anexar fotos à vistoria?", r: "Sim, você pode registrar fotos para documentar cada item avaliado, com envio direto pelo celular ou computador." },
        { p: "O relatório de vistoria serve como laudo técnico oficial?", r: "O relatório serve como documentação detalhada do estado do imóvel, mas laudos técnicos oficiais requerem profissional habilitado (engenheiro/arquiteto)." },
        { p: "Posso continuar uma vistoria depois?", r: "Sim, todas as vistorias são salvas automaticamente e podem ser retomadas a qualquer momento." }
      ]
    },
    {
      categoria: "Agendamento de Visitas",
      perguntas: [
        { p: "Como funciona o agendamento de visitas?", r: "Você cria agendamentos com data/hora, dados do cliente e tipo de serviço. O sistema gera fichas de visita com código único." },
        { p: "O que é a assinatura digital?", r: "Cliente e corretor podem assinar a ficha de visita diretamente na tela ou via link remoto enviado por WhatsApp/email." },
        { p: "Como funciona a avaliação pós-visita?", r: "Após a visita, um link é enviado ao cliente para avaliar o imóvel, informar interesse e registrar observações." },
        { p: "Posso ver estatísticas de visitas?", r: "Sim, o painel mostra indicadores de volume, conversão, evolução mensal e ranking dos corretores." },
        { p: "Como gerencio minha disponibilidade?", r: "Na aba Disponibilidade, defina os dias e horários em que está disponível para agendamentos." }
      ]
    },
    {
      categoria: "Documentação",
      perguntas: [
        { p: "Quais documentos são verificados na lista?", r: "Documentos do imóvel (matrícula, IPTU, habite-se), do vendedor/comprador (RG, CPF, certidões) e da transação (contrato, procurações)." },
        { p: "Como funciona a análise de documentos por inteligência artificial?", r: "Você envia o documento e a inteligência artificial identifica automaticamente qual tipo de documento é e extrai informações relevantes." },
        { p: "Posso usar a lista para qualquer tipo de transação?", r: "Sim, a lista é adaptável para compra, venda, locação e outras operações imobiliárias." },
        { p: "Os documentos enviados ficam armazenados?", r: "Os documentos são processados temporariamente para análise e não ficam armazenados na plataforma por segurança." }
      ]
    },
    {
      categoria: "Sofia - Assistente de Inteligência Artificial",
      perguntas: [
        { p: "Que tipo de perguntas posso fazer à Sofia?", r: "Perguntas sobre preços de mercado, tendências, comparativos entre bairros, documentação necessária e dúvidas sobre a plataforma." },
        { p: "A Sofia pode analisar documentos?", r: "Sim, você pode enviar documentos para análise e a Sofia extrairá informações relevantes e identificará possíveis problemas." },
        { p: "As respostas da Sofia são confiáveis?", r: "A Sofia usa dados atualizados e base de conhecimento especializada, mas recomenda-se validar informações críticas com fontes oficiais." },
        { p: "Posso usar comandos de voz?", r: "Sim, a Sofia aceita consultas por voz para interação sem usar as mãos e pode responder com leitura de áudio." }
      ]
    },
    {
      categoria: "Recursos Administrativos",
      perguntas: [
        { p: "Como gerenciar contatos capturados?", r: "Acesse a seção de Contatos para visualizar, filtrar por origem/interesse/período e acompanhar o progresso de cada possível cliente." },
        { p: "Quem pode acessar o calibrador de avaliação?", r: "Apenas administradores têm acesso para ajustar pesos e fatores do sistema de avaliação." },
        { p: "O que é o Calibrador de Vistoria?", r: "É uma ferramenta administrativa para gerenciar os itens do checklist de inspeção. Permite adicionar, editar ou remover categorias e itens, além de ajustar os pesos de cada categoria separadamente para casas e apartamentos." },
        { p: "Como adicionar novos usuários?", r: "Administradores podem convidar novos usuários na seção Gerenciar Usuários, definindo papel (administrador/corretor/gerente)." },
        { p: "O que é rastreado no registro de atividades?", r: "Acessos, avaliações, vistorias, visitas, pesquisas, exportações e todas as ações relevantes na plataforma." },
        { p: "Como atualizar os dados da Prefeitura?", r: "Administradores podem usar o botão de sincronização no painel principal para buscar novos dados da Prefeitura." }
      ]
    },
    {
      categoria: "Estratégia de Precificação",
      perguntas: [
        { p: "O que é a estratégia de precificação?", r: "É um módulo que ajuda a definir o melhor preço de anúncio baseado em diagnóstico do imóvel, objetivos do vendedor e condições de mercado." },
        { p: "Quais são as estratégias disponíveis?", r: "Atração (venda rápida com preço competitivo), Mercado (equilíbrio entre velocidade e valor) e Premium (maximização do valor líquido)." },
        { p: "Como o sistema recomenda uma estratégia?", r: "Baseado em 9 perguntas diagnósticas sobre tempo de mercado, concorrência, urgência, situação financeira e perfil do imóvel." },
        { p: "O que é o plano de ajuste?", r: "É uma opção para programar reduções automáticas de preço após períodos sem propostas, mantendo competitividade." }
      ]
    },
    {
      categoria: "Suporte e Ajuda",
      perguntas: [
        { p: "Como entrar em contato com o suporte?", r: "Envie email para contato@godoyprime.com.br, use o chat da Sofia ou ligue para (21) 4040-0067." },
        { p: "Existe treinamento disponível?", r: "Sim, oferecemos treinamento interativo, 16 tutoriais guiados, manual em PDF, guia rápido, roteiro de vídeo e vídeos de treinamento." },
        { p: "Como reportar um problema ou erro?", r: "Entre em contato pelo email de suporte descrevendo o problema detalhadamente, incluindo imagens da tela se possível." },
        { p: "Há atualizações frequentes na plataforma?", r: "Sim, a plataforma recebe atualizações contínuas com melhorias e novas funcionalidades baseadas nas sugestões dos usuários." }
      ]
    },
    {
      categoria: "Dicas de Uso",
      perguntas: [
        { p: "Qual a melhor forma de começar a usar a plataforma?", r: "Complete o treinamento, explore o painel principal, faça uma avaliação teste e uma vistoria para conhecer todos os fluxos." },
        { p: "Como obter avaliações mais precisas?", r: "Preencha todas as 26 características com atenção, use dados de mercado atualizados e inclua informações de anúncios quando disponíveis." },
        { p: "Posso usar a plataforma sem internet?", r: "Não, é necessária conexão com internet para acessar dados em tempo real e funcionalidades da inteligência artificial." },
        { p: "Devo atualizar minhas avaliações periodicamente?", r: "Sim, recomendamos revisar avaliações a cada 3-6 meses ou quando houver mudanças significativas no mercado." },
        { p: "Como melhorar minha produtividade?", r: "Use atalhos, fluxos integrados (vistoria → avaliação → precificação), exporte em lote e configure sua disponibilidade." }
      ]
    }
  ]
};

export async function exportManualPDF() {
  const doc = new jsPDF();
  const marginLeft = 20;
  const marginRight = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 20;

  // Buscar configurações da empresa
  const companyInfo = await fetchCompanyInfoForPDF();

  // Cover page
  doc.setFillColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  doc.setTextColor(BRAND_COLORS.gold[0], BRAND_COLORS.gold[1], BRAND_COLORS.gold[2]);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('GODOY PRIME', pageWidth / 2, 100, { align: 'center' });
  doc.text('ANALYTICS', pageWidth / 2, 115, { align: 'center' });
  
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('Manual do Usuário', pageWidth / 2, 140, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(200, 200, 200);
  doc.text('Plataforma de Inteligência Imobiliária', pageWidth / 2, 160, { align: 'center' });
  doc.text('Rio de Janeiro - Mercado de Alto Padrão', pageWidth / 2, 170, { align: 'center' });
  
  const today = new Date().toLocaleDateString('pt-BR');
  doc.text(`Versão 2.0 - ${today}`, pageWidth / 2, 250, { align: 'center' });

  // Introduction page
  doc.addPage();
  y = drawGodoyHeader(doc, 'Manual do Usuário');
  
  y = drawSectionTitle(doc, manualContent.introducao.titulo, y, marginLeft);
  y += 5;
  
  doc.setFontSize(11);
  doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
  const introLines = doc.splitTextToSize(manualContent.introducao.texto, contentWidth);
  doc.text(introLines, marginLeft, y);
  y += introLines.length * 6 + 15;

  // Table of contents
  y = drawSectionTitle(doc, 'Índice', y, marginLeft);
  y += 5;
  
  doc.setFontSize(10);
  manualContent.modulos.forEach((modulo) => {
    doc.text(`${modulo.titulo}`, marginLeft + 5, y);
    y += 6;
  });
  y += 5;
  doc.text('15. Recursos Adicionais', marginLeft + 5, y);
  y += 6;
  doc.text('16. Perguntas Frequentes (FAQ)', marginLeft + 5, y);

  // Module pages
  manualContent.modulos.forEach((modulo) => {
    doc.addPage();
    y = drawGodoyHeader(doc, 'Manual do Usuário');
    
    // Module title
    y = drawSectionTitle(doc, modulo.titulo, y, marginLeft);
    y += 5;
    
    // Description
    doc.setFontSize(11);
    doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
    const descLines = doc.splitTextToSize(modulo.descricao, contentWidth);
    doc.text(descLines, marginLeft, y);
    y += descLines.length * 6 + 10;
    
    // Features
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
    doc.text('Funcionalidades:', marginLeft, y);
    y += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
    modulo.funcionalidades.forEach((func) => {
      doc.setFillColor(BRAND_COLORS.gold[0], BRAND_COLORS.gold[1], BRAND_COLORS.gold[2]);
      doc.circle(marginLeft + 3, y - 1.5, 1.5, 'F');
      const funcLines = doc.splitTextToSize(func, contentWidth - 10);
      doc.text(funcLines, marginLeft + 8, y);
      y += funcLines.length * 5 + 3;
    });
    
    y += 10;
    
    // Benefits
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(marginLeft, y, contentWidth, 25, 3, 3, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
    doc.text('Benefício:', marginLeft + 5, y + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
    const benefitLines = doc.splitTextToSize(modulo.beneficios, contentWidth - 15);
    doc.text(benefitLines, marginLeft + 5, y + 16);
  });

  // Additional resources page
  doc.addPage();
  y = drawGodoyHeader(doc, 'Manual do Usuário');
  
  y = drawSectionTitle(doc, '15. Recursos Adicionais', y, marginLeft);
  y += 10;
  
  manualContent.recursosAdicionais.forEach((recurso) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
    doc.text(recurso.titulo, marginLeft, y);
    y += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
    const descLines = doc.splitTextToSize(recurso.descricao, contentWidth);
    doc.text(descLines, marginLeft, y);
    y += descLines.length * 5 + 10;
  });

  // FAQ Section
  doc.addPage();
  y = drawGodoyHeader(doc, 'Manual do Usuário');
  
  y = drawSectionTitle(doc, '16. Perguntas Frequentes (FAQ)', y, marginLeft);
  y += 10;

  manualContent.faq.forEach((categoria) => {
    // Check if we need a new page
    if (y > pageHeight - 60) {
      doc.addPage();
      y = drawGodoyHeader(doc, 'Manual do Usuário');
      y += 10;
    }

    // Category title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(BRAND_COLORS.navy[0], BRAND_COLORS.navy[1], BRAND_COLORS.navy[2]);
    doc.text(categoria.categoria, marginLeft, y);
    y += 8;

    categoria.perguntas.forEach((faq) => {
      // Check if we need a new page
      if (y > pageHeight - 40) {
        doc.addPage();
        y = drawGodoyHeader(doc, 'Manual do Usuário');
        y += 10;
      }

      // Question
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
      const questionLines = doc.splitTextToSize(`P: ${faq.p}`, contentWidth - 5);
      doc.text(questionLines, marginLeft + 5, y);
      y += questionLines.length * 4 + 2;

      // Answer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const answerLines = doc.splitTextToSize(`R: ${faq.r}`, contentWidth - 5);
      doc.text(answerLines, marginLeft + 5, y);
      y += answerLines.length * 4 + 6;
    });

    y += 5;
  });

  // Support section
  doc.addPage();
  y = drawGodoyHeader(doc, 'Manual do Usuário', companyInfo);
  
  y = drawSectionTitle(doc, 'Suporte e Contato', y, marginLeft);
  y += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(BRAND_COLORS.darkGray[0], BRAND_COLORS.darkGray[1], BRAND_COLORS.darkGray[2]);
  doc.text('Para dúvidas ou sugestões, entre em contato:', marginLeft, y);
  y += 8;
  doc.text(`Telefone: ${companyInfo.phone}`, marginLeft + 5, y);
  y += 6;
  doc.text(`Site: ${companyInfo.website}`, marginLeft + 5, y);
  y += 6;
  if (companyInfo.address) {
    doc.text(`Endereço: ${companyInfo.address}`, marginLeft + 5, y);
    y += 6;
  }
  y += 6;
  doc.text(`${companyInfo.creci}`, marginLeft + 5, y);

  // Apply footers com dados da empresa
  applyFootersToAllPages(doc, companyInfo);

  // Save
  doc.save('Manual_Godoy_Prime_Analytics_v2.pdf');
}
