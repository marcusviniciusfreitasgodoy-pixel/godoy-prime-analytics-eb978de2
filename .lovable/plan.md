

## Plano: Enviar mensagens de teste por WhatsApp

Vou invocar a Edge Function `send-whatsapp` para cada tipo de mensagem suportado, enviando para o número **21964075124**. São 5 tipos de mensagem do ciclo de visitas.

### Mensagens a enviar

| # | Tipo | Descrição |
|---|------|-----------|
| 1 | `confirmacao` | Confirmação de agendamento |
| 2 | `lembrete` | Lembrete de visita |
| 3 | `cancelamento` | Cancelamento de visita |
| 4 | `reagendamento` | Reagendamento de visita |
| 5 | `pos_visita` | Ficha completa pós-visita |

### Dados de teste usados

Todas as mensagens usarão dados fictícios consistentes:
- **Visitante:** Marcus Godoy (teste)
- **Endereço:** Rua Barão da Torre, 200 - Ipanema
- **Data/hora:** 2026-04-15T14:00:00-03:00
- **Código imóvel:** IMV-TESTE-001
- **Links:** links reais da plataforma com código de teste

### Execução

Chamarei `supabase--curl_edge_functions` 5 vezes (uma para cada tipo) com o body adequado, autenticado com o token do usuário logado.

