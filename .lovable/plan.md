
# Plano: Pagina de Apresentacao + Modo Demonstracao Completo

## Situacao Atual

O modo demo ja existe em `/demo` com dados fictitios para **Dashboard, KPIs, Evolucao e Microbairros**. Porem, varios modulos (Visitas, Vistoria Digital, Historico Avaliacoes, Historico Vistorias, Leads, Configuracoes) ainda fazem chamadas reais ao banco e dependem de autenticacao (`useAuth()`), o que causa erros ou telas vazias para visitantes nao autenticados.

## O Que Sera Feito

### 1. Pagina de Apresentacao (`/apresentacao`)

Uma landing page profissional para apresentar a plataforma a imobiliarias, com:

- **Hero Section**: Logo Godoy Prime + titulo "Plataforma de Inteligencia Imobiliaria" + subtitulo com proposta de valor + botao CTA "Explorar Demonstracao" que leva ao `/demo`
- **Secao de Funcionalidades**: Grid com 6-8 cards destacando os modulos principais (Dashboard Analitico, Avaliacao Imobiliaria, Vistoria Digital, Agendamento de Visitas, Microregioes, Leads) com icones e descricoes curtas
- **Secao de Diferenciais**: 3 colunas com beneficios-chave (Dados Oficiais de Transacoes, IA para Precificacao, Relatorios Profissionais em PDF)
- **Secao de Screenshots/Preview**: Imagens ou mockups dos dashboards em acao
- **CTA Final**: Botao "Agendar Apresentacao" (link para contato/WhatsApp) + "Explorar Demonstracao"
- **Footer**: Disclaimer legal padrao + CRECI

Visual: Navy (#0C2340) + Gold (#D4AF37), tipografia Montserrat, estetica premium alinhada com a marca.

### 2. Dados Ficticios para Modulos Faltantes

Expandir `src/data/demoData.ts` com dados mockados para:

- **Visitas/Agendamentos**: 8-10 fichas de visita ficticias com status variados (agendada, realizada, cancelada), corretores ficticios, enderecos na Barra da Tijuca
- **Feedbacks de Visita**: 5-6 feedbacks com notas, efeitos UAU, percepcao de valor
- **Historico de Avaliacoes**: 5 avaliacoes salvas com enderecos, valores, datas
- **Historico de Vistorias**: 4 vistorias com status variados
- **Leads**: 6 leads ficticios com origens e status diferentes
- **Stats de Visitas**: KPIs, ranking de corretores, evolucao mensal

### 3. Adaptar Hooks para Modo Demo

Adicionar verificacao `isDemo` nos hooks que ainda nao a possuem:

| Hook | Acao |
|---|---|
| `useVisitas` | Retornar fichas ficticias quando `isDemo` |
| `useAgendamentos` | Retornar agendamentos ficticios quando `isDemo` |
| `useVisitasStats` | Retornar stats/ranking/evolucao ficticios quando `isDemo` |
| `useFeedbackAnalytics` | Retornar analytics ficticios quando `isDemo` |
| `useCorretores` | Retornar lista de corretores ficticios quando `isDemo` |

### 4. Proteger Paginas contra Erros de Auth no Demo

Nas paginas que chamam `useAuth()` diretamente (Visitas, VistoriaDigital, HistoricoAvaliacoes, HistoricoVistorias):

- Adicionar import do `useDemo` e fornecer um usuario ficticio quando `isDemo` esta ativo
- Desabilitar acoes de escrita (criar, editar, excluir) mostrando toast "Funcionalidade desabilitada no modo demonstracao"

### 5. Rota no App.tsx

- Adicionar rota publica `/apresentacao` apontando para a nova pagina
- Atualizar `DemoBanner` para incluir botao "Voltar para Apresentacao"
- Adicionar link "Ver Apresentacao" na pagina de login (`Auth.tsx`)

---

## Arquivos Envolvidos

| Arquivo | Acao |
|---|---|
| `src/pages/Apresentacao.tsx` | **NOVO** - Landing page de apresentacao |
| `src/data/demoData.ts` | **EDITAR** - Adicionar dados ficticios para Visitas, Feedbacks, Avaliacoes, Vistorias, Leads |
| `src/hooks/useVisitas.ts` | **EDITAR** - Adicionar fallback demo |
| `src/hooks/useAgendamentos.ts` | **EDITAR** - Adicionar fallback demo |
| `src/hooks/useVisitasStats.ts` | **EDITAR** - Adicionar fallback demo |
| `src/hooks/useFeedbackAnalytics.ts` | **EDITAR** - Adicionar fallback demo |
| `src/pages/Visitas.tsx` | **EDITAR** - Proteger contra auth nulo no demo |
| `src/pages/HistoricoAvaliacoes.tsx` | **EDITAR** - Proteger contra auth nulo no demo |
| `src/pages/HistoricoVistorias.tsx` | **EDITAR** - Proteger contra auth nulo no demo |
| `src/components/DemoBanner.tsx` | **EDITAR** - Adicionar link para `/apresentacao` |
| `src/App.tsx` | **EDITAR** - Adicionar rota `/apresentacao` |
| `src/pages/Auth.tsx` | **EDITAR** - Adicionar link para apresentacao |

---

## Secao Tecnica

### Padrao dos Hooks Demo

Cada hook adaptado seguira o padrao ja estabelecido:

```text
const { isDemo } = useDemo();
// Na queryFn:
if (isDemo) return DEMO_DADOS_FICTICIOS;
// staleTime: isDemo ? Infinity : 0
```

### Protecao de Escrita no Demo

Acoes de mutacao (criar ficha, agendar visita, etc.) verificarao `isDemo` e exibirao toast informativo em vez de tentar gravar no banco:

```text
if (isDemo) {
  toast.info("Funcionalidade desabilitada no modo demonstracao");
  return;
}
```

### Estrutura da Landing Page

A pagina `/apresentacao` sera um componente React standalone (sem sidebar/header), com scroll suave entre secoes e design responsivo mobile-first, usando os componentes UI existentes (Card, Button, Badge).
