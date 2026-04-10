

## Plano: Reenviar WhatsApp com template `pos_visita` para Maria Eduarda

### Objetivo
Chamar a Edge Function `send-whatsapp` com o template `pos_visita` para que Maria Eduarda receba a ficha completa com todos os dados do imovel, links de assinatura, feedback e instrucoes para preencher dados faltantes.

### Acao
Invocar `send-whatsapp` via curl com o seguinte payload:

```json
{
  "telefone": "21982031800",
  "tipo": "pos_visita",
  "dados": {
    "nome_visitante": "Maria Eduarda Aramburu",
    "endereco_imovel": "Avenida Lucio Costa 3650",
    "data_hora": "2026-04-10T13:30:00+00:00",
    "codigo_imovel": "186063",
    "condominio_edificio": "Next",
    "unidade_imovel": "418",
    "nome_corretor": "Marcus Godoy",
    "nome_proprietario": "Edson",
    "valor_imovel": "1.395.000",
    "link_assinatura": "https://godoy-prime-analytics.lovable.app/visitas/assinatura/VIS-MNT4PN00/visitante",
    "link_feedback": "https://godoy-prime-analytics.lovable.app/visitas/feedback/VIS-MNT4PN00",
    "link_ficha": "https://godoy-prime-analytics.lovable.app/visitas/ficha/77c48892-4c89-44de-9f6f-02d267e1f4c4"
  }
}
```

### Resultado esperado
Maria Eduarda recebera no WhatsApp a ficha completa com:
- Dados do imovel (endereco, condominio Next, unidade 418, codigo 186063, valor R$ 1.395.000, proprietario Edson)
- Corretor Marcus Godoy
- Link de assinatura digital
- Link de pesquisa de satisfacao
- Link da ficha completa
- Mensagem pedindo para analisar os dados e preencher o que estiver faltando

### Alteracoes no codigo
Nenhuma. Apenas uma chamada direta a Edge Function ja existente com o template `pos_visita`.

